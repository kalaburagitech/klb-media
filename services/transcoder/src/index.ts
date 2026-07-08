import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { notifyCallback, processMediaJob, type ProcessJobInput } from "./processors/index.js";

const processSchema = z.object({
  mediaId: z.string(),
  userId: z.string(),
  r2Key: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  mediaType: z.enum(["image", "video", "audio", "document", "other"]),
  callbackUrl: z.string().url().optional(),
});

const config = loadConfig();
const app = Fastify({ logger: true });
let activeJobs = 0;
const queue: Array<{ input: ProcessJobInput; resolve: () => void }> = [];

await app.register(cors, { origin: true });

function verifyAuth(authHeader?: string): boolean {
  if (!config.TRANSCODER_SECRET) return true;
  return authHeader === `Bearer ${config.TRANSCODER_SECRET}`;
}

async function runNextJob(): Promise<void> {
  if (activeJobs >= config.MAX_CONCURRENT_JOBS || queue.length === 0) return;

  const next = queue.shift();
  if (!next) return;

  activeJobs += 1;
  try {
    const result = await processMediaJob(config, next.input);
    await notifyCallback(next.input.callbackUrl, config.TRANSCODER_SECRET, result);
  } finally {
    activeJobs -= 1;
    next.resolve();
    void runNextJob();
  }
}

function enqueueJob(input: ProcessJobInput): Promise<void> {
  return new Promise((resolve) => {
    queue.push({ input, resolve });
    void runNextJob();
  });
}

app.get("/health", async () => ({
  status: "ok",
  service: "klb-media-transcoder",
  activeJobs,
  queuedJobs: queue.length,
  bucket: config.R2_BUCKET,
}));

app.post("/v1/process", async (request, reply) => {
  if (!verifyAuth(request.headers.authorization)) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const parsed = processSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }

  const input: ProcessJobInput = parsed.data;

  void enqueueJob(input);

  return reply.code(202).send({
    accepted: true,
    mediaId: input.mediaId,
    queuePosition: queue.length,
  });
});

app.post("/v1/process/sync", async (request, reply) => {
  if (!verifyAuth(request.headers.authorization)) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const parsed = processSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }

  const result = await processMediaJob(config, parsed.data);
  await notifyCallback(parsed.data.callbackUrl, config.TRANSCODER_SECRET, result);
  return reply.send(result);
});

await app.listen({ port: config.PORT, host: config.HOST });
console.log(`Transcoder listening on http://${config.HOST}:${config.PORT}`);
