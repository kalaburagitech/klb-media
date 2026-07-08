import { z } from "zod";

export const configSchema = z.object({
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default("0.0.0.0"),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET: z.string().default("klbmedia"),
  R2_ENDPOINT: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),
  TRANSCODER_SECRET: z.string().optional(),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  TEMP_DIR: z.string().default("/tmp/klb-transcoder"),
  MAX_CONCURRENT_JOBS: z.coerce.number().default(2),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export function getR2Endpoint(config: AppConfig): string {
  return config.R2_ENDPOINT ?? `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export function getPublicBaseUrl(config: AppConfig): string {
  return (
    config.R2_PUBLIC_BASE_URL ??
    `https://${config.R2_BUCKET}.${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  ).replace(/\/$/, "");
}

export function buildPublicUrl(config: AppConfig, key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${getPublicBaseUrl(config)}/${encoded}`;
}
