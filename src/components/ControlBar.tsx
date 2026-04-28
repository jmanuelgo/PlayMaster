import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { TrendingUp, Activity, Layers, RefreshCw } from "lucide-react";
import { formatCurrency } from "../lib/utils";

export function ControlBar() {
  const localDate = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local timezone
  const todayStats = useQuery(api.reports.getTodayStats, { date: localDate });
  const services = useQuery(api.services.list);
  const activeSessions = useQuery(api.sessions.getActive);
  const seedServices = useMutation(api.services.seed);

  const occupied = services?.filter((s: { status: string }) => s.status === "occupied").length ?? 0;
  const available = services?.filter((s: { status: string }) => s.status === "available").length ?? 0;
  const total = services?.length ?? 0;

  const isSeeded = (services?.length ?? 0) > 0;

  return (
    <div className="sticky top-0 z-40 bg-[#0a0a14]/90 backdrop-blur-md border-b border-[#1e1e38]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-lg">🎮</div>
            <div>
              <h1 className="font-bold text-white text-sm leading-none">PlayControl</h1>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Panel de gestión</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <Stat
              icon={<TrendingUp size={14} className="text-emerald-400" />}
              label="Ingresos hoy"
              value={todayStats !== undefined ? formatCurrency(todayStats.totalEarnings) : "—"}
              accent="emerald"
            />
            <Stat
              icon={<Activity size={14} className="text-violet-400" />}
              label="Sesiones activas"
              value={activeSessions !== undefined ? String(activeSessions.length) : "—"}
              accent="violet"
            />
            <Stat
              icon={<Layers size={14} className="text-blue-400" />}
              label="Disponibles / Total"
              value={total > 0 ? `${available} / ${total}` : "—"}
              accent="blue"
              extra={occupied > 0 ? `${occupied} ocupado${occupied !== 1 ? "s" : ""}` : undefined}
            />
          </div>

          {/* Seed button for first run */}
          {!isSeeded && (
            <button
              onClick={() => seedServices()}
              className="flex items-center gap-1.5 text-xs bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw size={12} />
              Cargar servicios de ejemplo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "violet" | "blue";
  extra?: string;
}) {
  const colors = {
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    violet: "bg-violet-500/10 border-violet-500/20",
    blue: "bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[accent]}`}>
      {icon}
      <div>
        <p className="text-[10px] text-slate-500 leading-none">{label}</p>
        <p className="text-sm font-bold text-slate-100 leading-tight mt-0.5">{value}</p>
        {extra && <p className="text-[10px] text-slate-500 leading-none mt-0.5">{extra}</p>}
      </div>
    </div>
  );
}
