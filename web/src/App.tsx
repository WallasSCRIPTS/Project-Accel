import { useCallback, useEffect, useState } from "react";
import {
  ChartLineRegular,
  Dashboard4Regular,
  LayersRegular,
  Layers2Regular,
  MouseRegular,
  Rocket2Regular,
  Search2Regular,
  Settings4Regular,
  ShieldRegular,
} from "@mingcute/react/core-regular";
import { onPush, send, type BackendState } from "./bridge";

interface ProductInfo {
  product: string;
  tagline: string;
  version: string;
}

type BackendStatus = "checking" | "online" | "offline";

const NAV_PRIMARY = [
  { icon: Dashboard4Regular, label: "Painel", active: true, enabled: true },
  { icon: ChartLineRegular, label: "Editor de Curvas", active: false, enabled: false },
  { icon: LayersRegular, label: "Perfis", active: false, enabled: false },
  { icon: MouseRegular, label: "Dispositivos", active: false, enabled: false },
] as const;

const PILLARS = [
  {
    icon: ChartLineRegular,
    tint: "#ffb03a",
    title: "Motor de curvas próprio",
    desc: "Sensibilidade, ganho, naturais, síncronas e tabelas — preview ao vivo em cada ponto do mouse.",
  },
  {
    icon: MouseRegular,
    tint: "#ff6a3a",
    title: "Driver em modo kernel",
    desc: "Upper filter no mouse class com IOCTLs próprios — assinado para release, com delay anti-abuso na aplicação.",
  },
  {
    icon: ShieldRegular,
    tint: "#35e0ff",
    title: "Sem telemetria, sem legado",
    desc: "Nada sai da sua máquina: perfis em texto puro, auditáveis, e um visual limpo de verdade.",
  },
] as const;

export default function App() {
  const [info, setInfo] = useState<ProductInfo | null>(null);
  const [backend, setBackend] = useState<BackendState | null>(null);
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [toast, setToast] = useState<{ title: string; desc?: string } | null>(null);

  const showToast = useCallback((title: string, desc?: string) => {
    setToast({ title, desc });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const pingBackend = useCallback(async () => {
    setStatus("checking");
    try {
      await send<{ pong: boolean }>("ping");
      setStatus("online");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    onPush(setBackend);
    send<ProductInfo>("getProductInfo")
      .then(setInfo)
      .catch(() =>
        setInfo({
          product: "ProjectAccel",
          tagline: "Mouse acceleration, reimagined.",
          version: "0.1.0-dev",
        }),
      );
    pingBackend();
  }, [pingBackend]);

  const openDocs = useCallback(async () => {
    try {
      await send("openProjectDocs");
      showToast("Abrindo o plano do projeto", "docs/PLAN.md no seu editor padrão.");
    } catch (err) {
      showToast(
        "Documento indisponível",
        err instanceof Error ? err.message : "Não foi possível abrir o documento.",
      );
    }
  }, [showToast]);

  const openSearch = useCallback(() => {
    showToast("Busca global", "Chega na Fase 1 — por enquanto, navegue pelo menu ao lado.");
  }, [showToast]);

  const soon = useCallback(
    (label: string) => () => showToast(label, "Em construção — acompanhe as fases do projeto."),
    [showToast],
  );

  const versionLabel = info ? `v${info.version}` : "v…";

  return (
    <div className="app">
      {/* ══════════ SIDEBAR ══════════ */}
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="./logo.png" alt="ProjectAccel" width={38} height={38} />
          <div className="brand-text">
            <span className="brand-name">ProjectAccel</span>
            <span className="brand-chip">{versionLabel}</span>
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

        <footer className="status-card">
          <span className="status-title">Status do sistema</span>
          <div className="status-row">
            <span className={`status-dot status-dot--${status}`} />
            <span>
              {backend?.backend
                ? `Backend: ${backend.backend} (preview)`
                : status === "checking"
                  ? "Backend: verificando…"
                  : status === "online"
                    ? "Backend: online"
                    : "Backend: offline"}
            </span>
          </div>
          <div className="status-row">
            <span className="status-dot status-dot--pending" />
            <span>{backend?.driver ? `Driver: ${backend.driver}` : "Driver: não detectado"}</span>
          </div>
        </footer>
      </aside>

      {/* ══════════ CONTEÚDO ══════════ */}
      <main className="content">
        <div className="content-inner">
          {/* hero */}
          <section className="hero">
            <img className="hero-cover" src="./appicon.png" alt="ProjectAccel" width={168} height={168} />
            <div className="hero-main">
              <span className="hero-kicker">ProjectAccel · Aceleração em nível de kernel</span>
              <h1 className="hero-title">ProjectAccel</h1>
              <p className="hero-sub">Mouse acceleration, reimagined.</p>
              <div className="chips">
                <span className="chip">{versionLabel} · pré-lançamento</span>
                <span className="chip">Windows 10/11 · x64</span>
                <span className="chip">MIT</span>
              </div>
              <div className="actions">
                <button className="button-primary" onClick={pingBackend} disabled={status === "checking"}>
                  <Rocket2Regular width={17} height={17} />
                  {status === "checking" ? "Verificando…" : "Verificar backend"}
                </button>
                <button className="button-glass" onClick={openDocs}>
                  Sobre o projeto
                </button>
              </div>
            </div>
          </section>

          {/* pilares */}
          <section className="panel" aria-label="Pilares do produto">
            <span className="panel-kicker">Por que ProjectAccel</span>
            {PILLARS.map(({ icon: Icon, tint, title, desc }) => (
              <div key={title} className="panel-row">
                <div className="row-icon">
                  <Icon width={20} height={20} style={{ color: tint }} />
                </div>
                <div>
                  <div className="row-title">{title}</div>
                  <div className="row-desc">{desc}</div>
                </div>
              </div>
            ))}
          </section>

          <p className="content-footer">
            ProjectAccel · Fase 0 — nenhum dado sai da sua máquina. Driver próprio em desenvolvimento.
          </p>
        </div>
      </main>

      {/* toast estilo player */}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-title">{toast.title}</span>
          {toast.desc && <span className="toast-desc">{toast.desc}</span>}
        </div>
      )}
    </div>
  );
}
