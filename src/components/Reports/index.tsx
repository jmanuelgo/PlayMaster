import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  BarChart2, Calendar, TrendingUp, Activity,
  ShoppingBag, CreditCard, DollarSign, Package, Clock3, User, Trash2,
} from "lucide-react";
import { PinModal } from "../common/PinModal";
import { formatCurrency, formatDateTime, formatDuration, nDaysAgoISODate, todayISODate } from "../../lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: "Hoy",     days: 0  },
  { label: "7 días",  days: 7  },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
];

const TYPE_COLORS: Record<string, string> = {
  PS5:       "#3b82f6",
  PS4:       "#6366f1",
  "Futbolín":"#10b981",
  Tienda:    "#f59e0b",
  Otro:      "#8b5cf6",
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function RangeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-violet-600 text-white" : "bg-[#1e1e38] text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function KPICard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function PaymentBadge({ method }: { method?: string }) {
  if (method === "QR")
    return <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"><CreditCard size={10} />QR</span>;
  if (method === "Efectivo")
    return <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/25"><DollarSign size={10} />Efectivo</span>;
  return <span className="text-slate-600 text-xs">—</span>;
}

const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#11111e] border border-[#2e2e52] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-base font-bold text-emerald-400">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

// ─── Games tab ────────────────────────────────────────────────────────────────
// All KPIs, chart data and category breakdown are derived exclusively from
// the sessions history — never from daily_reports, which aggregates store
// sales too and would contaminate the numbers.

type SessionRow = {
  _id: Id<"sessions">;
  serviceId: string;
  clientName?: string;
  startTime: number;
  totalMinutes: number;
  totalPaid: number;
  status: string;
  paymentMethod?: string;
};

function GamesTab({ startDate, endDate, startTs, endTs }: {
  startDate: string; endDate: string; startTs: number; endTs: number;
}) {
  const history       = useQuery(api.sessions.getHistory, { startDate: startTs, endDate: endTs });
  const services      = useQuery(api.services.list);
  const deleteSession = useMutation(api.sessions.deleteSession);

  const [pendingDelete, setPendingDelete] = useState<Id<"sessions"> | null>(null);

  const servicesMap = useMemo(() => {
    const m: Record<string, { name: string; type: string }> = {};
    for (const s of services ?? []) m[s._id] = { name: s.name, type: s.type };
    return m;
  }, [services]);

  // KPIs — computed directly from sessions, zero store contamination
  const sessions = (history ?? []) as SessionRow[];
  const totalEarnings = sessions.reduce((s, r) => s + r.totalPaid, 0);
  const totalQR       = sessions.filter((r) => r.paymentMethod === "QR").reduce((s, r) => s + r.totalPaid, 0);
  const totalEfectivo = sessions.filter((r) => r.paymentMethod === "Efectivo").reduce((s, r) => s + r.totalPaid, 0);
  const totalCount    = sessions.length;

  // Bar chart: group session earnings by calendar day
  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    let cur = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");
    while (cur <= end) {
      days[cur.toISOString().split("T")[0]] = 0;
      cur.setDate(cur.getDate() + 1);
    }
    for (const s of sessions) {
      const day = new Date(s.startTime).toISOString().split("T")[0];
      if (day in days) days[day] += s.totalPaid;
    }
    return Object.entries(days).map(([date, ingresos]) => ({ date: date.slice(5), ingresos }));
  }, [sessions, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pie chart: group by service type from actual sessions + servicesMap
  const byTypeData = useMemo(() => {
    const m: Record<string, { type: string; earnings: number; count: number }> = {};
    for (const s of sessions) {
      const type = servicesMap[s.serviceId]?.type ?? "Otro";
      if (!m[type]) m[type] = { type, earnings: 0, count: 0 };
      m[type].earnings += s.totalPaid;
      m[type].count    += 1;
    }
    return Object.values(m).sort((a, b) => b.earnings - a.earnings);
  }, [sessions, servicesMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = history === undefined;

  async function handleDelete(pin: string) {
    if (!pendingDelete) return;
    await deleteSession({ sessionId: pendingDelete, pin });
    setPendingDelete(null);
  }

  const pendingSession = sessions.find((s) => s._id === pendingDelete);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<TrendingUp size={16} className="text-emerald-400" />}
          label="Total ingresos"
          value={isLoading ? "—" : formatCurrency(totalEarnings)}
          sub={startDate === endDate ? "Hoy" : `${startDate} → ${endDate}`}
        />
        <KPICard
          icon={<CreditCard size={16} className="text-emerald-400" />}
          label="Cobros QR"
          value={isLoading ? "—" : formatCurrency(totalQR)}
          sub="Pagos por QR"
        />
        <KPICard
          icon={<DollarSign size={16} className="text-amber-400" />}
          label="Cobros Efectivo"
          value={isLoading ? "—" : formatCurrency(totalEfectivo)}
          sub="Pagos en efectivo"
        />
        <KPICard
          icon={<Activity size={16} className="text-violet-400" />}
          label="Sesiones"
          value={isLoading ? "—" : String(totalCount)}
          sub="completadas en el período"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Ingresos diarios (juegos)</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Cargando...</div>
          ) : chartData.every((d) => d.ingresos === 0) ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Sin sesiones en el período</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e38" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `Bs ${v}`} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "#1e1e38" }} />
                <Bar dataKey="ingresos" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Por categoría</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Cargando...</div>
          ) : byTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Sin datos</div>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={byTypeData}
                    dataKey="earnings"
                    nameKey="type"
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={70}
                    paddingAngle={3}
                  >
                    {byTypeData.map((entry) => (
                      <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? "#8b5cf6"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Ingresos"]}
                    contentStyle={{
                      background: "#11111e",
                      border: "1px solid #2e2e52",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}
                    itemStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                  />
                  <Legend
                    formatter={(v) => <span className="text-xs text-slate-400">{v}</span>}
                    wrapperStyle={{ paddingTop: 4 }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Category rows */}
              <div className="space-y-1">
                {byTypeData.map((t) => (
                  <div
                    key={t.type}
                    className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg hover:bg-[#1e1e38] transition-colors"
                  >
                    <span className="flex items-center gap-2 text-slate-400">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: TYPE_COLORS[t.type] ?? "#8b5cf6" }}
                      />
                      {t.type}
                      <span className="text-slate-600">({t.count} ses.)</span>
                    </span>
                    <span className="font-semibold text-slate-200">{formatCurrency(t.earnings)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sessions history */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-[#1e1e38]">
          <Clock3 size={14} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-300">
            Historial de sesiones ({sessions.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-600 text-sm">Cargando...</div>
          ) : sessions.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-600 text-sm">
              No hay sesiones en el período.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e38]">
                  {["Servicio", "Cliente", "Inicio", "Duración", "Pago", "Estado", "Cobrado", ""].map((h, idx) => (
                    <th key={idx} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => {
                  const svc = servicesMap[session.serviceId];
                  return (
                    <tr
                      key={session._id}
                      className={`border-b border-[#1e1e38]/50 hover:bg-[#16162a] transition-colors ${i % 2 ? "bg-[#0d0d1a]/30" : ""}`}
                    >
                      <td className="px-4 py-3 text-slate-200 font-medium">{svc?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {session.clientName
                          ? <span className="flex items-center gap-1"><User size={11} />{session.clientName}</span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDateTime(session.startTime)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDuration(session.totalMinutes)}</td>
                      <td className="px-4 py-3"><PaymentBadge method={session.paymentMethod} /></td>
                      <td className="px-4 py-3">
                        {session.status === "completed"
                          ? <span className="badge-available">Completada</span>
                          : <span className="badge-expired">Expirada</span>}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(session.totalPaid)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setPendingDelete(session._id)}
                          title="Eliminar sesión"
                          className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {pendingDelete && pendingSession && (
        <PinModal
          title="Eliminar sesión"
          description={`${formatCurrency(pendingSession.totalPaid)} — ${formatDateTime(pendingSession.startTime)}`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

// ─── Store tab ────────────────────────────────────────────────────────────────

type SaleRow = {
  _id: Id<"sales">;
  timestamp: number;
  paymentMethod: "QR" | "Efectivo";
  totalPrice: number;
  items: { name: string; quantity: number; price: number }[];
};

function StoreTab({ startTs, endTs }: { startTs: number; endTs: number }) {
  const salesHistory = useQuery(api.store.getSalesHistory, { startDate: startTs, endDate: endTs });
  const deleteSale   = useMutation(api.store.deleteSale);

  const [pendingDelete, setPendingDelete] = useState<Id<"sales"> | null>(null);

  const sales = (salesHistory ?? []) as SaleRow[];
  const isLoading = salesHistory === undefined;

  const totalSales    = sales.reduce((s, r) => s + r.totalPrice, 0);
  const totalQR       = sales.filter((r) => r.paymentMethod === "QR").reduce((s, r) => s + r.totalPrice, 0);
  const totalEfectivo = sales.filter((r) => r.paymentMethod === "Efectivo").reduce((s, r) => s + r.totalPrice, 0);
  const totalItems    = sales.reduce((s, r) => s + r.items.reduce((a, i) => a + i.quantity, 0), 0);

  const topProducts = useMemo(() => {
    const m: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!m[item.name]) m[item.name] = { name: item.name, qty: 0, revenue: 0 };
        m[item.name].qty     += item.quantity;
        m[item.name].revenue += item.price * item.quantity;
      }
    }
    return Object.values(m).sort((a, b) => b.revenue - a.revenue);
  }, [sales]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(pin: string) {
    if (!pendingDelete) return;
    await deleteSale({ saleId: pendingDelete, pin });
    setPendingDelete(null);
  }

  const pendingSale = sales.find((s) => s._id === pendingDelete);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<ShoppingBag size={16} className="text-amber-400" />}
          label="Total ventas tienda"
          value={isLoading ? "—" : formatCurrency(totalSales)}
          sub={`${sales.length} transacciones`}
        />
        <KPICard
          icon={<CreditCard size={16} className="text-emerald-400" />}
          label="Cobros QR"
          value={isLoading ? "—" : formatCurrency(totalQR)}
          sub="Pagos por QR"
        />
        <KPICard
          icon={<DollarSign size={16} className="text-amber-400" />}
          label="Cobros Efectivo"
          value={isLoading ? "—" : formatCurrency(totalEfectivo)}
          sub="Pagos en efectivo"
        />
        <KPICard
          icon={<Package size={16} className="text-violet-400" />}
          label="Ítems vendidos"
          value={isLoading ? "—" : String(totalItems)}
          sub="unidades totales"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales history */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 p-4 border-b border-[#1e1e38]">
            <ShoppingBag size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-300">
              Historial de ventas ({sales.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-600 text-sm">Cargando...</div>
            ) : sales.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-slate-600 text-sm">
                No hay ventas en el período.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e38]">
                    {["Fecha/Hora", "Productos", "Pago", "Total", ""].map((h, idx) => (
                      <th key={idx} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale, i) => (
                    <tr
                      key={sale._id}
                      className={`border-b border-[#1e1e38]/50 hover:bg-[#16162a] transition-colors ${i % 2 ? "bg-[#0d0d1a]/30" : ""}`}
                    >
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDateTime(sale.timestamp)}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {sale.items.map((item, j) => (
                            <span key={j} className="text-xs bg-[#1e1e38] text-slate-300 px-1.5 py-0.5 rounded">
                              {item.name} ×{item.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3"><PaymentBadge method={sale.paymentMethod} /></td>
                      <td className="px-4 py-3 font-bold text-emerald-400 whitespace-nowrap">{formatCurrency(sale.totalPrice)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setPendingDelete(sale._id)}
                          title="Eliminar venta"
                          className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Package size={14} className="text-violet-400" />
            Productos más vendidos
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">Cargando...</div>
          ) : topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">Sin datos</div>
          ) : (
            <div className="space-y-1">
              {topProducts.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#1e1e38] transition-colors"
                >
                  <span className="text-xs font-bold text-slate-600 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.qty} uds</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 shrink-0">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PIN modal for delete */}
      {pendingDelete && pendingSale && (
        <PinModal
          title="Eliminar venta"
          description={`${formatCurrency(pendingSale.totalPrice)} — ${formatDateTime(pendingSale.timestamp)}`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function Reports({ onCancel }: { onCancel?: () => void }) {
  const [activeTab, setActiveTab]     = useState<"juegos" | "tienda">("juegos");
  const [selectedRange, setSelectedRange] = useState(7);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [useCustom, setUseCustom]     = useState(false);

  // Security
  const [authorized, setAuthorized] = useState(false);
  const hasPin = useQuery(api.settings.hasPin);
  const verifyPin = useMutation(api.settings.verifyPin);

  const startDate = useCustom && customStart
    ? customStart
    : selectedRange === 0 ? todayISODate() : nDaysAgoISODate(selectedRange);
  const endDate = useCustom && customEnd ? customEnd : todayISODate();

  const startTs = new Date(startDate + "T00:00:00").getTime();
  const endTs   = new Date(endDate   + "T23:59:59").getTime();

  // Handle authorization state
  if (hasPin === false && !authorized) {
    setAuthorized(true);
  }

  if (hasPin === undefined) {
    return <div className="text-center py-16 text-slate-500">Cargando...</div>;
  }

  if (!authorized) {
    return (
      <PinModal
        title="Acceso Restringido"
        description="Ingresa el PIN de seguridad para ver los reportes."
        confirmLabel="Ingresar"
        onConfirm={async (pin) => {
          await verifyPin({ pin });
          setAuthorized(true);
        }}
        onCancel={() => {
          if (onCancel) onCancel();
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <BarChart2 size={18} className="text-violet-400" />
            Reportes financieros
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Análisis de ingresos, sesiones y ventas</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {RANGE_OPTIONS.map((r) => (
            <RangeButton
              key={r.days}
              label={r.label}
              active={!useCustom && selectedRange === r.days}
              onClick={() => { setSelectedRange(r.days); setUseCustom(false); }}
            />
          ))}
          <button
            onClick={() => setUseCustom(true)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              useCustom ? "bg-violet-600 text-white" : "bg-[#1e1e38] text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar size={13} /> Rango
          </button>
        </div>
      </div>

      {useCustom && (
        <div className="card p-4 flex gap-4 items-end flex-wrap">
          <div>
            <label className="label">Desde</label>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input w-40" />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input w-40" />
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#11111e] border border-[#1e1e38] p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("juegos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "juegos" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart2 size={15} /> Juegos
        </button>
        <button
          onClick={() => setActiveTab("tienda")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "tienda" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShoppingBag size={15} /> Tienda
        </button>
      </div>

      {activeTab === "juegos" && (
        <GamesTab startDate={startDate} endDate={endDate} startTs={startTs} endTs={endTs} />
      )}
      {activeTab === "tienda" && (
        <StoreTab startTs={startTs} endTs={endTs} />
      )}
    </div>
  );
}
