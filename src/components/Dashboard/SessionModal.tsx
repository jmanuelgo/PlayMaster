import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, Clock, DollarSign, User, Zap } from "lucide-react";
import { calcCost, formatCurrency, formatDuration } from "../../lib/utils";

interface Service {
  _id: Id<"services">;
  name: string;
  type: string;
  rate: number;
  halfHourRate?: number;
  unitMinutes: number;
}

interface Props {
  service: Service;
  onClose: () => void;
}

const QUICK_TIMES = [
  { label: "30 min", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "1:30 h", minutes: 90 },
  { label: "2 horas", minutes: 120 },
  { label: "3 horas", minutes: 180 },
];

export function SessionModal({ service, onClose }: Props) {
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(60);
  const [customMinutes, setCustomMinutes] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "Efectivo">("QR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startSession = useMutation(api.sessions.start);

  const minutes = useCustom ? parseInt(customMinutes) || 0 : (selectedMinutes ?? 0);
  const cost = minutes > 0 ? calcCost(minutes, service.rate, service.unitMinutes, service.halfHourRate) : 0;

  async function handleStart() {
    if (minutes <= 0) {
      setError("Selecciona un tiempo válido.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await startSession({
        serviceId: service._id,
        totalMinutes: minutes,
        totalPaid: cost,
        clientName: clientName.trim() || undefined,
        paymentMethod,
        clientNow: Date.now(),
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al iniciar la sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="modal-content card w-full max-w-md shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#1e1e38]">
          <div>
            <h2 className="text-lg font-bold text-white">Iniciar sesión</h2>
            <p className="text-sm text-slate-400 mt-0.5">{service.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Tarifa info */}
          <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
            <DollarSign size={16} className="text-violet-400 shrink-0" />
            <span className="text-sm text-violet-300">
              Tarifa: <strong className="text-violet-200">{formatCurrency(service.rate)}</strong>
              {" "}por{" "}
              <strong className="text-violet-200">{formatDuration(service.unitMinutes)}</strong>
            </span>
          </div>

          {/* Tiempo rápido */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Clock size={13} /> Tiempo de uso
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {QUICK_TIMES.map((qt) => (
                <button
                  key={qt.minutes}
                  onClick={() => { setSelectedMinutes(qt.minutes); setUseCustom(false); }}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                    !useCustom && selectedMinutes === qt.minutes
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-violet-500/50"
                  }`}
                >
                  {qt.label}
                </button>
              ))}
              <button
                onClick={() => { setUseCustom(true); setSelectedMinutes(null); }}
                className={`py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                  useCustom
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-violet-500/50"
                }`}
              >
                Personalizado
              </button>
            </div>

            {useCustom && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="600"
                  placeholder="Minutos"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="input"
                  autoFocus
                />
                <span className="text-slate-400 text-sm shrink-0">min</span>
              </div>
            )}
          </div>

          {/* Cliente (opcional) */}
          <div>
            <label className="label flex items-center gap-1.5">
              <User size={13} /> Cliente (opcional)
            </label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="input"
            />
          </div>

          {/* Método de Pago */}
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

          {/* Resumen de cobro */}
          {minutes > 0 && (
            <div className="bg-[#0a0a14] border border-[#2e2e52] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-amber-400" />
                <span className="text-sm font-semibold text-slate-300">Resumen</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Tiempo solicitado</span>
                  <span className="text-slate-200">{formatDuration(minutes)}</span>
                </div>
                {service.halfHourRate && service.unitMinutes === 60 ? (
                  <div className="flex justify-between text-slate-400">
                    <span>Cálculo especial</span>
                    <span className="text-slate-200">1/2h = {service.halfHourRate}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-400">
                    <span>Unidades cobradas</span>
                    <span className="text-slate-200">{Math.ceil(minutes / service.unitMinutes)}</span>
                  </div>
                )}
                <div className="border-t border-[#2e2e52] pt-2 flex justify-between font-bold">
                  <span className="text-slate-300">Total a cobrar</span>
                  <span className="text-emerald-400 text-base">{formatCurrency(cost)}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-[#1e1e38]">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleStart}
            disabled={loading || minutes <= 0}
            className="btn-primary flex-1"
          >
            {loading ? "Iniciando..." : `Confirmar — ${formatCurrency(cost)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
