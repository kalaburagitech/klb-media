import { uploadToS3 } from '../services/s3.js';
import { randomUUID } from 'node:crypto';
import { processVideoHLS } from '../services/video.js';
import { isAllowedType, getMaxSize } from '../utils/validation.js';

export const uploadFile = async (request, reply) => {
  const data = await request.file();
  if (!data) {
    return reply.status(400).send({ error: 'No file uploaded' });
  }

  // Validate file type
  const filename = data.filename;
  const mimetype = data.mimetype;
  
  if (!isAllowedType(mimetype)) {
    request.log.warn(`Rejected invalid file type: ${mimetype} for ${filename}`);
    return reply.status(400).send({ 
      error: 'Invalid file type', 
      message: 'Only jpg, png, mp4, and pdf files are allowed' 
    });
  }

  const isVideo = mimetype.startsWith('video/');
  const sizeLimit = getMaxSize(mimetype);

  request.log.info(`Processing upload: ${filename} (${mimetype})`);

  try {
    const buffer = await data.toBuffer();
    
    if (buffer.length > sizeLimit) {
      return reply.status(413).send({ 
        error: 'File too large', 
        message: `Maximum size allowed is ${isVideo ? '200MB' : '50MB'}` 
      });
    }

    const id = randomUUID();
    const { key } = await uploadToS3(buffer, id, mimetype);

    await request.server.db.query(
      'INSERT INTO media_files (id, user_id, file_name, storage_key, size, content_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, request.user.id, filename, key, buffer.length, mimetype]
    );

    // Trigger background processing if it's a video
    if (isVideo) {
      processVideoHLS(id, key, request.log).catch(err => {
        request.log.error('Failed to initiate HLS processing:', err);
      });
    }

    return { id };
  } catch (err) {
    request.log.error('Upload error details:', err);
    return reply.status(500).send({ 
      error: 'Upload failed', 
      message: err.message,
      code: err.code || err.$metadata?.httpStatusCode 
    });
  }
};
