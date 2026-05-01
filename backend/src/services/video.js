import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getFromS3, uploadToS3 } from './s3.js';

export const processVideoHLS = async (mediaId, storageKey, log) => {
  const tempDir = path.join(process.cwd(), 'temp', 'hls', mediaId);
  await fs.mkdir(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, 'input.mp4');
  const outputPath = path.join(tempDir, 'playlist.m3u8');

  try {
    log.info(`Starting HLS processing for ${mediaId}`);
    
    // Download from S3
    const stream = await getFromS3(storageKey);
    const writeStream = (await import('node:fs')).createWriteStream(inputPath);
    
    await new Promise((resolve, reject) => {
      stream.pipe(writeStream).on('finish', resolve).on('error', reject);
    });

    // Run FFmpeg
    // We'll generate a basic HLS for now (720p)
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => {
          log.error('FFmpeg error:', err.message);
          reject(err);
        })
        .run();
    });

    // Upload segments and playlist back to S3
    const files = await fs.readdir(tempDir);
    for (const file of files) {
      if (file === 'input.mp4') continue;
      
      const filePath = path.join(tempDir, file);
      const content = await fs.readFile(filePath);
      const contentType = file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T';
      
      await uploadToS3(content, `hls/${mediaId}/${file}`, contentType);
    }

    log.info(`HLS processing complete for ${mediaId}`);
  } catch (err) {
    log.error(`HLS processing failed for ${mediaId}:`, err.message);
  } finally {
    // Cleanup temp files
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
