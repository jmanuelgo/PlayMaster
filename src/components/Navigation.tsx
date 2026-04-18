import { LayoutGrid, BarChart2, Settings2, ShoppingBag } from "lucide-react";
import { cn } from "../lib/utils";

type View = "dashboard" | "tienda" | "reports" | "settings";

interface Props {
  active: View;
  onChange: (v: View) => void;
}

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Panel", icon: <LayoutGrid size={17} /> },
  { id: "tienda", label: "Tienda", icon: <ShoppingBag size={17} /> },
  { id: "reports", label: "Reportes", icon: <BarChart2 size={17} /> },
  { id: "settings", label: "Configuración", icon: <Settings2 size={17} /> },
];

export function Navigation({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 sm:bottom-auto sm:top-0 left-0 right-0 z-50 bg-[#0a0a14]/95 backdrop-blur-md border-t sm:border-t-0 sm:border-b border-[#1e1e38]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-around sm:justify-start sm:gap-1 py-2">
          {/* Logo (desktop only) */}
          <div className="hidden sm:flex items-center gap-2.5 mr-6 pr-6 border-r border-[#1e1e38]">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-base leading-none">🎮</div>
            <div>
              <p className="font-bold text-white text-sm leading-none">PlayControl</p>
              <p className="text-[10px] text-slate-600 leading-none mt-0.5">v1.0</p>
            </div>
          </div>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150",
                active === item.id
                  ? "bg-violet-600 text-white"
                  : "text-slate-500 hover:text-slate-200 hover:bg-[#1e1e38]"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
