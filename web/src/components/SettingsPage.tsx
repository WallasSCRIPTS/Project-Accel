import type { Language } from "../translations";

export type ThemePreference = "system" | "light" | "dark";

interface SettingsPageProps {
  version: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  reducedMotion: boolean;
  onReducedMotionChange: (enabled: boolean) => void;
  t: (key: string) => string;
}

export function SettingsPage({ version, collapsed, onCollapsedChange, language, onLanguageChange, theme, onThemeChange, reducedMotion, onReducedMotionChange, t }: SettingsPageProps) {
  return (
    <section className="page-shell">
      <header className="page-header"><div><h1 className="page-title">{t("settings")}</h1></div></header>
      <div className="settings-groups">
        <section className="settings-card">
          <div className="settings-card-heading"><h2>{t("appearance")}</h2></div>
          <div className="settings-row">
            <div><strong>{t("theme")}</strong><p>{t("themeDescription")}</p></div>
            <select className="settings-select" value={theme} onChange={(event) => onThemeChange(event.target.value as ThemePreference)} aria-label={t("theme")}>
              <option value="system">◐　{t("system")}</option><option value="light">☀　{t("light")}</option><option value="dark">◑　{t("dark")}</option>
            </select>
          </div>
          <div className="settings-row">
            <div><strong>{t("language")}</strong><p>{t("languageDescription")}</p></div>
            <select className="settings-select settings-select--language" value={language} onChange={(event) => onLanguageChange(event.target.value as Language)} aria-label={t("language")}>
              <option value="pt">🇧🇷　Português</option><option value="en">🇬🇧　English</option><option value="es">🇪🇸　Español</option><option value="ru">🇷🇺　Русский</option>
            </select>
          </div>
          <div className="settings-row">
            <div><strong>{t("reduceMotion")}</strong><p>{t("reduceMotionDescription")}</p></div>
            <label className="switch-control"><input type="checkbox" checked={reducedMotion} onChange={(event) => onReducedMotionChange(event.target.checked)} /><span className="switch-track" /><span className="visually-hidden">{t("reduceMotion")}</span></label>
          </div>
          <div className="settings-row settings-row--last">
            <div><strong>{t("startupSidebar")}</strong><p>{t("startupSidebarDescription")}</p></div>
            <label className="switch-control"><input type="checkbox" checked={!collapsed} onChange={(event) => onCollapsedChange(!event.target.checked)} /><span className="switch-track" /><span className="visually-hidden">{t("startupSidebar")}</span></label>
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-card-heading"><h2>{t("about")}</h2></div>
          <div className="settings-row settings-row--last"><div><strong>{t("version")}</strong><p>{t("windowsApp")}</p></div><span className="settings-value">{version}</span></div>
        </section>
      </div>
    </section>
  );
}
