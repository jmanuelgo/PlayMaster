import { useState, useEffect, useRef } from "react";
import { X, Lock, Delete } from "lucide-react";
import { cn } from "../../lib/utils";

interface Props {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: (pin: string) => Promise<void>;
  onCancel: () => void;
}

const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
const MAX = 6;

export function PinModal({ title, description, confirmLabel = "Confirmar", onConfirm, onCancel }: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleKey(k: string) {
    setError("");
    if (k === "⌫") {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < MAX && k !== "") {
      setPin((p) => p + k);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); handleKey(e.key); }
      else if (e.key === "Backspace") { e.preventDefault(); handleKey("⌫"); }
      else if (e.key === "Enter" && pin.length >= 4) void submit();
      else if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submit() {
    if (pin.length < 4) { setError("El PIN debe tener al menos 4 dígitos."); return; }
    setLoading(true);
    setError("");
    try {
      await onConfirm(pin);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al verificar el PIN.";
      setError(msg);
      setPin("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={cn("modal-content card w-full max-w-xs shadow-2xl shadow-black/70 flex flex-col max-h-[90vh]", shake && "animate-[shake_0.4s_ease-in-out]")}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e1e38] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Lock size={16} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
              {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* PIN dots display */}
          <div className="flex justify-center gap-3">
            {Array.from({ length: MAX }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-150",
                  i < pin.length
                    ? "bg-violet-600 border-violet-500 scale-105"
                    : "bg-[#0a0a14] border-[#2e2e52]"
                )}
              >
                {i < pin.length && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-2">
            {PAD.map((k, i) => (
              k === "" ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  onClick={() => handleKey(k)}
                  disabled={loading}
                  className={cn(
                    "h-12 rounded-xl font-semibold text-lg transition-all duration-100 active:scale-95",
                    k === "⌫"
                      ? "bg-[#1e1e38] text-slate-400 hover:bg-[#2e2e52] hover:text-white flex items-center justify-center"
                      : "bg-[#1a1a2e] text-slate-200 hover:bg-violet-600/30 hover:text-white border border-[#2e2e52] hover:border-violet-500/40"
                  )}
                >
                  {k === "⌫" ? <Delete size={18} /> : k}
                </button>
              )
            ))}
          </div>

          {/* Hidden input for mobile keyboard */}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, MAX);
              setPin(v);
              setError("");
            }}
            className="sr-only"
            tabIndex={-1}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 shrink-0">
          <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={loading || pin.length < 4}
            className="btn-primary flex-1"
          >
            {loading ? "Verificando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
