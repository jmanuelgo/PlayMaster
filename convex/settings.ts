import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("settings").collect();
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("settings", { key, value });
    }
  },
});

export const hasPin = query({
  args: {},
  handler: async (ctx) => {
    const pin = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();
    return !!pin;
  },
});

export const changePin = mutation({
  args: {
    currentPin: v.optional(v.string()),
    newPin: v.string(),
  },
  handler: async (ctx, { currentPin, newPin }) => {
    if (newPin.length < 4) throw new Error("El PIN debe tener al menos 4 dígitos.");

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();

    if (existing) {
      if (!currentPin || currentPin !== existing.value) {
        throw new Error("PIN actual incorrecto.");
      }
      await ctx.db.patch(existing._id, { value: newPin });
    } else {
      await ctx.db.insert("settings", { key: "admin_pin", value: newPin });
    }
  },
});
