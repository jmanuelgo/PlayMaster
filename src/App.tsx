import { useState } from "react";
import { Navigation } from "./components/Navigation";
import { ControlBar } from "./components/ControlBar";
import { Dashboard } from "./components/Dashboard";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { Store } from "./components/Store";

type View = "dashboard" | "tienda" | "reports" | "settings";

export default function App() {
  const [activeView, setActiveView] = useState<View>("dashboard");

  return (
    <div className="min-h-screen bg-[#080810] text-slate-200">
      {/* Top navigation bar (desktop) */}
      <Navigation active={activeView} onChange={setActiveView} />

      {/* Spacer for top nav on desktop */}
      <div className="hidden sm:block h-[52px]" />

      {/* Dashboard stats bar — only shown in dashboard view */}
      {activeView === "dashboard" && <ControlBar />}

      {/* Main content */}
      <main className="pb-24 sm:pb-0 min-h-[calc(100vh-52px)]">
        {activeView === "dashboard" && <Dashboard />}
        {activeView === "tienda" && <Store />}
        {activeView === "reports" && <Reports onCancel={() => setActiveView("dashboard")} />}
        {activeView === "settings" && <Settings />}
      </main>

      {/* Bottom navigation spacer (mobile) */}
      <div className="sm:hidden h-16" />
    </div>
  );
}
