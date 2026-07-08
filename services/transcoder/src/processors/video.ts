import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "../config.js";
import { buildPublicUrl } from "../config.js";
import { uploadTextToR2, uploadToR2 } from "../r2.js";
import {
  buildHlsPrefix,
  buildVariantKey,
  runCommand,
  selectVideoProfiles,
  type ProbeResult,
} from "./shared.js";

export type VideoVariant = {
  label: string;
  r2Key: string;
  contentType: string;
  format: string;
  width?: number;
  height?: number;
  bitrate?: number;
  size?: number;
  url: string;
};

export type HlsOutput = {
  masterKey: string;
  segmentPrefix: string;
  masterUrl: string;
};

export async function processVideo(
  config: AppConfig,
  inputPath: string,
  userId: string,
  mediaId: string,
  originalKey: string,
  contentType: string,
  probe: ProbeResult
): Promise<{
  variants: VideoVariant[];
  hls?: HlsOutput;
  metadata: ProbeResult;
}> {
  const variants: VideoVariant[] = [];
  const sourceHeight = probe.height ?? 720;
  const profiles = selectVideoProfiles(sourceHeight);

  variants.push({
    label: "original",
    r2Key: originalKey,
    contentType,
    format: originalKey.split(".").pop() ?? "mp4",
    width: probe.width,
    height: probe.height,
    url: buildPublicUrl(config, originalKey),
  });

  const hlsPrefix = buildHlsPrefix(userId, mediaId);
  const hlsLocalDir = join(inputPath, "..", "hls");
  const masterLocalPath = join(hlsLocalDir, "master.m3u8");
  const hlsPlaylists: string[] = [];

  for (const profile of profiles) {
    const mp4Path = join(inputPath, "..", `${profile.label}.mp4`);
    const scaleFilter = `scale=-2:${profile.height}`;

    await runCommand(
      config.FFMPEG_PATH,
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        scaleFilter,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-profile:v",
        "high",
        "-b:v",
        profile.videoBitrate,
        "-c:a",
        "aac",
        "-b:a",
        profile.audioBitrate,
        "-movflags",
        "+faststart",
        mp4Path,
      ],
      config
    );

    const mp4Key = buildVariantKey(userId, mediaId, profile.label, "mp4");
    const mp4Size = await uploadToR2(config, mp4Key, mp4Path, "video/mp4");

    variants.push({
      label: profile.label,
      r2Key: mp4Key,
      contentType: "video/mp4",
      format: "mp4",
      height: profile.height,
      bitrate: Number.parseInt(profile.videoBitrate, 10),
      size: mp4Size,
      url: buildPublicUrl(config, mp4Key),
    });

    const hlsProfileDir = join(hlsLocalDir, profile.label);
    const hlsPlaylistLocal = join(hlsProfileDir, "index.m3u8");

    await runCommand(
      config.FFMPEG_PATH,
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        scaleFilter,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-b:v",
        profile.videoBitrate,
        "-c:a",
        "aac",
        "-b:a",
        profile.audioBitrate,
        "-hls_time",
        "4",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        join(hlsProfileDir, "segment_%03d.ts"),
        hlsPlaylistLocal,
      ],
      config
    );

    const playlistKey = `${hlsPrefix}/${profile.label}/index.m3u8`;
    const playlistContent = await readFile(hlsPlaylistLocal, "utf-8");
    const rewrittenPlaylist = rewriteHlsPlaylist(playlistContent, `${profile.label}/`);
    await uploadTextToR2(config, playlistKey, rewrittenPlaylist, "application/vnd.apple.mpegurl");

    const segmentFiles = (await readdir(hlsProfileDir)).filter((f) => f.endsWith(".ts"));
    for (const segment of segmentFiles) {
      const segmentKey = `${hlsPrefix}/${profile.label}/${segment}`;
      await uploadToR2(
        config,
        segmentKey,
        join(hlsProfileDir, segment),
        "video/mp2t"
      );
    }

    hlsPlaylists.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${Number.parseInt(profile.videoBitrate, 10) * 1000},RESOLUTION=${Math.round((profile.height * 16) / 9)}x${profile.height}\n${profile.label}/index.m3u8`
    );
  }

  let hls: HlsOutput | undefined;
  if (hlsPlaylists.length > 0) {
    const masterContent = `#EXTM3U\n#EXT-X-VERSION:3\n${hlsPlaylists.join("\n")}\n`;
    const masterKey = `${hlsPrefix}/master.m3u8`;
    await uploadTextToR2(config, masterKey, masterContent, "application/vnd.apple.mpegurl");

    hls = {
      masterKey,
      segmentPrefix: `${hlsPrefix}/`,
      masterUrl: buildPublicUrl(config, masterKey),
    };
  }

  return { variants, hls, metadata: probe };
}

function rewriteHlsPlaylist(content: string, prefix: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (line.endsWith(".ts") && !line.startsWith("#")) {
        return `${prefix}${line}`;
      }
      return line;
    })
    .join("\n");
}
