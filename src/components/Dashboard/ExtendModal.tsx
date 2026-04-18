import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, PlusCircle } from "lucide-react";
import { calcCost, formatCurrency, formatDuration } from "../../lib/utils";

interface Props {
  sessionId: Id<"sessions">;
  serviceName: string;
  serviceRate: number;
  serviceUnitMinutes: number;
  serviceHalfHourRate?: number;
  onClose: () => void;
}

const QUICK_ADDS = [
  { label: "+15 min", minutes: 15 },
  { label: "+30 min", minutes: 30 },
  { label: "+1 hora", minutes: 60 },
  { label: "+2 horas", minutes: 120 },
];

export function ExtendModal({ sessionId, serviceName, serviceRate, serviceUnitMinutes, serviceHalfHourRate, onClose }: Props) {
  const [addMinutes, setAddMinutes] = useState<number>(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "Efectivo" | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const extendSession = useMutation(api.sessions.extend);

  const minutes = useCustom ? parseInt(customMinutes) || 0 : addMinutes;
  const extraCost = minutes > 0 ? calcCost(minutes, serviceRate, serviceUnitMinutes, serviceHalfHourRate) : 0;

  async function handleExtend() {
    if (minutes <= 0) {
      setError("Selecciona un tiempo válido.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await extendSession({
        sessionId,
        additionalMinutes: minutes,
        additionalPaid: extraCost,
        paymentMethod,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al extender la sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="modal-content card w-full max-w-sm shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between p-5 border-b border-[#1e1e38]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle size={18} className="text-violet-400" />
              Añadir tiempo
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{serviceName}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Tiempo adicional</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {QUICK_ADDS.map((q) => (
                <button
                  key={q.minutes}
                  onClick={() => { setAddMinutes(q.minutes); setUseCustom(false); }}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                    !useCustom && addMinutes === q.minutes
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-violet-500/50"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setUseCustom(true)}
              className={`w-full py-2 rounded-lg text-sm font-medium border transition-all mb-2 ${
                useCustom
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-violet-500/50"
              }`}
            >
              Personalizado
            </button>
            {useCustom && (
              <input
                type="number"
                min="1"
                placeholder="Minutos a añadir"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="input"
                autoFocus
              />
            )}
          </div>

          <div>
            <label className="label">Método de Pago (Opcional)</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod(paymentMethod === "QR" ? undefined : "QR")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                  paymentMethod === "QR"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-emerald-500/50"
                }`}
              >
                QR
              </button>
              <button
                onClick={() => setPaymentMethod(paymentMethod === "Efectivo" ? undefined : "Efectivo")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                  paymentMethod === "Efectivo"
                    ? "bg-amber-600 border-amber-500 text-white"
                    : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-amber-500/50"
                }`}
              >
                Efectivo
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Si no seleccionas ninguno, se usará el del inicio de la sesión.</p>
          </div>

          {minutes > 0 && (
            <div className="bg-[#0a0a14] border border-[#2e2e52] rounded-xl p-4">
              <div className="flex justify-between text-sm text-slate-400 mb-1">
                <span>Tiempo adicional</span>
                <span className="text-slate-200">{formatDuration(minutes)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">Cobro adicional</span>
                <span className="text-emerald-400 text-base">{formatCurrency(extraCost)}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-[#1e1e38]">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleExtend}
            disabled={loading || minutes <= 0}
            className="btn-primary flex-1"
          >
            {loading ? "Aplicando..." : `+${formatCurrency(extraCost)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
