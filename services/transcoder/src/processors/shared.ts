import { spawn } from "node:child_process";
import type { AppConfig } from "../config.js";

export type ProbeResult = {
  width?: number;
  height?: number;
  duration?: number;
  codec?: string;
  fps?: number;
  hasVideo: boolean;
  hasAudio: boolean;
};

export function runCommand(
  command: string,
  args: string[],
  config: AppConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${code}): ${stderr.slice(-2000)}`));
    });
  });
}

export async function probeMedia(inputPath: string, config: AppConfig): Promise<ProbeResult> {
  const args = [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    inputPath,
  ];

  const output = await new Promise<string>((resolve, reject) => {
    const proc = spawn(config.FFPROBE_PATH, args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (c) => (stdout += c.toString()));
    proc.stderr.on("data", (c) => (stderr += c.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`ffprobe failed: ${stderr}`));
    });
  });

  const parsed = JSON.parse(output) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
    }>;
    format?: { duration?: string };
  };

  const videoStream = parsed.streams?.find((s) => s.codec_type === "video");
  const audioStream = parsed.streams?.find((s) => s.codec_type === "audio");

  let fps: number | undefined;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    if (den) fps = num / den;
  }

  return {
    width: videoStream?.width,
    height: videoStream?.height,
    duration: parsed.format?.duration ? Number(parsed.format.duration) : undefined,
    codec: videoStream?.codec_name ?? audioStream?.codec_name,
    fps,
    hasVideo: Boolean(videoStream),
    hasAudio: Boolean(audioStream),
  };
}

export const VIDEO_PROFILES = [
  { label: "360p", height: 360, videoBitrate: "800k", audioBitrate: "96k" },
  { label: "480p", height: 480, videoBitrate: "1400k", audioBitrate: "128k" },
  { label: "720p", height: 720, videoBitrate: "2800k", audioBitrate: "128k" },
  { label: "1080p", height: 1080, videoBitrate: "5000k", audioBitrate: "192k" },
  { label: "4k", height: 2160, videoBitrate: "14000k", audioBitrate: "192k" },
] as const;

export const AUDIO_PROFILES = [
  { label: "mp3_128", format: "mp3", codec: "libmp3lame", bitrate: "128k", ext: "mp3", contentType: "audio/mpeg" },
  { label: "mp3_256", format: "mp3", codec: "libmp3lame", bitrate: "256k", ext: "mp3", contentType: "audio/mpeg" },
  { label: "aac_128", format: "aac", codec: "aac", bitrate: "128k", ext: "m4a", contentType: "audio/mp4" },
  { label: "ogg_128", format: "ogg", codec: "libvorbis", bitrate: "128k", ext: "ogg", contentType: "audio/ogg" },
] as const;

export const IMAGE_PROFILES = [
  { label: "thumb", maxWidth: 150, maxHeight: 150 },
  { label: "sm", maxWidth: 480 },
  { label: "md", maxWidth: 768 },
  { label: "lg", maxWidth: 1280 },
  { label: "xl", maxWidth: 1920 },
] as const;

export function selectVideoProfiles(sourceHeight: number) {
  return VIDEO_PROFILES.filter((p) => p.height <= sourceHeight);
}

export function buildVariantKey(userId: string, mediaId: string, label: string, ext: string) {
  return `variants/${userId}/${mediaId}/${label}.${ext}`;
}

export function buildHlsPrefix(userId: string, mediaId: string) {
  return `hls/${userId}/${mediaId}`;
}
