import { deleteFromS3, getFromS3, uploadToS3 } from '../services/s3.js';
import sharp from 'sharp';

export const getMediaList = async (request, reply) => {
  const { page, limit } = request.query;
  const offset = (page - 1) * limit;

  const { rows } = await request.server.db.query(
    'SELECT id, user_id, file_name, size, content_type, created_at FROM media_files WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [request.user.id, limit, offset]
  );

  const { rows: countRows } = await request.server.db.query(
    'SELECT COUNT(*) FROM media_files WHERE user_id = $1',
    [request.user.id]
  );

  return {
    data: rows,
    pagination: {
      total: parseInt(countRows[0].count),
      page,
      limit,
    },
  };
};

export const getMediaById = async (request, reply) => {
  const { id } = request.params;
  const { width, quality, format } = request.query;
  
  const mediaKey = `media:${id}`;
  let media;

  try {
    // Try cache first
    if (request.server.redis) {
      const cached = await request.server.redis.get(mediaKey);
      if (cached) {
        media = JSON.parse(cached);
        request.log.info(`Metadata cache hit for ${id}`);
      }
    }

    if (!media) {
      // Find record in DB
      const { rows } = await request.server.db.query(
        'SELECT * FROM media_files WHERE id = $1',
        [id]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Media not found' });
      }

      media = rows[0];

      // Save to cache
      if (request.server.redis) {
        await request.server.redis.set(mediaKey, JSON.stringify(media), 'EX', 3600); // 1 hour
      }
    }

    const isImage = media.content_type.startsWith('image/');
    
    // Transformation key for caching
    const transformKey = isImage && (width || quality || format) 
      ? `transforms/${id}_w${width || 'orig'}_q${quality || '80'}.${format || 'webp'}`
      : null;

    let content;
    let contentType = media.content_type;

    if (transformKey) {
      try {
        // Try to fetch from cache first
        content = await getFromS3(transformKey);
        contentType = `image/${format || 'webp'}`;
        request.log.info(`Serving cached transform: ${transformKey}`);
      } catch (err) {
        // Not in cache, process now
        request.log.info(`Generating transform: ${transformKey}`);
        const originalStream = await getFromS3(media.storage_key);
        
        // Convert stream to buffer for sharp
        const chunks = [];
        for await (const chunk of originalStream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        let transformer = sharp(buffer);
        
        if (width) {
          transformer = transformer.resize(parseInt(width));
        }

        if (format === 'webp' || !format) {
          transformer = transformer.webp({ quality: parseInt(quality) || 80 });
          contentType = 'image/webp';
        } else if (format === 'jpeg' || format === 'jpg') {
          transformer = transformer.jpeg({ quality: parseInt(quality) || 80 });
          contentType = 'image/jpeg';
        } else if (format === 'png') {
          transformer = transformer.png();
          contentType = 'image/png';
        }

        content = await transformer.toBuffer();
        
        // Save to cache (fire and forget or await?)
        uploadToS3(content, transformKey.replace('uploads/', ''), contentType).catch(e => 
          request.log.error('Failed to cache transform:', e)
        );
      }
    } else {
      content = await getFromS3(media.storage_key);
    }
    
    reply.header('Content-Type', contentType);
    reply.header('Content-Disposition', `inline; filename="${media.file_name}"`);
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    reply.header('Accept-Ranges', 'bytes');
    
    return reply.send(content);
  } catch (err) {
    request.log.error('Error fetching/processing media:', err);
    return reply.status(500).send({ error: 'Failed to retrieve media content' });
  }
};

export const deleteMedia = async (request, reply) => {
  const { id } = request.params;
  
  const { rows } = await request.server.db.query(
    'SELECT * FROM media_files WHERE id = $1 AND user_id = $2',
    [id, request.user.id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Media not found' });
  }

  const media = rows[0];

  try {
    await deleteFromS3(media.storage_key);
    await request.server.db.query('DELETE FROM media_files WHERE id = $1', [id]);
    return { message: 'Media deleted successfully' };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to delete media' });
  }
};

export const downloadMedia = async (request, reply) => {
  const { id } = request.params;
  
  const { rows } = await request.server.db.query(
    'SELECT * FROM media_files WHERE id = $1',
    [id]
  );

  if (rows.length === 0) {
    return reply.status(404).send({ error: 'Media not found' });
  }

  const media = rows[0];

  try {
    const stream = await getFromS3(media.storage_key);
    
    reply.header('Content-Type', media.content_type);
    reply.header('Content-Disposition', `attachment; filename="${media.file_name}"`);
    
    return reply.send(stream);
  } catch (err) {
    request.log.error('Download error:', err.message);
    return reply.status(500).send({ error: 'Failed to download media' });
  }
};

export const getVideoStream = async (request, reply) => {
  const { id } = request.params;
  const fileName = request.params['*'] || 'playlist.m3u8';
  
  const key = `hls/${id}/${fileName}`;
  
  try {
    const stream = await getFromS3(key);
    
    const contentType = fileName.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T';
    reply.header('Content-Type', contentType);
    
    return reply.send(stream);
  } catch (err) {
    request.log.error('HLS Stream error:', err.message);
    return reply.status(404).send({ error: 'Stream not found or still processing' });
  }
};
