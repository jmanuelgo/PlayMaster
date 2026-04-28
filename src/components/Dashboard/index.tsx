import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { StationCard } from "./StationCard";
import { AlertOverlay } from "./AlertOverlay";
import { LayoutGrid, Loader2 } from "lucide-react";

export function Dashboard() {
  const services = useQuery(api.services.list);
  const activeSessions = useQuery(api.sessions.getActive);
  const expiredSessions = useQuery(api.sessions.getExpired);


  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isLoading = services === undefined;

  const sessionsByService: Record<string, {
    _id: Id<"sessions">;
    endTime: number;
    totalMinutes: number;
    totalPaid: number;
    addedMinutes: number;
    clientName?: string;
    isUnlimited?: boolean;
    startTime: number;
  }> = {};

  for (const s of activeSessions ?? []) {
    sessionsByService[s.serviceId] = s as any;
  }
  for (const s of expiredSessions ?? []) {
    if (!sessionsByService[s.serviceId]) {
      sessionsByService[s.serviceId] = s as any;
    }
  }

  const servicesMap: Record<string, { name: string; type: string }> = {};
  for (const svc of services ?? []) {
    servicesMap[svc._id] = { name: svc.name, type: svc.type };
  }

  type RawSession = { _id: Id<"sessions">; serviceId: Id<"services">; totalPaid: number; endTime?: number; isUnlimited?: boolean };

  const dbExpiredIds = new Set((expiredSessions ?? []).map((s) => s._id));
  const clientExpired = (activeSessions ?? []).filter((s) => !s.isUnlimited && s.endTime !== undefined && s.endTime <= now && !dbExpiredIds.has(s._id));
  const allExpired = [
    ...(expiredSessions ?? []),
    ...clientExpired,
  ];

  const expiredForAlert = allExpired.map((s) => ({
    _id: s._id,
    serviceId: s.serviceId,
    totalPaid: s.totalPaid ?? 0,
  }));

  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, number>>({});

  const unlimitedAlerts = (activeSessions ?? [])
    .filter((s) => {
      if (!s.isUnlimited) return false;
      const elapsedMinutes = Math.floor((now - s.startTime) / 60000);
      if (elapsedMinutes < 180) return false;

      const lastDismissed = dismissedAlerts[s._id] || 0;
      if (lastDismissed === 0) return true;
      if (elapsedMinutes - lastDismissed >= 30) return true;

      return false;
    })
    .map(s => ({
      _id: s._id as Id<"sessions">,
      serviceId: s.serviceId as Id<"services">,
      elapsedMinutes: Math.floor((now - s.startTime) / 60000)
    }));

  function handleDismissUnlimited(sessionId: Id<"sessions">, elapsedMinutes: number) {
    setDismissedAlerts(prev => ({
      ...prev,
      [sessionId]: elapsedMinutes
    }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Cargando servicios...</span>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <LayoutGrid size={28} className="text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-200">Sin servicios configurados</h3>
          <p className="text-sm text-slate-500 mt-1">
            Ve a <strong className="text-slate-400">Configuración</strong> para añadir tus consolas y servicios,<br />
            o usa el botón "Cargar servicios de ejemplo" en la barra superior.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <LayoutGrid size={18} className="text-violet-400" />
            Panel de estaciones
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {services.length} servicio{services.length !== 1 ? "s" : ""} registrado{services.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {services.map((svc: Parameters<typeof StationCard>[0]["service"]) => (
            <StationCard
              key={svc._id}
              service={svc}
              session={sessionsByService[svc._id]}
            />
          ))}
        </div>
      </div>

      <AlertOverlay
        expiredSessions={expiredForAlert}
        unlimitedAlerts={unlimitedAlerts}
        onDismissUnlimited={handleDismissUnlimited}
        servicesMap={servicesMap}
      />
    </>
  );
}
