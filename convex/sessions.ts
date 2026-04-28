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
    totalMinutes: v.optional(v.number()),
    totalPaid: v.optional(v.number()),
    clientName: v.optional(v.string()),
    paymentMethod: v.optional(v.union(v.literal("QR"), v.literal("Efectivo"))),
    clientNow: v.optional(v.number()),
    isUnlimited: v.optional(v.boolean()),
  },
  handler: async (ctx, { serviceId, totalMinutes, totalPaid, clientName, paymentMethod, clientNow, isUnlimited }) => {
    const service = await ctx.db.get(serviceId);
    if (!service) throw new Error("Servicio no encontrado.");
    if (service.status !== "available" && service.status !== "reserved") {
      throw new Error("El servicio no está disponible.");
    }
    if (service.rate <= 0) throw new Error("El servicio no tiene tarifa configurada.");

    const now = clientNow ?? Date.now();
    let endTime = undefined;
    if (!isUnlimited) {
      if (totalMinutes === undefined || totalPaid === undefined) {
        throw new Error("Se requiere tiempo y monto para una sesión con límite.");
      }
      endTime = now + totalMinutes * 60 * 1000;
    }

    const sessionId = await ctx.db.insert("sessions", {
      serviceId,
      startTime: now,
      endTime,
      totalMinutes: totalMinutes ?? 0,
      totalPaid: totalPaid ?? 0,
      isUnlimited,
      paymentMethod,
      addedMinutes: 0,
      status: "active",
      clientName: clientName ?? service.reservationName, // default to reserved name if not provided
    });

    // We can use replace to remove reservation fields to be safe
    const { _id, _creationTime, reservationName, reservationTime, ...serviceData } = service;
    await ctx.db.replace(serviceId, {
      ...serviceData,
      status: "occupied",
    });

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
    if (session.isUnlimited) throw new Error("No se puede extender una sesión de tiempo ilimitado.");
    if (session.endTime === undefined) throw new Error("La sesión no tiene hora de finalización.");

    const newEndTime = session.endTime + additionalMinutes * 60 * 1000;

    await ctx.db.patch(sessionId, {
      endTime: newEndTime,
      totalPaid: (session.totalPaid ?? 0) + additionalPaid,
      totalMinutes: (session.totalMinutes ?? 0) + additionalMinutes,
      addedMinutes: (session.addedMinutes ?? 0) + additionalMinutes,
      status: "active",
      ...(paymentMethod !== undefined ? { paymentMethod } : {}),
    });
  },
});

export const complete = mutation({
  args: {
    sessionId: v.id("sessions"),
    finalMinutes: v.optional(v.number()),
    finalPaid: v.optional(v.number()),
    paymentMethod: v.optional(v.union(v.literal("QR"), v.literal("Efectivo"))),
    localDate: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, finalMinutes, finalPaid, paymentMethod, localDate }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Sesión no encontrada.");

    let finalTotalPaid = finalPaid !== undefined ? finalPaid : (session.totalPaid ?? 0);
    let finalTotalMinutes = finalMinutes !== undefined ? finalMinutes : (session.totalMinutes ?? 0);
    let finalPaymentMethod = paymentMethod ?? session.paymentMethod;

    if (session.isUnlimited && (finalPaid === undefined || finalMinutes === undefined || !finalPaymentMethod)) {
      throw new Error("Faltan datos para completar la sesión de tiempo ilimitado.");
    }

    await ctx.db.patch(sessionId, { 
      status: "completed",
      totalMinutes: finalTotalMinutes,
      totalPaid: finalTotalPaid,
      paymentMethod: finalPaymentMethod,
      ...(session.isUnlimited && !session.endTime ? { endTime: Date.now() } : {})
    });
    
    const service = await ctx.db.get(session.serviceId);
    if (service) {
      if (service.reservationName) {
        // Change status to reserved and start the timer
        await ctx.db.patch(session.serviceId, { 
          status: "reserved",
          reservationTime: Date.now()
        });
      } else {
        await ctx.db.patch(session.serviceId, { status: "available" });
      }
    }

    const serviceType = service?.type ?? "Otro";

    const today = localDate ?? new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("daily_reports")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) {
      const byType = existing.byType ?? [];
      const typeEntry = byType.find((e) => e.type === serviceType);
      if (typeEntry) {
        typeEntry.earnings += finalTotalPaid;
        typeEntry.count += 1;
      } else {
        byType.push({ type: serviceType, earnings: finalTotalPaid, count: 1 });
      }
      
      const newTotalQR = (existing.totalQR ?? 0) + (finalPaymentMethod === "QR" ? finalTotalPaid : 0);
      const newTotalEfectivo = (existing.totalEfectivo ?? 0) + (finalPaymentMethod === "Efectivo" ? finalTotalPaid : 0);

      await ctx.db.patch(existing._id, {
        totalEarnings: existing.totalEarnings + finalTotalPaid,
        sessionsCount: existing.sessionsCount + 1,
        totalQR: newTotalQR,
        totalEfectivo: newTotalEfectivo,
        byType,
      });
    } else {
      await ctx.db.insert("daily_reports", {
        date: today,
        totalEarnings: finalTotalPaid,
        sessionsCount: 1,
        totalQR: finalPaymentMethod === "QR" ? finalTotalPaid : 0,
        totalEfectivo: finalPaymentMethod === "Efectivo" ? finalTotalPaid : 0,
        byType: [{ type: serviceType, earnings: finalTotalPaid, count: 1 }],
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
        typeEntry.earnings = Math.max(0, typeEntry.earnings - (session.totalPaid ?? 0));
        typeEntry.count    = Math.max(0, typeEntry.count - 1);
      }
      await ctx.db.patch(report._id, {
        totalEarnings:  Math.max(0, report.totalEarnings - (session.totalPaid ?? 0)),
        sessionsCount:  Math.max(0, report.sessionsCount - 1),
        totalQR:        Math.max(0, (report.totalQR ?? 0) - (session.paymentMethod === "QR" ? (session.totalPaid ?? 0) : 0)),
        totalEfectivo:  Math.max(0, (report.totalEfectivo ?? 0) - (session.paymentMethod === "Efectivo" ? (session.totalPaid ?? 0) : 0)),
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
      if (!session.isUnlimited && session.endTime !== undefined && session.endTime < now) {
        await ctx.db.patch(session._id, { status: "expired" });
      }
    }
  },
});
