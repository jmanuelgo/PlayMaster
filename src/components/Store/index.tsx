import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ProductAdmin } from "./ProductAdmin";
import { ShoppingCart, Package, Plus, Minus, CreditCard, DollarSign } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

interface CartItem {
  productId: Id<"products">;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

export function Store() {
  const products = useQuery(api.store.getProducts);
  const checkoutSale = useMutation(api.store.checkoutSale);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "Efectivo">("Efectivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  function addToCart(product: any) {
    setCart((prev) => {
      const existing = prev.find((p) => p.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; 
        return prev.map((p) =>
          p.productId === product._id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      if (product.stock <= 0) return prev;
      return [...prev, { productId: product._id, name: product.name, price: product.price, quantity: 1, stock: product.stock }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((p) => p.productId === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((p) =>
          p.productId === productId ? { ...p, quantity: p.quantity - 1 } : p
        );
      }
      return prev.filter((p) => p.productId !== productId);
    });
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await checkoutSale({
        items: cart.map((c) => ({
          productId: c.productId,
          name: c.name,
          quantity: c.quantity,
          price: c.price,
        })),
        totalPrice: total,
        paymentMethod,
        localDate: new Date().toLocaleDateString("sv-SE"),
      });
      setCart([]);
      setSuccess("Venta registrada con éxito");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Error al procesar la venta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="text-violet-400" size={24} />
        <h1 className="text-2xl font-bold text-slate-100">Tienda</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Productos Disponibles</h2>
          {products === undefined ? (
            <p className="text-slate-400">Cargando productos...</p>
          ) : products.length === 0 ? (
            <p className="text-slate-400 text-sm">No hay productos disponibles.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map((p: any) => {
                const inCart = cart.find((c) => c.productId === p._id)?.quantity || 0;
                const outOfStock = p.stock - inCart <= 0;
                return (
                  <div key={p._id} className="card p-4 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <Package size={20} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">{p.name}</p>
                      <p className="text-sm text-emerald-400">{formatCurrency(p.price)}</p>
                      <p className="text-xs text-slate-500 mt-1">Stock: {p.stock - inCart}</p>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={outOfStock}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        outOfStock ? "bg-[#1e1e38] text-slate-500 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-500 text-white"
                      }`}
                    >
                      {outOfStock ? "Agotado" : "Añadir"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-8">
            <ProductAdmin />
          </div>
        </div>

        {/* Cart */}
        <div className="card p-5 h-fit sticky top-24">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#1e1e38]">
            <ShoppingCart className="text-violet-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-200">Venta Actual</h2>
          </div>

          {cart.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">El carrito está vacío</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center bg-[#0a0a14] p-3 rounded-lg border border-[#2e2e52]">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(item.price)} c/u</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-[#1e1e38] rounded-md p-0.5">
                        <button onClick={() => removeFromCart(item.productId)} className="p-1 text-slate-400 hover:text-white rounded">
                          <Minus size={14} />
                        </button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart({ _id: item.productId, stock: item.stock })} className="p-1 text-slate-400 hover:text-white rounded">
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-emerald-400 w-16 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#1e1e38]">
                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Total</span>
                  <span className="text-emerald-400">{formatCurrency(total)}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <label className="text-sm text-slate-400">Método de pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod("QR")}
                      className={`py-2 flex items-center justify-center gap-2 rounded-lg text-sm transition-all ${
                        paymentMethod === "QR" ? "bg-emerald-600 text-white" : "bg-[#0a0a14] border border-[#2e2e52] text-slate-400"
                      }`}
                    >
                      <CreditCard size={16} /> QR
                    </button>
                    <button
                      onClick={() => setPaymentMethod("Efectivo")}
                      className={`py-2 flex items-center justify-center gap-2 rounded-lg text-sm transition-all ${
                        paymentMethod === "Efectivo" ? "bg-amber-600 text-white" : "bg-[#0a0a14] border border-[#2e2e52] text-slate-400"
                      }`}
                    >
                      <DollarSign size={16} /> Efectivo
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
                {success && <p className="text-sm text-emerald-400 mb-2">{success}</p>}

                <button
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  {loading ? "Procesando..." : "Cobrar Venta"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
