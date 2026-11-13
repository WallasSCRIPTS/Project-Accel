import { useCallback, useEffect, useState } from "react";
import {
  ChartLineRegular,
  Layers2Regular,
  LayersRegular,
  MouseRegular,
  Search2Regular,
  Settings4Regular,
} from "@mingcute/react/core-regular";
import { onPush, send, type BackendState } from "./bridge";
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

  const showToast = useCallback((title: string, desc?: string) => {
    setToast({ title, desc });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => {
    onPush<BackendState>(() => {
      /* reservado: estado do backend volta quando o driver existir (Fase 2) */
    });
    send<{ product: string; version: string }>("getProductInfo")
      .then(setInfo)
      .catch(() => setInfo({ product: "ProjectAccel", version: "0.1.0-dev" }));
  }, []);

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
    <div className="app">
      <TitleBar />

      <div className="app-body">
        {/* ══════════ SIDEBAR ══════════ */}
        <aside className="sidebar">
          <div className="brand">
            <img className="brand-mark" src="./logo.png" alt="ProjectAccel" width={56} height={56} />
            <div className="brand-text">
              <span className="brand-name">ProjectAccel</span>
              <span className="brand-chip">{info ? `v${info.version}` : "v…"}</span>
            </div>
          </div>

          <button className="search" onClick={openSearch} aria-label="Abrir busca (Ctrl K)">
            <Search2Regular width={16} height={16} />
            <span>Buscar…</span>
            <kbd>Ctrl K</kbd>
          </button>

          <nav className="nav" aria-label="Navegação principal">
            <span className="nav-kicker">Aplicativo</span>
            {NAV_PRIMARY.map(({ icon: Icon, label, active, enabled }) =>
              enabled ? (
                <button key={label} className={active ? "nav-item nav-item--active" : "nav-item"} aria-current="page">
                  <Icon width={19} height={19} />
                  <span>{label}</span>
                </button>
              ) : (
                <button key={label} className="nav-item" onClick={soon(label)}>
                  <Icon width={19} height={19} />
                  <span>{label}</span>
                  <span className="nav-soon">breve</span>
                </button>
              ),
            )}

            <span className="nav-kicker">Sistema</span>
            <button className="nav-item" onClick={soon("Ajustes")}>
              <Settings4Regular width={19} height={19} />
              <span>Ajustes</span>
              <span className="nav-soon">breve</span>
            </button>
            <button className="nav-item" onClick={openDocs}>
              <Layers2Regular width={19} height={19} />
              <span>Sobre o projeto</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <span className="sidebar-footnote">ProjectAccel · Fase 1</span>
          </div>
        </aside>

        {/* ══════════ CONTEÚDO ══════════ */}
        <main className="content">
          <EditorPage showToast={showToast} />
        </main>
      </div>

      {/* toast */}
      {toast && (
        <div className="toast" role="status">
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
