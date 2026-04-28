import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check-expired-sessions",
  { seconds: 45 },
  internal.sessions.checkExpired
);

crons.interval(
  "check-expired-reservations",
  { minutes: 1 },
  internal.services.checkExpiredReservations
);

export default crons;
