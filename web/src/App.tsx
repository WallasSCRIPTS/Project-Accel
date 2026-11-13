import { useCallback, useEffect, useRef, useState } from "react";
import { ChartLineRegular, Layers2Regular, MouseRegular, Search2Regular, Settings4Regular } from "@mingcute/react/core-regular";
import { onPush, send, type BackendState } from "./bridge";
import { installRipples } from "./ripple";
import { TitleBar } from "./components/TitleBar";
import { EditorPage } from "./components/EditorPage";
import { DevicesPage } from "./components/DevicesPage";
import { SettingsPage, type ThemePreference } from "./components/SettingsPage";
import { DEFAULT_PARAMS, type CurveParams, type Mode } from "./curves";
import { translate, type Language } from "./translations";

type Page = "editor" | "devices" | "settings";
const PARAMS_KEY = "pa-curve-params";

function legacyProfile(): { mode?: Mode; params?: Partial<CurveParams> } | null {
  try {
    const profiles = JSON.parse(localStorage.getItem("pa-profiles") ?? "[]") as Array<{ id: string; mode: Mode; params: Partial<CurveParams> }>;
    const selected = profiles.find((profile) => profile.id === localStorage.getItem("pa-active-profile")) ?? profiles[0];
    return selected ?? null;
  } catch { return null; }
}

function loadParams(): CurveParams {
  try {
    const parsed = JSON.parse(localStorage.getItem(PARAMS_KEY) ?? "null") as Partial<CurveParams> | null;
    const source = parsed ?? legacyProfile()?.params;
    if (!source) return DEFAULT_PARAMS;
    return { ...DEFAULT_PARAMS, ...source, lut: Array.isArray(source.lut) ? source.lut : DEFAULT_PARAMS.lut.map((point) => ({ ...point })) };
  } catch { return DEFAULT_PARAMS; }
}

