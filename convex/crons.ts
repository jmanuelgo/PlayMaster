import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check-expired-sessions",
  { seconds: 45 },
  internal.sessions.checkExpired
);

export default crons;
