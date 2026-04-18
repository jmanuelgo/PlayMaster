import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import { serviceTypeIcon } from "../../lib/utils";

interface ExpiredSession {
  _id: Id<"sessions">;
  serviceId: Id<"services">;
  totalPaid: number;
}

interface ServiceMap {
  [id: string]: { name: string; type: string };
}

interface Props {
  expiredSessions: ExpiredSession[];
  servicesMap: ServiceMap;
}

export function AlertOverlay({ expiredSessions, servicesMap }: Props) {
  const { startLoop, stopLoop } = useAudio();
  const audioStarted = useRef(false);
  const completeSession = useMutation(api.sessions.complete);

  const count = expiredSessions.length;

  useEffect(() => {
    if (count > 0 && !audioStarted.current) {
      audioStarted.current = true;
      startLoop();
    }
    if (count === 0) {
      stopLoop();
      audioStarted.current = false;
    }
  }, [count, startLoop, stopLoop]);

  if (count === 0) return null;

  async function handleClose(sessionId: Id<"sessions">) {
    await completeSession({ sessionId });
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full animate-slide-in">
      {/* Header bar */}
      <div className="flex items-center gap-3 bg-red-600 text-white rounded-xl px-4 py-3 shadow-xl ring-pulse">
        <BellRing size={20} className="animate-bounce shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">
            {count === 1 ? "1 sesión expirada" : `${count} sesiones expiradas`}
          </p>
          <p className="text-red-200 text-xs">Cierra cada sesión para liberar el servicio</p>
        </div>
      </div>

      {/* Cards por sesión expirada */}
      {expiredSessions.map((session) => {
        const svc = servicesMap[session.serviceId];
        if (!svc) return null;
        return (
          <div
            key={session._id}
            className="bg-[#1a0808] border-2 border-red-500/60 rounded-xl p-4 shadow-xl flex items-center gap-3"
          >
            <span className="text-2xl">{serviceTypeIcon(svc.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{svc.name}</p>
              <p className="text-red-300 text-xs font-medium">Tiempo agotado — pendiente de cobro</p>
            </div>
            <button
              onClick={() => handleClose(session._id)}
              title="Confirmar cobro y cerrar sesión"
              className="shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle2 size={14} />
              Cobrar
            </button>
          </div>
        );
      })}
    </div>
  );
}
