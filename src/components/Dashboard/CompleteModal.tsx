import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, Clock, DollarSign, Zap } from "lucide-react";
import { formatCurrency, formatDuration, calcUnlimitedCost } from "../../lib/utils";

interface Service {
  name: string;
  type: string;
  rate: number;
  halfHourRate?: number;
  unitMinutes: number;
}

interface Session {
  _id: Id<"sessions">;
  startTime: number;
  totalMinutes: number;
  totalPaid: number;
  addedMinutes: number;
  isUnlimited?: boolean;
}

interface Props {
  service: Service;
  session: Session;
  onClose: () => void;
}

export function CompleteModal({ service, session, onClose }: Props) {
  const [minutes, setMinutes] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "Efectivo">("Efectivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const completeSession = useMutation(api.sessions.complete);

  useEffect(() => {
    let elapsedMinutes = 0;
    if (session.isUnlimited) {
      const ms = Date.now() - session.startTime;
      elapsedMinutes = Math.floor(ms / 60000);
    } else {
      elapsedMinutes = session.totalMinutes;
    }
    
    // Fallback if less than 0 somehow
    if (elapsedMinutes < 0) elapsedMinutes = 0;

    setMinutes(elapsedMinutes);

    if (session.isUnlimited) {
      setCost(calcUnlimitedCost(elapsedMinutes, service.rate, service.unitMinutes, service.halfHourRate));
    } else {
      setCost(session.totalPaid);
    }
  }, [session, service]);

  async function handleComplete() {
    if (minutes < 0 || cost < 0) {
      setError("Valores inválidos.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await completeSession({
        sessionId: session._id,
        finalMinutes: minutes,
        finalPaid: cost,
        paymentMethod,
        localDate: new Date().toLocaleDateString("sv-SE"),
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al finalizar la sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="modal-content card w-full max-w-md shadow-2xl shadow-black/60 flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between p-5 border-b border-[#1e1e38] shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Finalizar Sesión</h2>
            <p className="text-sm text-slate-400 mt-0.5">{service.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="bg-[#0a0a14] border border-[#2e2e52] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-amber-400" />
              <span className="text-sm font-semibold text-slate-300">Resumen {session.isUnlimited ? "Automático" : "de Sesión"}</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tiempo Total (minutos)</label>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-500" />
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value) || 0)}
                    className="bg-transparent border-b border-slate-700 focus:border-violet-500 text-white w-full px-1 py-1 outline-none"
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1">({formatDuration(minutes)})</div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Monto a Cobrar</label>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500" />
                  <input
                    type="number"
                    step="0.1"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value) || 0)}
                    className="bg-transparent border-b border-slate-700 focus:border-emerald-500 text-emerald-400 font-bold w-full px-1 py-1 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <DollarSign size={13} /> Método de Pago
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod("QR")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                  paymentMethod === "QR"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-emerald-500/50"
                }`}
              >
                QR
              </button>
              <button
                onClick={() => setPaymentMethod("Efectivo")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                  paymentMethod === "Efectivo"
                    ? "bg-amber-600 border-amber-500 text-white"
                    : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-amber-500/50"
                }`}
              >
                Efectivo
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-[#1e1e38] shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="btn-success flex-1"
          >
            {loading ? "Cobrando..." : `Cobrar ${formatCurrency(cost)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
