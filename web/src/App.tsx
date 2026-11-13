import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChartLineRegular,
  Layers2Regular,
  LayersRegular,
  MouseRegular,
  Search2Regular,
  Settings4Regular,
} from "@mingcute/react/core-regular";
import { onPush, send, type BackendState } from "./bridge";
import { installRipples } from "./ripple";
import { TitleBar } from "./components/TitleBar";
import { EditorPage } from "./components/EditorPage";

const NAV_PRIMARY = [
  { icon: ChartLineRegular, label: "Editor de Curvas", active: true, enabled: true },
  { icon: LayersRegular, label: "Perfis", active: false, enabled: false },
  { icon: MouseRegular, label: "Dispositivos", active: false, enabled: false },
] as const;

export default function App() {
  const [info, setInfo] = useState<{ product: string; version: string } | null>(null);
  const [toast, setToast] = useState<{ title: string; desc?: string } | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [collapsed, setCollapsed] = useState(() => true);
  const [closing, setClosing] = useState(false);
  const [windowPulse, setWindowPulse] = useState(false);
  const prevMaximized = useRef<boolean | null>(null);

  const showToast = useCallback((title: string, desc?: string) => {
    setToastLeaving(false);
    setToast({ title, desc });
  }, []);

  // ciclo do toast: 3.8s → anima saída → 4.0s → remove
  useEffect(() => {
    if (!toast) return;
    const leave = window.setTimeout(() => setToastLeaving(true), 3800);
    const drop = window.setTimeout(() => {
      setToast(null);
      setToastLeaving(false);
    }, 4000);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(drop);
    };
  }, [toast]);

  useEffect(() => {
    const offRipples = installRipples();

    onPush<BackendState>(() => {
      /* reservado à fase 2 (driver) */
    });
    onPush<{ maximized?: boolean }>((p) => {
      if (typeof p?.maximized !== "boolean") return;
      // pulso sutil no conteúdo quando alterna maximizar/restaurar (mascara o snap nativo)
      if (prevMaximized.current !== null && prevMaximized.current !== p.maximized) {
        setWindowPulse(true);
        window.setTimeout(() => setWindowPulse(false), 280);
      }
      prevMaximized.current = p.maximized;
    });

    send<{ product: string; version: string }>("getProductInfo")
      .then(setInfo)
      .catch(() => setInfo({ product: "ProjectAccel", version: "0.1.0-dev" }));

    return offRipples;
  }, []);

  useEffect(() => {
    localStorage.setItem("pa-sidebar", collapsed ? "1" : "0");
  }, [collapsed]);

  const requestClose = useCallback(() => {
    setClosing(true); // .app-exit → fade + scale, depois fecha de verdade
    window.setTimeout(() => send("windowClose").catch(() => window.close()), 170);
  }, []);

  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), []);

  const openDocs = useCallback(async () => {
    try {
      await send("openProjectDocs");
      showToast("Abrindo o plano do projeto", "docs/PLAN.md no seu editor padrão.");
    } catch (err) {
      showToast("Documento indisponível", err instanceof Error ? err.message : "Não foi possível abrir o documento.");
    }
  }, [showToast]);

  const soon = useCallback(
    (label: string) => () => showToast(label, "Em construção — as fases estão descritas no PLAN.md."),
    [showToast],
  );

  const openSearch = useCallback(() => {
    showToast("Busca global", "Chega na Fase 1 — por enquanto, navegue pelo menu ao lado.");
  }, [showToast]);

  return (
    <div className={closing ? "app app--closing" : "app"}>
      <div className={["app-body", collapsed && "app-body--collapsed", windowPulse && "app-body--pulse"].filter(Boolean).join(" ")}>
        {/* ══════════ SIDEBAR (topo ao fim da janela) ══════════ */}
        <aside className="sidebar" aria-label="Barra lateral">
          <div className="brand-row">
            <div className="brand">
              <img className="brand-mark" src="./logo.png" alt="ProjectAccel" width={54} height={54} />
              <div className="brand-text">
                <span className="brand-name">ProjectAccel</span>
                <span className="brand-chip">{info ? `v${info.version}` : "v…"}</span>
              </div>
            </div>
            <button
              className="collapse-btn"
              onClick={toggleSidebar}
              data-tip={collapsed ? "Expandir" : "Recolher"}
              aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            >
              <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" className="collapse-chevron">
                <path d="M9 2.5 4.5 7 9 11.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <button className="search" onClick={openSearch} aria-label="Abrir busca (Ctrl K)" title={collapsed ? "Buscar" : undefined}>
            <Search2Regular width={16} height={16} />
            <span>Buscar…</span>
            <kbd>Ctrl K</kbd>
          </button>

          <nav className="nav" aria-label="Navegação principal">
            <span className="nav-kicker">Aplicativo</span>
            {NAV_PRIMARY.map(({ icon: Icon, label, active, enabled }) =>
              enabled ? (
                <button key={label} className={active ? "nav-item nav-item--active" : "nav-item"} aria-current="page" title={collapsed ? label : undefined}>
                  <Icon width={19} height={19} />
                  <span className="nav-label">{label}</span>
                </button>
              ) : (
                <button key={label} className="nav-item" onClick={soon(label)} title={collapsed ? label : undefined}>
                  <Icon width={19} height={19} />
                  <span className="nav-label">{label}</span>
                  <span className="nav-soon">breve</span>
                </button>
              ),
            )}

            <span className="nav-kicker">Sistema</span>
            <button className="nav-item" onClick={soon("Ajustes")} title={collapsed ? "Ajustes" : undefined}>
              <Settings4Regular width={19} height={19} />
              <span className="nav-label">Ajustes</span>
              <span className="nav-soon">breve</span>
            </button>
            <button className="nav-item" onClick={openDocs} title={collapsed ? "Sobre o projeto" : undefined}>
              <Layers2Regular width={19} height={19} />
              <span className="nav-label">Sobre o projeto</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <span className="sidebar-footnote">ProjectAccel · Fase 1</span>
          </div>
        </aside>

        {/* ══════════ COLUNA DA DIREITA: titlebar + conteúdo ══════════ */}
        <div className="main-col">
          <TitleBar onCloseRequest={requestClose} />
          <main className="content">
            <EditorPage showToast={showToast} />
          </main>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div className={toastLeaving ? "toast toast--leaving" : "toast"} role="status">
          <span className="toast-dot" />
          <span className="toast-body">
            <span className="toast-title">{toast.title}</span>
            {toast.desc && <span className="toast-desc">{toast.desc}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
