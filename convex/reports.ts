import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDailyReports = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const all = await ctx.db.query("daily_reports").collect();
    return all
      .filter((r) => r.date >= startDate && r.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const getTodayStats = query({
  args: {
    date: v.optional(v.string()),
  },
  handler: async (ctx, { date }) => {
    const today = date ?? new Date().toISOString().split("T")[0];
    const report = await ctx.db
      .query("daily_reports")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();
    return report ?? { date: today, totalEarnings: 0, sessionsCount: 0, byType: [] };
  },
});
