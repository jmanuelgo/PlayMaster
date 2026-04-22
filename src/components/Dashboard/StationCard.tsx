import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Play, PlusCircle, CheckCircle2, Settings2, User, Clock3 } from "lucide-react";
import { useCountdown } from "../../hooks/useCountdown";
import { SessionModal } from "./SessionModal";
import { ExtendModal } from "./ExtendModal";
import { CompleteModal } from "./CompleteModal";
import {
  cn, formatCurrency, formatCountdown, formatDuration,
  getProgressColor, serviceTypeColor, serviceTypeIcon,
} from "../../lib/utils";

interface Session {
  _id: Id<"sessions">;
  endTime: number;
  totalMinutes: number;
  totalPaid: number;
  addedMinutes: number;
  clientName?: string;
  isUnlimited?: boolean;
  startTime: number;
}

interface Props {
  service: {
    _id: Id<"services">;
    name: string;
    type: string;
    rate: number;
    halfHourRate?: number;
    unitMinutes: number;
    status: "available" | "occupied" | "maintenance";
  };
  session?: Session;
}

function CountdownDisplay({ endTime, totalMinutes }: { endTime: number; totalMinutes: number }) {
  const remaining = useCountdown(endTime);
  const totalMs = totalMinutes * 60 * 1000;
  const pct = totalMs > 0 ? Math.min(100, (remaining / totalMs) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className={cn("text-3xl font-mono font-bold tabular-nums tracking-tight", pct <= 20 ? "text-red-400" : pct <= 50 ? "text-amber-400" : "text-emerald-400")}>
        {formatCountdown(remaining)}
      </div>
      <div className="progress-bar">
        <div
          className={cn("progress-fill", getProgressColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        de {formatDuration(totalMinutes)} contratados
      </p>
    </div>
  );
}

function UptimeDisplay({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  
  return (
    <div className="space-y-2">
      <div className="text-3xl font-mono font-bold tabular-nums tracking-tight text-blue-400">
        {formatCountdown(elapsed)}
      </div>
      <div className="progress-bar overflow-hidden relative bg-[#0a0a14]">
        <div className="absolute inset-0 bg-blue-500/20 animate-pulse" />
      </div>
      <p className="text-xs text-slate-500">Tiempo transcurrido</p>
    </div>
  );
}

export function StationCard({ service, session }: Props) {
  const [showStart, setShowStart] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const updateService = useMutation(api.services.update);

  const isAvailable = service.status === "available";
  const isOccupied = service.status === "occupied";
  const isMaintenance = service.status === "maintenance";


  const remaining = useCountdown(session?.endTime ?? 0);
  const isExpired = !!session && !session.isUnlimited && isOccupied && remaining === 0;

  const gradient = serviceTypeColor(service.type);
  const icon = serviceTypeIcon(service.type);

  async function toggleMaintenance() {
    await updateService({
      id: service._id,
      status: isMaintenance ? "available" : "maintenance",
    });
  }

  return (
    <>
      <div
        className={cn(
          "card card-hover relative flex flex-col overflow-hidden transition-all duration-300 select-none",
          isExpired && "border-red-500/60 ring-1 ring-red-500/30 ring-pulse",
          isOccupied && !isExpired && "border-violet-500/40",
          isMaintenance && "opacity-70"
        )}
      >
        {/* Top accent strip */}
        <div className={cn("h-1 w-full bg-gradient-to-r", gradient)} />

        <div className="p-4 flex-1 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">{icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-100 text-sm leading-tight line-clamp-2 break-words">{service.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{service.type}</p>
              </div>
            </div>
            <div className="shrink-0">
              {isExpired ? (
                <span className="badge-expired">Expirado</span>
              ) : isOccupied ? (
                <span className="badge-occupied">Ocupado</span>
              ) : isMaintenance ? (
                <span className="badge-maintenance">Mantenimiento</span>
              ) : (
                <span className="badge-available">Disponible</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {isOccupied && session ? (
              <div className="space-y-3">
                {session.isUnlimited ? (
                  <UptimeDisplay startTime={session.startTime} />
                ) : (
                  <CountdownDisplay endTime={session.endTime} totalMinutes={session.totalMinutes} />
                )}
                <div className="space-y-1.5 pt-1 border-t border-[#1e1e38]">
                  {session.clientName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <User size={11} className="shrink-0" />
                      <span className="truncate">{session.clientName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock3 size={11} className="shrink-0" />
                    <span>
                      {session.isUnlimited ? (
                        <span className="text-blue-400">Tiempo ilimitado</span>
                      ) : (
                        <>
                          {formatDuration(session.totalMinutes)}
                          {session.addedMinutes > 0 && (
                            <span className="text-violet-400 ml-1">(+{formatDuration(session.addedMinutes)} extra)</span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  {!session.isUnlimited && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">Cobro total</span>
                      <span className="text-sm font-bold text-emerald-400">{formatCurrency(session.totalPaid)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : isMaintenance ? (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <Settings2 size={28} className="text-amber-400/60" />
                <p className="text-xs text-slate-500">En mantenimiento</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Disponible</p>
                  <p className="text-xs text-slate-600 mt-0.5">{formatCurrency(service.rate)} / {formatDuration(service.unitMinutes)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            {isAvailable && (
              <button onClick={() => setShowStart(true)} className="btn-primary w-full flex items-center justify-center gap-2 py-2">
                <Play size={14} /> Iniciar sesión
              </button>
            )}
            {isOccupied && session && (
              <>
                {!session.isUnlimited && (
                  <button
                    onClick={() => setShowExtend(true)}
                    className="btn-secondary w-full flex items-center justify-center gap-2 py-2 text-sm"
                  >
                    <PlusCircle size={14} /> Añadir tiempo
                  </button>
                )}
                <button
                  onClick={() => setShowComplete(true)}
                  className="btn-success w-full flex items-center justify-center gap-2 py-2 text-sm"
                >
                  <CheckCircle2 size={14} /> Cerrar y cobrar
                </button>
              </>
            )}
            {isAvailable && (
              <button
                onClick={toggleMaintenance}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
              >
                Poner en mantenimiento
              </button>
            )}
            {isMaintenance && (
              <button
                onClick={toggleMaintenance}
                className="btn-secondary w-full text-sm py-2"
              >
                Marcar disponible
              </button>
            )}
          </div>
        </div>
      </div>

      {showStart && (
        <SessionModal service={service} onClose={() => setShowStart(false)} />
      )}
      {showExtend && session && (
        <ExtendModal
          sessionId={session._id}
          serviceName={service.name}
          serviceRate={service.rate}
          serviceUnitMinutes={service.unitMinutes}
          serviceHalfHourRate={service.halfHourRate}
          onClose={() => setShowExtend(false)}
        />
      )}
      {showComplete && session && (
        <CompleteModal
          service={service}
          session={session}
          onClose={() => setShowComplete(false)}
        />
      )}
    </>
  );
}
