import { join } from "node:path";
import type { AppConfig } from "../config.js";
import { buildPublicUrl } from "../config.js";
import { uploadToR2 } from "../r2.js";
import {
  AUDIO_PROFILES,
  buildVariantKey,
  runCommand,
  type ProbeResult,
} from "./shared.js";

export type AudioVariant = {
  label: string;
  r2Key: string;
  contentType: string;
  format: string;
  bitrate?: number;
  size?: number;
  url: string;
};

export async function processAudio(
  config: AppConfig,
  inputPath: string,
  userId: string,
  mediaId: string,
  originalKey: string,
  contentType: string,
  probe: ProbeResult
): Promise<{ variants: AudioVariant[]; metadata: ProbeResult }> {
  const variants: AudioVariant[] = [];

  variants.push({
    label: "original",
    r2Key: originalKey,
    contentType,
    format: originalKey.split(".").pop() ?? "audio",
    url: buildPublicUrl(config, originalKey),
  });

  for (const profile of AUDIO_PROFILES) {
    const outputPath = join(inputPath, "..", `${profile.label}.${profile.ext}`);

    await runCommand(
      config.FFMPEG_PATH,
      [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-acodec",
        profile.codec,
        "-b:a",
        profile.bitrate,
        "-ar",
        "44100",
        outputPath,
      ],
      config
    );

    const r2Key = buildVariantKey(userId, mediaId, profile.label, profile.ext);
    const size = await uploadToR2(config, r2Key, outputPath, profile.contentType);

    variants.push({
      label: profile.label,
      r2Key,
      contentType: profile.contentType,
      format: profile.ext,
      bitrate: Number.parseInt(profile.bitrate, 10),
      size,
      url: buildPublicUrl(config, r2Key),
    });
  }

  return { variants, metadata: probe };
}
