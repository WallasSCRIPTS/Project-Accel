/**
 * Bridge tipado entre a UI (React) e o host nativo (WinForms + WebView2).
 * O React NUNCA fala com o driver: ele pede ao host "ping", "getProductInfo",
 * "openProjectDocs"... e o host responde com { id, ok, payload|error }.
 */

export interface BridgeRequest {
  id: number;
  type: string;
}

export interface BridgeResponse<T = unknown> {
  id: number;
  ok: boolean;
  payload?: T;
  error?: string | null;
}

/** Push espontâneo do host (id === 0), disparado após a navegação. */
export interface BackendState {
  product: string;
  version: string;
  backend: string;
  driver: string | null;
}

interface WebView2 {
  postMessage(message: BridgeRequest): void;
  addEventListener(type: "message", handler: (event: { data: unknown }) => void): void;
}

declare global {
  interface Window {
    chrome?: { webview?: WebView2 };
  }
}

const isBridgeResponse = (d: unknown): d is BridgeResponse =>
  typeof d === "object" && d !== null && "id" in d && "ok" in d;

let nextId = 1;
const pending = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: number }
>();

function hostWebView(): WebView2 | null {
  return typeof window === "undefined" ? null : (window.chrome?.webview ?? null);
}

if (typeof window !== "undefined") {
  hostWebView()?.addEventListener("message", (event) => {
    const data = event.data;
    if (!isBridgeResponse(data)) return;
    const entry = pending.get(data.id);
    if (!entry) return; // id 0 = push do host, tratado por onPush
    window.clearTimeout(entry.timer);
    pending.delete(data.id);
    if (data.ok) entry.resolve(data.payload);
    else entry.reject(new Error(data.error ?? "erro no bridge"));
  });
}

export function bridgeAvailable(): boolean {
  return hostWebView() !== null;
}

export function send<T>(type: string, timeoutMs = 3000): Promise<T> {
  const wv = hostWebView();
  if (!wv) return Promise.reject(new Error("bridge indisponível (página fora do WebView2)"));

  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error("timeout ao falar com o backend"));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
    wv.postMessage({ id, type });
  });
}

/** Escuta pushes do host (estado do backend). */
export function onPush(handler: (state: BackendState) => void): void {
  hostWebView()?.addEventListener("message", (event) => {
    const data = event.data;
    if (isBridgeResponse(data) && data.id === 0 && data.ok && data.payload) {
      handler(data.payload as BackendState);
    }
  });
}
