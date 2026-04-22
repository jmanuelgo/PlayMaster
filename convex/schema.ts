import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  services: defineTable({
    name: v.string(),
    type: v.union(v.literal("PS5"), v.literal("PS4"), v.literal("Futbolín"), v.literal("Otro")),
    rate: v.number(),
    halfHourRate: v.optional(v.number()),
    unitMinutes: v.number(),
    status: v.union(v.literal("available"), v.literal("occupied"), v.literal("maintenance")),
    order: v.optional(v.number()),
  }),

  sessions: defineTable({
    serviceId: v.id("services"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    totalMinutes: v.optional(v.number()),
    totalPaid: v.optional(v.number()),
    isUnlimited: v.optional(v.boolean()),
    paymentMethod: v.optional(v.union(v.literal("QR"), v.literal("Efectivo"))),
    addedMinutes: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("expired")),
    clientName: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_service", ["serviceId"])
    .index("by_status", ["status"])
    .index("by_start_time", ["startTime"]),

  daily_reports: defineTable({
    date: v.string(),
    totalEarnings: v.number(),
    sessionsCount: v.number(),
    totalQR: v.optional(v.number()),
    totalEfectivo: v.optional(v.number()),
    byType: v.optional(
      v.array(
        v.object({
          type: v.string(),
          earnings: v.number(),
          count: v.number(),
        })
      )
    ),
  }).index("by_date", ["date"]),

  products: defineTable({
    name: v.string(),
    price: v.number(),
    stock: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
  }),

  sales: defineTable({
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        quantity: v.number(),
        price: v.number(),
      })
    ),
    totalPrice: v.number(),
    paymentMethod: v.union(v.literal("QR"), v.literal("Efectivo")),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