export default function App() {
  const [info, setInfo] = useState<{ product: string; version: string } | null>(null);
  const [toast, setToast] = useState<{ title: string; desc?: string } | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("pa-sidebar") !== "0");
  const [closing, setClosing] = useState(false);
  const [windowPulse, setWindowPulse] = useState(false);
  const prevMaximized = useRef<boolean | null>(null);
  const [page, setPage] = useState<Page>("editor");
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem("pa-curve-mode") as Mode | null) ?? legacyProfile()?.mode ?? "classic");
  const [params, setParams] = useState<CurveParams>(loadParams);
  const [angleSnapping, setAngleSnapping] = useState(() => localStorage.getItem("pa-angle-snapping") === "1");
  const [angleSnapStrength, setAngleSnapStrength] = useState(() => Math.min(10, Math.max(1, Number(localStorage.getItem("pa-angle-snap-strength") ?? 1))));
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("pa-language") as Language | null) ?? "pt");
  const [theme, setTheme] = useState<ThemePreference>(() => (localStorage.getItem("pa-theme") as ThemePreference | null) ?? "system");
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("pa-reduced-motion") === "1");
  const t = useCallback((key: string) => translate(language, key), [language]);

  const showToast = useCallback((title: string, desc?: string) => {
    setToastLeaving(false);
    setToast({ title, desc });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const leave = window.setTimeout(() => setToastLeaving(true), 3800);
    const drop = window.setTimeout(() => { setToast(null); setToastLeaving(false); }, 4000);
    return () => { window.clearTimeout(leave); window.clearTimeout(drop); };
  }, [toast]);

  useEffect(() => {
    const offRipples = installRipples();
    onPush<BackendState>(() => { /* reservado ao backend */ });
    onPush<{ maximized?: boolean }>((p) => {
      if (typeof p?.maximized !== "boolean") return;
      if (prevMaximized.current !== null && prevMaximized.current !== p.maximized) {
        setWindowPulse(true);
        window.setTimeout(() => setWindowPulse(false), 280);
      }
      prevMaximized.current = p.maximized;
    });
    send<{ product: string; version: string }>("getProductInfo").then(setInfo).catch(() => setInfo({ product: "ProjectAccel", version: "0.1.0-dev" }));
    return offRipples;
  }, []);

  useEffect(() => { localStorage.setItem("pa-sidebar", collapsed ? "1" : "0"); }, [collapsed]);
  useEffect(() => { localStorage.setItem(PARAMS_KEY, JSON.stringify(params)); }, [params]);
  useEffect(() => { localStorage.setItem("pa-curve-mode", mode); }, [mode]);
  useEffect(() => { localStorage.removeItem("pa-profiles"); localStorage.removeItem("pa-active-profile"); }, []);
  useEffect(() => { localStorage.setItem("pa-angle-snapping", angleSnapping ? "1" : "0"); }, [angleSnapping]);
  useEffect(() => { localStorage.setItem("pa-angle-snap-strength", String(angleSnapStrength)); }, [angleSnapStrength]);
  useEffect(() => { localStorage.setItem("pa-language", language); }, [language]);
  useEffect(() => { document.documentElement.dataset.reducedMotion = reducedMotion ? "true" : "false"; }, [reducedMotion]);
  useEffect(() => {
    localStorage.setItem("pa-theme", theme);
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = theme === "system" ? (query.matches ? "dark" : "light") : theme; };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);

  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => send("windowClose").catch(() => window.close()), 170);
  }, []);
  const toggleSidebar = useCallback(() => setCollapsed((value) => !value), []);
  const openDocs = useCallback(async () => {
    try { await send("openProjectDocs"); showToast(t("docsOpening")); }
    catch (error) { showToast(t("docsUnavailable"), error instanceof Error ? error.message : t("tryAgain")); }
  }, [showToast, t]);
  const openSearch = useCallback(() => setPage("editor"), []);
  const setCurve = useCallback((nextMode: Mode, nextParams: CurveParams) => { setMode(nextMode); setParams(nextParams); }, []);

  const navItems = [
    { icon: ChartLineRegular, label: t("curveEditor"), page: "editor" as const },
    { icon: MouseRegular, label: t("devices"), page: "devices" as const },
    { icon: Settings4Regular, label: t("settings"), page: "settings" as const },
  ];

  return (
    <div className={closing ? "app app--closing" : "app"}>
      <div className={["app-body", collapsed && "app-body--collapsed", windowPulse && "app-body--pulse"].filter(Boolean).join(" ")}>
        <aside className="sidebar" aria-label={t("sidebar")}>
          <div className="brand-row">
            <div className="brand">
              <img className="brand-mark" src="./logo.png" alt="ProjectAccel" width={32} height={32} />
              <div className="brand-text"><span className="brand-name">ProjectAccel</span></div>
            </div>
            <button className="collapse-btn" onClick={toggleSidebar} data-tip={collapsed ? t("expand") : t("collapse")} aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}>
              <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" className="collapse-chevron"><path d="M9 2.5 4.5 7 9 11.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <button className="search" onClick={openSearch} aria-label={t("search")} title={collapsed ? t("search") : undefined}>
            <Search2Regular width={16} height={16} /><span>{t("searchEllipsis")}</span><kbd>Ctrl K</kbd>
          </button>
          <nav className="nav" aria-label={t("sidebar")}>
            {navItems.map(({ icon: Icon, label, page: target }) => (
              <button key={target} className={page === target ? "nav-item nav-item--active" : "nav-item"} onClick={() => setPage(target)} aria-current={page === target ? "page" : undefined} title={collapsed ? label : undefined}>
                <Icon width={19} height={19} /><span className="nav-label">{label}</span>
              </button>
            ))}
            <button className="nav-item" onClick={openDocs} title={collapsed ? t("about") : undefined}><Layers2Regular width={19} height={19} /><span className="nav-label">{t("about")}</span></button>
          </nav>
        </aside>

        <div className="main-col">
          <TitleBar onCloseRequest={requestClose} />
          <main className="content">
            {page === "editor" && <EditorPage mode={mode} params={params} onChange={setCurve} angleSnapping={angleSnapping} onAngleSnappingChange={setAngleSnapping} angleSnapStrength={angleSnapStrength} onAngleSnapStrengthChange={setAngleSnapStrength} showToast={showToast} t={t} />}
            {page === "devices" && <DevicesPage t={t} />}
            {page === "settings" && <SettingsPage version={info?.version ?? "0.1.0-dev"} collapsed={collapsed} onCollapsedChange={setCollapsed} language={language} onLanguageChange={setLanguage} theme={theme} onThemeChange={setTheme} reducedMotion={reducedMotion} onReducedMotionChange={setReducedMotion} t={t} />}
          </main>
        </div>
      </div>
      {toast && <div className={toastLeaving ? "toast toast--leaving" : "toast"} role="status"><span className="toast-dot" /><span className="toast-body"><span className="toast-title">{toast.title}</span>{toast.desc && <span className="toast-desc">{toast.desc}</span>}</span></div>}
    </div>
  );
}
