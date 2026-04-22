import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return `Bs ${amount.toFixed(2)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(timestamp: number): string {
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
}

export function calcCost(minutes: number, rate: number, unitMinutes: number, halfHourRate?: number): number {
  if (halfHourRate !== undefined && unitMinutes === 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    
    let extraCost = 0;
    if (remainder > 0) {
      if (remainder <= 30) {
        extraCost = halfHourRate;
      } else {
        extraCost = rate;
      }
    }
    
    return hours * rate + extraCost;
  }

  const units = Math.ceil(minutes / unitMinutes);
  return units * rate;
}

export function calcUnlimitedCost(minutes: number, rate: number, unitMinutes: number, halfHourRate?: number): number {
  if (unitMinutes !== 60) {
    const units = Math.ceil(minutes / unitMinutes);
    return units * rate;
  }

  if (minutes === 0) return 0;
  
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  
  let totalCost = hours * rate;

  if (remainder <= 5) {
    totalCost += 0;
  } else if (remainder >= 6 && remainder <= 19) {
    totalCost += rate * (remainder / 60);
  } else if (remainder >= 20 && remainder <= 49) {
    totalCost += halfHourRate ?? (rate * 0.5);
  } else {
    totalCost += rate;
  }

  return totalCost;
}

export function getProgressColor(pct: number): string {
  if (pct > 50) return "bg-emerald-500";
  if (pct > 20) return "bg-amber-500";
  return "bg-red-500";
}

export function serviceTypeColor(type: string): string {
  switch (type) {
    case "PS5": return "from-blue-700 to-blue-500";
    case "PS4": return "from-indigo-700 to-indigo-500";
    case "Futbolín": return "from-emerald-700 to-emerald-500";
    default: return "from-slate-700 to-slate-500";
  }
}

export function serviceTypeIcon(type: string): string {
  switch (type) {
    case "PS5": return "🎮";
    case "PS4": return "🕹️";
    case "Futbolín": return "⚽";
    default: return "🎲";
  }
}

export function todayISODate(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
}

export function nDaysAgoISODate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
}
