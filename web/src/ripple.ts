/**
 * Ripple delegation minimalista: qualquer clique em um padrão interativo
 * gera uma onda circular que se expande e some. Sem dependências.
 */

const RIPPLE_SELECTOR = [
  ".button-primary",
  ".button-glass",
  ".nav-item",
  ".mode-pill",
  ".title-btn",
  ".search",
  ".collapse-btn",
].join(",");

export function installRipples(): () => void {
  const handler = (e: PointerEvent) => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(RIPPLE_SELECTOR);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const span = document.createElement("span");
    span.className = "ripple";

    const size = Math.max(rect.width, rect.height) * 1.7;
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${e.clientX - rect.left - size / 2}px`;
    span.style.top = `${e.clientY - rect.top - size / 2}px`;

    el.appendChild(span);
    window.setTimeout(() => span.remove(), 620);
  };

  document.addEventListener("pointerdown", handler, { passive: true });
  return () => document.removeEventListener("pointerdown", handler);
}
