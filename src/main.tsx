import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  document.getElementById("root")!.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#080810;color:#e2e8f0;font-family:system-ui;gap:1rem;padding:2rem;text-align:center;">
      <div style="font-size:3rem;">🎮</div>
      <h1 style="font-size:1.5rem;font-weight:700;color:#8b5cf6;">PlayControl</h1>
      <p style="color:#94a3b8;max-width:480px;">
        Falta configurar Convex. Ejecuta <code style="background:#1e1e38;padding:2px 8px;border-radius:4px;color:#a78bfa">npx convex dev</code>
        en la terminal para inicializar el backend y obtener tu <strong>VITE_CONVEX_URL</strong>.
      </p>
      <div style="background:#11111e;border:1px solid #1e1e38;border-radius:12px;padding:1.5rem;max-width:480px;text-align:left;margin-top:0.5rem;">
        <p style="color:#64748b;font-size:0.8rem;margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Pasos de configuración</p>
        <ol style="color:#cbd5e1;font-size:0.9rem;line-height:2;padding-left:1.25rem;">
          <li>Instalar dependencias: <code style="color:#a78bfa">npm install</code></li>
          <li>Inicializar Convex: <code style="color:#a78bfa">npx convex dev</code></li>
          <li>Iniciar la app: <code style="color:#a78bfa">npm run dev</code></li>
        </ol>
      </div>
    </div>
  `;
} else {
  const convex = new ConvexReactClient(convexUrl);
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </React.StrictMode>
  );
}
