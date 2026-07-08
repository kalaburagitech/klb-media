import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "retry-failed-processing-jobs",
  { minutes: 5 },
  internal.processing.retryFailedJobs
);

export default crons;
