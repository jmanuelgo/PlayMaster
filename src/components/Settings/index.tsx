import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Plus, Pencil, Trash2, Save, X, Settings2, Gamepad2, AlertTriangle, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { formatCurrency, formatDuration, serviceTypeIcon } from "../../lib/utils";

type ServiceType = "PS5" | "PS4" | "Futbolín" | "Otro";

const SERVICE_TYPES: ServiceType[] = ["PS5", "PS4", "Futbolín", "Otro"];

const UNIT_PRESETS = [
  { label: "10 min", value: 10 },
  { label: "30 min", value: 30 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 },
];

interface ServiceForm {
  name: string;
  type: ServiceType;
  rate: string;
  halfHourRate: string;
  unitMinutes: string;
}

const emptyForm: ServiceForm = { name: "", type: "PS5", rate: "", halfHourRate: "", unitMinutes: "60" };

function ServiceFormPanel({
  initial,
  onSave,
  onCancel,
  loading,
  error,
}: {
  initial: ServiceForm;
  onSave: (f: ServiceForm) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [form, setForm] = useState<ServiceForm>(initial);

  function set(k: keyof ServiceForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="card p-5 border-violet-500/30 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="sm:col-span-2">
          <label className="label">Nombre del servicio</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej: PlayStation 5 — Consola 3"
            className="input"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="label">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => set("type", t)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  form.type === t
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-violet-500/50"
                }`}
              >
                {serviceTypeIcon(t)} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Unidad de tiempo */}
        <div>
          <label className="label">Unidad de tiempo</label>
          <div className="grid grid-cols-2 gap-2">
            {UNIT_PRESETS.map((u) => (
              <button
                key={u.value}
                onClick={() => set("unitMinutes", String(u.value))}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  form.unitMinutes === String(u.value)
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-[#0a0a14] border-[#2e2e52] text-slate-300 hover:border-violet-500/50"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            value={form.unitMinutes}
            onChange={(e) => set("unitMinutes", e.target.value)}
            className="input mt-2"
            placeholder="Minutos personalizados"
          />
        </div>

        {/* Tarifa */}
        <div className="sm:col-span-2">
          <label className="label">Tarifa (Bs)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.rate}
              onChange={(e) => set("rate", e.target.value)}
              placeholder="0.00"
              className="input"
            />
            <div className="shrink-0 text-sm text-slate-500 bg-[#0a0a14] border border-[#2e2e52] rounded-lg px-3 py-2 whitespace-nowrap">
              por {formatDuration(parseInt(form.unitMinutes) || 60)}
            </div>
          </div>
          {form.rate && form.unitMinutes && (
            <p className="text-xs text-slate-500 mt-1.5">
              Tarifa: {formatCurrency(parseFloat(form.rate))} / {formatDuration(parseInt(form.unitMinutes))}
            </p>
          )}
        </div>

        {/* Tarifa Media Hora */}
        {form.unitMinutes === "60" && (
          <div className="sm:col-span-2">
            <label className="label">Tarifa Media Hora (Opcional) (Bs)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.halfHourRate}
                onChange={(e) => set("halfHourRate", e.target.value)}
                placeholder="Ej: 8"
                className="input"
              />
              <div className="shrink-0 text-sm text-slate-500 bg-[#0a0a14] border border-[#2e2e52] rounded-lg px-3 py-2 whitespace-nowrap">
                por 30m
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Si se define, se cobrará este monto para tiempos de hasta 30 minutos.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="btn-secondary flex items-center gap-1.5">
          <X size={14} /> Cancelar
        </button>
        <button onClick={() => onSave(form)} disabled={loading} className="btn-primary flex items-center gap-1.5">
          <Save size={14} /> {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

interface Service {
  _id: Id<"services">;
  name: string;
  type: string;
  rate: number;
  halfHourRate?: number;
  unitMinutes: number;
  status: string;
}

function ServiceRow({ service }: { service: Service }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateService = useMutation(api.services.update);
  const removeService = useMutation(api.services.remove);

  async function handleSave(form: ServiceForm) {
    const rate = parseFloat(form.rate);
    const unitMinutes = parseInt(form.unitMinutes);
    const halfHourRate = form.halfHourRate ? parseFloat(form.halfHourRate) : undefined;
    if (!form.name.trim()) { setError("El nombre es obligatorio."); return; }
    if (isNaN(rate) || rate <= 0) { setError("La tarifa debe ser mayor a 0."); return; }
    if (isNaN(unitMinutes) || unitMinutes <= 0) { setError("La unidad de tiempo debe ser válida."); return; }

    setLoading(true); setError("");
    try {
      await updateService({
        id: service._id,
        name: form.name.trim(),
        type: form.type,
        rate,
        halfHourRate,
        unitMinutes,
      });
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await removeService({ id: service._id });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  if (editing) {
    return (
      <ServiceFormPanel
        initial={{
          name: service.name,
          type: service.type as ServiceType,
          rate: String(service.rate),
          halfHourRate: service.halfHourRate ? String(service.halfHourRate) : "",
          unitMinutes: String(service.unitMinutes),
        }}
        onSave={handleSave}
        onCancel={() => { setEditing(false); setError(""); }}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="card card-hover p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{serviceTypeIcon(service.type)}</span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-100 truncate">{service.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {service.type} · {formatCurrency(service.rate)} / {formatDuration(service.unitMinutes)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {service.status === "occupied" && (
            <span className="badge-occupied text-xs">En uso</span>
          )}
          {error && (
            <span className="text-red-400 text-xs flex items-center gap-1">
              <AlertTriangle size={12} />{error}
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="p-2 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil size={15} />
          </button>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1">
              <span className="text-xs text-red-400">¿Confirmar?</span>
              <button onClick={handleDelete} disabled={loading} className="text-xs text-red-300 hover:text-red-200 font-semibold">
                Sí
              </button>
              <span className="text-red-600">·</span>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-slate-400 hover:text-slate-200">
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const services = useQuery(api.services.list);
  const createService = useMutation(api.services.create);

  async function handleCreate(form: ServiceForm) {
    const rate = parseFloat(form.rate);
    const unitMinutes = parseInt(form.unitMinutes);
    const halfHourRate = form.halfHourRate ? parseFloat(form.halfHourRate) : undefined;
    if (!form.name.trim()) { setError("El nombre es obligatorio."); return; }
    if (isNaN(rate) || rate <= 0) { setError("La tarifa debe ser mayor a 0."); return; }
    if (isNaN(unitMinutes) || unitMinutes <= 0) { setError("La unidad de tiempo debe ser válida."); return; }

    setLoading(true); setError("");
    try {
      await createService({
        name: form.name.trim(),
        type: form.type,
        rate,
        halfHourRate,
        unitMinutes,
      });
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear el servicio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Settings2 size={18} className="text-violet-400" />
            Configuración de servicios
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona consolas y servicios, tarifas y unidades de tiempo.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(""); }}
          className="btn-primary flex items-center gap-2"
          disabled={showForm}
        >
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>

      {/* New service form */}
      {showForm && (
        <ServiceFormPanel
          initial={emptyForm}
          onSave={handleCreate}
          onCancel={() => { setShowForm(false); setError(""); }}
          loading={loading}
          error={error}
        />
      )}

      {/* Services list */}
      {services === undefined ? (
        <div className="text-center py-16 text-slate-600 text-sm">Cargando...</div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1e1e38] flex items-center justify-center">
            <Gamepad2 size={26} className="text-slate-500" />
          </div>
          <div>
            <p className="text-slate-400 font-medium">Sin servicios registrados</p>
            <p className="text-slate-600 text-sm mt-1">Añade tu primera consola o servicio usando el botón de arriba.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">
            {services.length} servicio{services.length !== 1 ? "s" : ""} registrado{services.length !== 1 ? "s" : ""}
          </p>
          {services.map((s: Service) => (
            <ServiceRow key={s._id} service={s as Service} />
          ))}
        </div>
      )}

      {/* Info section */}
      <div className="card p-5 border-[#1e1e38] bg-[#0a0a14]/60">
        <h4 className="text-sm font-semibold text-slate-400 mb-3">Guía de tarifas</h4>
        <div className="space-y-2 text-xs text-slate-600">
          <p>• <strong className="text-slate-500">Unidad de tiempo:</strong> el intervalo mínimo cobrable. Si es 60 min y el cliente usa 70 min, se cobran 2 unidades.</p>
          <p>• <strong className="text-slate-500">Tarifa:</strong> precio en bolivianos (Bs) por cada unidad de tiempo.</p>
          <p>• Los servicios con sesiones activas no pueden eliminarse.</p>
        </div>
      </div>

      {/* PIN security */}
      <PinSettings />
    </div>
  );
}

// ─── PIN management ───────────────────────────────────────────────────────────

function PinSettings() {
  const pinExists  = useQuery(api.settings.hasPin);
  const changePin  = useMutation(api.settings.changePin);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin]         = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPin.length < 4) { setError("El nuevo PIN debe tener al menos 4 dígitos."); return; }
    if (newPin !== confirmPin) { setError("Los PINs no coinciden."); return; }
    if (pinExists && !currentPin) { setError("Ingresa el PIN actual."); return; }

    setLoading(true);
    try {
      await changePin({
        currentPin: pinExists ? currentPin : undefined,
        newPin,
      });
      setCurrentPin(""); setNewPin(""); setConfirmPin("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cambiar el PIN.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e1e38]">
        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <Lock size={15} className="text-violet-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-200">Seguridad — PIN de administrador</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {pinExists === undefined
              ? "Cargando..."
              : pinExists
              ? "PIN configurado. Se requiere para eliminar ventas."
              : "Sin PIN configurado. Las eliminaciones no estarán protegidas."}
          </p>
        </div>
        {pinExists && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
            <ShieldCheck size={12} /> Activo
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Current PIN — only if one already exists */}
        {pinExists && (
          <div>
            <label className="label">PIN actual</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                inputMode="numeric"
                value={currentPin}
                onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                className="input pr-10"
                placeholder="Ingresa el PIN actual"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* New PIN */}
          <div>
            <label className="label">{pinExists ? "Nuevo PIN" : "PIN (mínimo 4 dígitos)"}</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                inputMode="numeric"
                value={newPin}
                onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                className="input pr-10"
                placeholder="ej: 1234"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm new PIN */}
          <div>
            <label className="label">Confirmar nuevo PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              className={`input ${confirmPin && confirmPin !== newPin ? "border-red-500/50" : confirmPin && confirmPin === newPin ? "border-emerald-500/50" : ""}`}
              placeholder="Repite el PIN"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <ShieldCheck size={14} /> PIN {pinExists ? "actualizado" : "configurado"} correctamente.
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Lock size={14} />
            {loading ? "Guardando..." : pinExists ? "Actualizar PIN" : "Establecer PIN"}
          </button>
        </div>
      </form>
    </div>
  );
}
