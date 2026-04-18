import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getSalesHistory = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const all = await ctx.db
      .query("sales")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    return all.filter((s) => {
      if (startDate !== undefined && s.timestamp < startDate) return false;
      if (endDate !== undefined && s.timestamp > endDate) return false;
      return true;
    });
  },
});

export const getTodaySalesStats = query({
  args: {},
  handler: async (ctx) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", todayStart.getTime()))
      .collect();

    const total = sales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalQR = sales.filter((s) => s.paymentMethod === "QR").reduce((sum, s) => sum + s.totalPrice, 0);
    const totalEfectivo = sales.filter((s) => s.paymentMethod === "Efectivo").reduce((sum, s) => sum + s.totalPrice, 0);
    const itemsSold = sales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0);

    return { total, totalQR, totalEfectivo, count: sales.length, itemsSold };
  },
});

export const deleteSale = mutation({
  args: {
    saleId: v.id("sales"),
    pin: v.string(),
  },
  handler: async (ctx, { saleId, pin }) => {
    // 1. Validate PIN
    const pinSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();
    if (!pinSetting) throw new Error("No hay PIN configurado. Establece uno en Configuración.");
    if (pinSetting.value !== pin) throw new Error("PIN incorrecto.");

    // 2. Get the sale
    const sale = await ctx.db.get(saleId);
    if (!sale) throw new Error("Venta no encontrada.");

    // 3. Restore stock for each item
    for (const item of sale.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, { stock: product.stock + item.quantity });
      }
    }

    // 4. Update daily_reports to subtract the sale's contribution
    const saleDate = new Date(sale.timestamp).toISOString().split("T")[0];
    const report = await ctx.db
      .query("daily_reports")
      .withIndex("by_date", (q) => q.eq("date", saleDate))
      .first();

    if (report) {
      const byType = report.byType ?? [];
      const tiendaEntry = byType.find((e) => e.type === "Tienda");
      const soldQty = sale.items.reduce((s, i) => s + i.quantity, 0);
      if (tiendaEntry) {
        tiendaEntry.earnings = Math.max(0, tiendaEntry.earnings - sale.totalPrice);
        tiendaEntry.count    = Math.max(0, tiendaEntry.count - soldQty);
      }
      await ctx.db.patch(report._id, {
        totalEarnings: Math.max(0, report.totalEarnings - sale.totalPrice),
        totalQR:       Math.max(0, (report.totalQR ?? 0) - (sale.paymentMethod === "QR" ? sale.totalPrice : 0)),
        totalEfectivo: Math.max(0, (report.totalEfectivo ?? 0) - (sale.paymentMethod === "Efectivo" ? sale.totalPrice : 0)),
        byType,
      });
    }

    // 5. Delete the sale record
    await ctx.db.delete(saleId);
  },
});

export const getProducts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const createProduct = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    stock: v.number(),
  },
  handler: async (ctx, { name, price, stock }) => {
    await ctx.db.insert("products", {
      name,
      price,
      stock,
      status: "active",
    });
  },
});

export const updateStock = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, { productId, quantity }) => {
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Producto no encontrado.");
    
    await ctx.db.patch(productId, {
      stock: Math.max(0, product.stock + quantity),
    });
  },
});

export const checkoutSale = mutation({
  args: {
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
  },
  handler: async (ctx, { items, totalPrice, paymentMethod }) => {
    // 1. Validate stock and update products
    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${item.name}.`);
      }
      await ctx.db.patch(item.productId, {
        stock: product.stock - item.quantity,
      });
    }

    // 2. Record the sale
    await ctx.db.insert("sales", {
      items,
      totalPrice,
      paymentMethod,
      timestamp: Date.now(),
    });

    // 3. Update Daily Reports
    const today = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("daily_reports")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) {
      const byType = existing.byType ?? [];
      const typeEntry = byType.find((e) => e.type === "Tienda");
      if (typeEntry) {
        typeEntry.earnings += totalPrice;
        typeEntry.count += items.reduce((acc, item) => acc + item.quantity, 0);
      } else {
        byType.push({ type: "Tienda", earnings: totalPrice, count: items.reduce((acc, item) => acc + item.quantity, 0) });
      }

      const newTotalQR = (existing.totalQR ?? 0) + (paymentMethod === "QR" ? totalPrice : 0);
      const newTotalEfectivo = (existing.totalEfectivo ?? 0) + (paymentMethod === "Efectivo" ? totalPrice : 0);

      await ctx.db.patch(existing._id, {
        totalEarnings: existing.totalEarnings + totalPrice,
        totalQR: newTotalQR,
        totalEfectivo: newTotalEfectivo,
        byType,
      });
    } else {
      await ctx.db.insert("daily_reports", {
        date: today,
        totalEarnings: totalPrice,
        sessionsCount: 0,
        totalQR: paymentMethod === "QR" ? totalPrice : 0,
        totalEfectivo: paymentMethod === "Efectivo" ? totalPrice : 0,
        byType: [{ type: "Tienda", earnings: totalPrice, count: items.reduce((acc, item) => acc + item.quantity, 0) }],
      });
    }
  },
});
