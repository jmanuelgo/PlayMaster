import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, User } from "lucide-react";

interface Props {
  serviceId: Id<"services">;
  serviceName: string;
  onClose: () => void;
}

export function ReserveModal({ serviceId, serviceName, onClose }: Props) {
  const [clientName, setClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reserve = useMutation(api.services.reserve);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;

    try {
      setIsSubmitting(true);
      await reserve({ id: serviceId, clientName: clientName.trim() });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12121a] border border-[#1e1e38] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#1e1e38] bg-[#1a1a2e]/50">
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Añadir a lista de espera</h3>
            <p className="text-sm text-slate-500">{serviceName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Nombre del cliente</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User size={16} />
              </div>
              <input
                type="text"
                autoFocus
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej. Carlos"
                className="input-field pl-9 text-black"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !clientName.trim()}
              className="btn-primary w-full py-2.5"
            >
              {isSubmitting ? "Guardando..." : "Confirmar reserva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
