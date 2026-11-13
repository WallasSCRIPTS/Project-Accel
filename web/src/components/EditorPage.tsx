import { useState } from "react";
import { CurveChart } from "./CurveChart";
import { ParamField } from "./ParamField";
import {
  DEFAULT_PARAMS,
  MODE_LABELS,
  READOUT_SPEEDS,
  sensitivityAt,
  type CurveParams,
  type Mode,
} from "../curves";

const MODES = Object.keys(MODE_LABELS) as Mode[];

interface EditorPageProps {
  showToast: (title: string, desc?: string) => void;
}

/** Fase 1 em prévia: editor funcional de curvas (preview), sem aplicar no driver. */
export function EditorPage({ showToast }: EditorPageProps) {
  const [mode, setMode] = useState<Mode>("classic");
  const [params, setParams] = useState<CurveParams>({ ...DEFAULT_PARAMS });

  const set = <K extends keyof CurveParams>(key: K, value: CurveParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const reset = () => {
    setParams({ ...DEFAULT_PARAMS });
    showToast("Parâmetros restaurados", "Voltaram os valores de fábrica para este modo.");
  };

  return (
    <div className="editor">
      {/* cabeçalho da página */}
      <div className="editor-topbar">
        <div>
          <h1 className="editor-title">Editor de Curvas</h1>
          <p className="editor-sub">Preview ao vivo — nada é aplicado no mouse nesta fase.</p>
        </div>
        <div className="editor-topbar-actions">
          <span className="sim-badge">Simulado</span>
          <button className="button-glass button-glass--sm" onClick={reset}>
            Restaurar padrão
          </button>
        </div>
      </div>

      {/* seleção de modo */}
      <div className="mode-row" role="tablist" aria-label="Modo de aceleração">
        {MODES.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={m === mode}
            className={m === mode ? "mode-pill mode-pill--active" : "mode-pill"}
            onClick={() => setMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="editor-body">
        {/* gráfico + leituras */}
        <div className="chart-card">
          <CurveChart mode={mode} params={params} />
          <div className="readout-row" aria-label="Sensibilidade por velocidade">
            {READOUT_SPEEDS.map((v) => (
              <div key={v} className="readout">
                <span className="readout-speed">{v}</span>
                <span className="readout-value">{sensitivityAt(mode, v, params).toFixed(2)}×</span>
              </div>
            ))}
          </div>
        </div>

        {/* parâmetros */}
        <aside className="params-panel" aria-label="Parâmetros">
          <span className="params-kicker">Sensibilidade global</span>
          <ParamField label="Multiplicador" value={params.sensitivity} min={0.2} max={3} step={0.05}
            onChange={(v) => set("sensitivity", v)} />
          <ParamField label="Y/X ratio" value={params.yxRatio} min={0.5} max={2} step={0.05}
            onChange={(v) => set("yxRatio", v)} />

          {(mode === "linear" || mode === "classic") && (
            <>
              <span className="params-kicker">Curva</span>
              <ParamField label="Aceleração" value={params.acceleration} min={0.001} max={0.05} step={0.001}
                onChange={(v) => set("acceleration", v)} />
              {mode === "classic" && (
                <ParamField label="Expoente" value={params.exponent} min={1} max={4} step={0.25}
                  onChange={(v) => set("exponent", v)} />
              )}
              <ParamField label="Offset de entrada" value={params.inputOffset} min={0} max={20} step={0.5}
                onChange={(v) => set("inputOffset", v)} />
              <ParamField label="Teto de ganho" value={params.gainCap} min={0.5} max={6} step={0.25}
                onChange={(v) => set("gainCap", v)} />
            </>
          )}

          {mode === "natural" && (
            <>
              <span className="params-kicker">Curva</span>
              <ParamField label="Decaimento" value={params.decay} min={0.01} max={0.3} step={0.01}
                onChange={(v) => set("decay", v)} />
              <ParamField label="Limite" value={params.limit} min={1.1} max={3} step={0.1}
                onChange={(v) => set("limit", v)} />
              <ParamField label="Offset de entrada" value={params.inputOffset} min={0} max={20} step={0.5}
                onChange={(v) => set("inputOffset", v)} />
            </>
          )}

          {mode === "synchronous" && (
            <>
              <span className="params-kicker">Curva</span>
              <ParamField label="Motivity" value={params.motivity} min={1.05} max={3} step={0.05}
                onChange={(v) => set("motivity", v)} />
              <ParamField label="Gamma" value={params.gamma} min={0.2} max={3} step={0.1}
                onChange={(v) => set("gamma", v)} />
              <ParamField label="Velocidade síncrona" value={params.syncSpeed} min={0.5} max={20} step={0.5}
                onChange={(v) => set("syncSpeed", v)} />
            </>
          )}

          {mode === "power" && (
            <>
              <span className="params-kicker">Curva</span>
              <ParamField label="Scale" value={params.scale} min={0.2} max={3} step={0.1}
                onChange={(v) => set("scale", v)} />
              <ParamField label="Expoente" value={params.exponentPower} min={0.01} max={1} step={0.01}
                onChange={(v) => set("exponentPower", v)} />
              <ParamField label="Offset de saída" value={params.outputOffset} min={0} max={1} step={0.05}
                onChange={(v) => set("outputOffset", v)} />
            </>
          )}

          {mode === "jump" && (
            <>
              <span className="params-kicker">Curva</span>
              <ParamField label="Ponto do salto" value={params.jumpPoint} min={3} max={30} step={0.5}
                onChange={(v) => set("jumpPoint", v)} />
              <ParamField label="Multiplicador" value={params.jumpMultiplier} min={1.1} max={3} step={0.05}
                onChange={(v) => set("jumpMultiplier", v)} />
              <ParamField label="Suavização" value={params.jumpSmooth} min={0} max={1} step={0.05}
                onChange={(v) => set("jumpSmooth", v)} />
            </>
          )}

          {mode === "lut" && (
            <>
              <span className="params-kicker">Pontos da tabela</span>
              <div className="lut-table">
                {params.lut.map((pt, i) => (
                  <div key={i} className="lut-row">
                    <input
                      type="number" className="param-value" value={pt.x} min={0} max={60} step={0.5}
                      aria-label={`x ${i + 1}`}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isNaN(v)) return;
                        const lut = params.lut.map((p2, j) => (j === i ? { ...p2, x: v } : p2));
                        set("lut", lut);
                      }}
                    />
                    <span className="lut-sep">→</span>
                    <input
                      type="number" className="param-value" value={pt.y} min={0.1} max={5} step={0.05}
                      aria-label={`y ${i + 1}`}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isNaN(v)) return;
                        const lut = params.lut.map((p2, j) => (j === i ? { ...p2, y: v } : p2));
                        set("lut", lut);
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {mode === "off" && (
            <p className="params-empty">
              Modo desligado — sensibilidade constante (1.0×) em qualquer velocidade.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
