import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    return services.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("PS5"), v.literal("PS4"), v.literal("Futbolín"), v.literal("Otro")),
    rate: v.number(),
    halfHourRate: v.optional(v.number()),
    unitMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const count = (await ctx.db.query("services").collect()).length;
    return await ctx.db.insert("services", {
      ...args,
      status: "available",
      order: count,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("PS5"), v.literal("PS4"), v.literal("Futbolín"), v.literal("Otro"))),
    rate: v.optional(v.number()),
    halfHourRate: v.optional(v.number()),
    unitMinutes: v.optional(v.number()),
    status: v.optional(v.union(v.literal("available"), v.literal("occupied"), v.literal("maintenance"), v.literal("reserved"))),
    reservationName: v.optional(v.string()),
    reservationTime: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    // If we're updating and setting to undefined, convex patch treats undefined as "do not change". 
    // To unset, we use null with with nullability in schema, but since it's optional, let's keep as is or set explicitly.
    // Actually we can just pass patch.
    await ctx.db.patch(id, patch);
  },
});

export const reserve = mutation({
  args: {
    id: v.id("services"),
    clientName: v.string(),
  },
  handler: async (ctx, { id, clientName }) => {
    const service = await ctx.db.get(id);
    if (!service) throw new Error("Servicio no encontrado.");
    if (service.status !== "occupied") {
      throw new Error("Solo se puede reservar una consola que esté ocupada.");
    }
    await ctx.db.patch(id, { reservationName: clientName });
  },
});

export const cancelReservation = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, { id }) => {
    const service = await ctx.db.get(id);
    if (!service) throw new Error("Servicio no encontrado.");
    
    // If it was already reserved (waiting for client), make it available
    if (service.status === "reserved") {
      await ctx.db.patch(id, { 
        status: "available",
        reservationName: undefined,
        reservationTime: undefined,
      });
    } else {
      // Just clear the reservation details from the occupied console
      await ctx.db.patch(id, { 
        reservationName: undefined,
        reservationTime: undefined,
      });
    }
  },
});

export const checkExpiredReservations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const services = await ctx.db.query("services").collect();
    for (const service of services) {
      if (
        service.status === "reserved" && 
        service.reservationTime !== undefined && 
        now - service.reservationTime > 5 * 60 * 1000 // 5 minutes
      ) {
        await ctx.db.patch(service._id, {
          status: "available",
          reservationName: undefined,
          reservationTime: undefined,
        });
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, { id }) => {
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_service", (q) => q.eq("serviceId", id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    if (activeSessions.length > 0) {
      throw new Error("No se puede eliminar un servicio con sesiones activas.");
    }
    await ctx.db.delete(id);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("services").collect();
    if (existing.length > 0) return;

    const defaults = [
      { name: "PlayStation 5 — Consola 1", type: "PS5" as const, rate: 15, halfHourRate: 8, unitMinutes: 60, order: 0 },
      { name: "PlayStation 5 — Consola 2", type: "PS5" as const, rate: 15, halfHourRate: 8, unitMinutes: 60, order: 1 },
      { name: "PlayStation 4 — Consola 1", type: "PS4" as const, rate: 12, halfHourRate: 6, unitMinutes: 60, order: 2 },
      { name: "PlayStation 4 — Consola 2", type: "PS4" as const, rate: 12, halfHourRate: 6, unitMinutes: 60, order: 3 },
      { name: "Futbolín — Mesa 1", type: "Futbolín" as const, rate: 2, unitMinutes: 10, order: 4 },
    ];

    for (const d of defaults) {
      await ctx.db.insert("services", { ...d, status: "available" });
    }
  },
});
