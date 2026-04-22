import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Plus, PackagePlus, Package, ChevronDown, ChevronUp, AlertTriangle, Pencil, Trash2, X, Check } from "lucide-react";
import { formatCurrency } from "../../lib/utils";

interface Product {
  _id: Id<"products">;
  name: string;
  price: number;
  stock: number;
  status: string;
}

function StockRow({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(product.name);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const updateStock = useMutation(api.store.updateStock);
  const updateProduct = useMutation(api.store.updateProduct);
  const deleteProduct = useMutation(api.store.deleteProduct);

  async function handleAdd() {
    const n = parseInt(qty);
    if (!n || n <= 0) { setError("Ingresa una cantidad válida."); return; }
    setLoading(true); setError("");
    try {
      await updateStock({ productId: product._id, quantity: n });
      setQty("1");
      setOpen(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar stock.");
    } finally {
      setLoading(false);
    }
  }

  const lowStock = product.stock <= 3;

  return (
    <div className={`rounded-xl border transition-all ${open ? "border-violet-500/40 bg-[#0f0f1e]" : "border-[#1e1e38] bg-[#11111e]"}`}>
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
          <Package size={16} className="text-violet-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-100 text-sm truncate">{product.name}</p>
          <p className="text-xs text-slate-500">{formatCurrency(product.price)}</p>
        </div>

        {/* Stock badge */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
          product.stock === 0
            ? "bg-red-500/15 text-red-400 border border-red-500/25"
            : lowStock
            ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
        }`}>
          {lowStock && product.stock > 0 && <AlertTriangle size={10} />}
          {product.stock} uds
        </div>

        {success && <span className="text-xs text-emerald-400 shrink-0">✓ Actualizado</span>}

        {/* Toggle button */}
        <button
          onClick={() => { setOpen((o) => !o); setError(""); }}
          className="flex items-center gap-1 text-xs bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
          title="Reponer stock"
        >
          <PackagePlus size={13} />
          <span className="hidden sm:inline">Reponer</span>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Edit and Delete actions within the expanded area */}
      {open && (
        <div className="px-3 pb-3 pt-0 border-t border-[#1e1e38] mt-0 space-y-4">
          <div className="pt-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="label text-xs">Unidades a añadir</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="input text-sm"
                placeholder="Ej: 10"
              />
            </div>
            <div className="text-xs text-slate-500 pb-2.5">
              → {product.stock + (parseInt(qty) || 0)} total
            </div>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="btn-primary text-sm px-4 py-2 shrink-0"
            >
              {loading ? "..." : "Añadir"}
            </button>
          </div>

          <div className="border-t border-[#1e1e38] pt-3">
            <div className="flex items-center justify-between gap-2">
              {isEditing ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input text-sm flex-1"
                    placeholder="Nombre del producto"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (!editName.trim()) return;
                      setLoading(true); setError("");
                      try {
                        await updateProduct({ productId: product._id, name: editName.trim() });
                        setIsEditing(false);
                      } catch (e: any) {
                        setError(e.message);
                      } finally { setLoading(false); }
                    }}
                    disabled={loading}
                    className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors shrink-0"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditName(product.name); }}
                    className="p-1.5 text-slate-400 hover:bg-[#1e1e38] rounded-lg transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : showConfirmDelete ? (
                <div className="flex flex-1 items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1.5">
                  <span className="text-xs text-red-400 flex-1">¿Eliminar producto?</span>
                  <button
                    onClick={async () => {
                      setLoading(true); setError("");
                      try {
                        await deleteProduct({ productId: product._id });
                      } catch (e: any) {
                        setError(e.message);
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="text-xs text-red-300 hover:text-red-200 font-semibold px-2"
                  >
                    Sí, eliminar
                  </button>
                  <span className="text-red-600">·</span>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="text-xs text-slate-400 hover:text-slate-200 px-2"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#1e1e38] px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Pencil size={13} /> Editar nombre
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function ProductAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const products = useQuery(api.store.getProducts);
  const createProduct = useMutation(api.store.createProduct);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !stock) { setError("Todos los campos son obligatorios."); return; }
    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock);
    if (parsedPrice <= 0 || parsedStock < 0) { setError("Valores inválidos."); return; }

    setLoading(true); setError("");
    try {
      await createProduct({ name: name.trim(), price: parsedPrice, stock: parsedStock });
      setName(""); setPrice(""); setStock("");
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear producto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card border-[#1e1e38] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e38]">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-violet-400" />
          <h3 className="font-semibold text-slate-200 text-sm">Inventario de productos</h3>
          {products !== undefined && (
            <span className="text-xs text-slate-500 bg-[#1e1e38] px-1.5 py-0.5 rounded">
              {products.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setError(""); }}
          className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} /> Nuevo producto
        </button>
      </div>

      {/* New product form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 border-b border-[#1e1e38] bg-[#0a0a14] space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nuevo producto</p>
          <div>
            <label className="label text-xs">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input text-sm" placeholder="Ej: Pipoca salada" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Precio (Bs)</label>
              <input type="number" step="0.5" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="input text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="label text-xs">Stock inicial</label>
              <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="input text-sm" placeholder="0" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="btn-secondary text-sm px-3 py-1.5">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-sm px-3 py-1.5">
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {/* Product list */}
      <div className="p-3 space-y-2">
        {products === undefined ? (
          <p className="text-slate-500 text-sm text-center py-4">Cargando...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Package size={28} className="text-slate-700 mx-auto" />
            <p className="text-slate-500 text-sm">Sin productos. Crea el primero.</p>
          </div>
        ) : (
          products.map((p: Product) => <StockRow key={p._id} product={p} />)
        )}
      </div>
    </div>
  );
}
