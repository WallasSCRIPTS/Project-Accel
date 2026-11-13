import { useEffect, useState } from "react";
import { onPush, send } from "../bridge";

type TitleButtonProps = {
  label: string;
  kind: "min" | "max" | "close";
  onClick: () => void;
  maximized?: boolean;
};

/** Botão de janela "dinâmico": spring no hover/press, tooltip deslizante, glyph dinâmico. */
function TitleButton({ label, kind, onClick, maximized }: TitleButtonProps) {
  return (
    <button
      className={`title-btn title-btn--${kind}`}
      onClick={onClick}
      aria-label={label}
      data-tip={label}
    >
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        {kind === "min" && <line x1="1.5" y1="6" x2="10.5" y2="6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
        {kind === "max" && !maximized && (
          <rect x="1.5" y="1.5" width="9" height="9" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
        )}
        {kind === "max" && maximized && (
          <>
            <rect x="3.5" y="1.2" width="7.3" height="7.3" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1.2" y="3.5" width="7.3" height="7.3" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </>
        )}
        {kind === "close" && (
          <>
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  );
}

/** Barra de título própria: sem chrome do Windows, drag nativo via bridge. */
export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    // estado inicial via bridge
    send<{ maximized: boolean }>("windowGetState")
      .then((s) => setMaximized(Boolean(s?.maximized)))
      .catch(() => {});
    // push espontâneo do host quando maximiza/restaura (também via atalho do Windows)
    onPush<{ maximized?: boolean }>((p) => {
      if (typeof p?.maximized === "boolean") setMaximized(p.maximized);
    });
  }, []);

  const minimize = () => send("windowMinimize").catch(() => {});
  const toggleMax = () => {
    setMaximized((m) => !m);
    send("windowToggleMaximize").catch(() => setMaximized((m) => !m));
  };
  const close = () => send("windowClose").catch(() => window.close());

  // drag: só em elementos com data-drag (nunca nos botões)
  const onDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".title-actions")) return;
    send("windowDrag").catch(() => {});
  };

  return (
    <header className="titlebar" onMouseDown={onDragStart} onDoubleClick={toggleMax}>
      <img className="titlebar-logo" src="./logo.png" alt="" width={17} height={17} draggable={false} />
      <span className="titlebar-name">ProjectAccel</span>
      <span className="titlebar-spacer" data-drag />
      <div className="title-actions">
        <TitleButton label="Minimizar" kind="min" onClick={minimize} />
        <TitleButton label={maximized ? "Restaurar" : "Maximizar"} kind="max" onClick={toggleMax} maximized={maximized} />
        <TitleButton label="Fechar" kind="close" onClick={close} />
      </div>
    </header>
  );
}
