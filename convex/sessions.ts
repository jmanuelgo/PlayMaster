import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

export const getExpired = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "expired"))
      .collect();
  },
});

export const getHistory = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const all = await ctx.db
      .query("sessions")
      .withIndex("by_start_time")
      .order("desc")
      .collect();

    return all.filter((s) => {
      if (s.status === "active") return false;
      if (startDate !== undefined && s.startTime < startDate) return false;
      if (endDate !== undefined && s.startTime > endDate) return false;
      return true;
    });
  },
});

export const start = mutation({
  args: {
    serviceId: v.id("services"),
    totalMinutes: v.number(),
    totalPaid: v.number(),
    clientName: v.optional(v.string()),
    paymentMethod: v.optional(v.union(v.literal("QR"), v.literal("Efectivo"))),
    clientNow: v.optional(v.number()),
  },
  handler: async (ctx, { serviceId, totalMinutes, totalPaid, clientName, paymentMethod, clientNow }) => {
    const service = await ctx.db.get(serviceId);
    if (!service) throw new Error("Servicio no encontrado.");
    if (service.status !== "available") throw new Error("El servicio no está disponible.");
    if (service.rate <= 0) throw new Error("El servicio no tiene tarifa configurada.");

    const now = clientNow ?? Date.now();
    const endTime = now + totalMinutes * 60 * 1000;

    const sessionId = await ctx.db.insert("sessions", {
      serviceId,
      startTime: now,
      endTime,
      totalMinutes,
      totalPaid,
      paymentMethod,
      addedMinutes: 0,
      status: "active",
      clientName,
    });

    await ctx.db.patch(serviceId, { status: "occupied" });
    return sessionId;
  },
});

export const extend = mutation({
  args: {
    sessionId: v.id("sessions"),
    additionalMinutes: v.number(),
    additionalPaid: v.number(),
    paymentMethod: v.optional(v.union(v.literal("QR"), v.literal("Efectivo"))),
  },
  handler: async (ctx, { sessionId, additionalMinutes, additionalPaid, paymentMethod }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Sesión no encontrada.");

    const newEndTime = session.endTime + additionalMinutes * 60 * 1000;

    await ctx.db.patch(sessionId, {
      endTime: newEndTime,
      totalPaid: session.totalPaid + additionalPaid,
      totalMinutes: session.totalMinutes + additionalMinutes,
      addedMinutes: session.addedMinutes + additionalMinutes,
      status: "active",
      ...(paymentMethod !== undefined ? { paymentMethod } : {}),
    });
  },
});

export const complete = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Sesión no encontrada.");

    await ctx.db.patch(sessionId, { status: "completed" });
    await ctx.db.patch(session.serviceId, { status: "available" });

    const service = await ctx.db.get(session.serviceId);
    const serviceType = service?.type ?? "Otro";

    const today = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("daily_reports")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) {
      const byType = existing.byType ?? [];
      const typeEntry = byType.find((e) => e.type === serviceType);
      if (typeEntry) {
        typeEntry.earnings += session.totalPaid;
        typeEntry.count += 1;
      } else {
        byType.push({ type: serviceType, earnings: session.totalPaid, count: 1 });
      }
      
      const newTotalQR = (existing.totalQR ?? 0) + (session.paymentMethod === "QR" ? session.totalPaid : 0);
      const newTotalEfectivo = (existing.totalEfectivo ?? 0) + (session.paymentMethod === "Efectivo" ? session.totalPaid : 0);

      await ctx.db.patch(existing._id, {
        totalEarnings: existing.totalEarnings + session.totalPaid,
        sessionsCount: existing.sessionsCount + 1,
        totalQR: newTotalQR,
        totalEfectivo: newTotalEfectivo,
        byType,
      });
    } else {
      await ctx.db.insert("daily_reports", {
        date: today,
        totalEarnings: session.totalPaid,
        sessionsCount: 1,
        totalQR: session.paymentMethod === "QR" ? session.totalPaid : 0,
        totalEfectivo: session.paymentMethod === "Efectivo" ? session.totalPaid : 0,
        byType: [{ type: serviceType, earnings: session.totalPaid, count: 1 }],
      });
    }
  },
});

export const deleteSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    pin: v.string(),
  },
  handler: async (ctx, { sessionId, pin }) => {
    // 1. Validate PIN
    const pinSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();
    if (!pinSetting) throw new Error("No hay PIN configurado. Establece uno en Configuración.");
    if (pinSetting.value !== pin) throw new Error("PIN incorrecto.");

    // 2. Get session
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Sesión no encontrada.");
    if (session.status === "active") throw new Error("No se puede eliminar una sesión activa.");

    // 3. Get service type for daily_reports byType update
    const service = await ctx.db.get(session.serviceId);
    const serviceType = service?.type ?? "Otro";

    // 4. Update daily_reports: subtract session earnings
    const sessionDate = new Date(session.startTime).toISOString().split("T")[0];
    const report = await ctx.db
      .query("daily_reports")
      .withIndex("by_date", (q) => q.eq("date", sessionDate))
      .first();

    if (report) {
      const byType = report.byType ?? [];
      const typeEntry = byType.find((e) => e.type === serviceType);
      if (typeEntry) {
        typeEntry.earnings = Math.max(0, typeEntry.earnings - session.totalPaid);
        typeEntry.count    = Math.max(0, typeEntry.count - 1);
      }
      await ctx.db.patch(report._id, {
        totalEarnings:  Math.max(0, report.totalEarnings - session.totalPaid),
        sessionsCount:  Math.max(0, report.sessionsCount - 1),
        totalQR:        Math.max(0, (report.totalQR ?? 0) - (session.paymentMethod === "QR" ? session.totalPaid : 0)),
        totalEfectivo:  Math.max(0, (report.totalEfectivo ?? 0) - (session.paymentMethod === "Efectivo" ? session.totalPaid : 0)),
        byType,
      });
    }

    // 5. Delete the session record
    await ctx.db.delete(sessionId);
  },
});

export const checkExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const active = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const session of active) {
      if (session.endTime < now) {
        await ctx.db.patch(session._id, { status: "expired" });
      }
    }
  },
});
