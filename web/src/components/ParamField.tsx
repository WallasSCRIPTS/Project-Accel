import type { ChangeEvent } from "react";

interface ParamFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

/** Linha de controle: rótulo, input numérico e slider ember pareados. */
export function ParamField({ label, value, min, max, step, onChange }: ParamFieldProps) {
  const pct = ((value - min) / (max - min)) * 100;

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
  };

  return (
    <label className="param">
      <div className="param-head">
        <span className="param-label">{label}</span>
        <input
          className="param-value"
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(4))}
          onChange={onInput}
          aria-label={label}
        />
      </div>
      <span className="param-slider-wrap" style={{ ["--progress" as string]: `${pct}%` }}>
        <span className="param-slider-track" aria-hidden="true"><span /></span>
        <input
          className="param-slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onInput}
          aria-label={label}
        />
      </span>
    </label>
  );
}
