/**
 * Storage-saving defaults for the 10 GB R2 free tier.
 *
 * TRANSCODING_ENABLED=false (default): all uploads stored as originals only.
 * TRANSCODING_ENABLED=true: only video files are sent to FFmpeg; images/audio/PDF stay original.
 */
export function isTranscodingEnabled(): boolean {
  const value = process.env.TRANSCODING_ENABLED?.toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export function shouldTranscodeMediaType(
  mediaType: "image" | "video" | "audio" | "document" | "other"
): boolean {
  if (!isTranscodingEnabled()) return false;
  return mediaType === "video";
}
