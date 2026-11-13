import { MAX_SPEED, buildSeries, type Mode, type CurveParams } from "../curves";

interface CurveChartProps {
  mode: Mode;
  params: CurveParams;
}

const W = 660;
const H = 300;
const PAD = { l: 34, r: 10, t: 12, b: 30 };

const xFor = (v: number) => PAD.l + (v / MAX_SPEED) * (W - PAD.l - PAD.r);

/** SVG puro: grade, eixo base 1.0, curva de sensibilidade e área sob a curva. */
export function CurveChart({ mode, params }: CurveChartProps) {
  const series = buildSeries(mode, params);
  const dataMax = Math.max(...series);
  const yMax = Math.min(8, Math.max(2, Math.ceil(dataMax * 2) / 2));
  const yFor = (s: number) => PAD.t + (1 - Math.min(s / yMax, 1)) * (H - PAD.t - PAD.b);

  const step = MAX_SPEED / (series.length - 1);
  const pts = series.map((s, i) => [xFor(i * step), yFor(s)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xFor(MAX_SPEED).toFixed(1)},${yFor(0).toFixed(1)} L${xFor(0).toFixed(1)},${yFor(0).toFixed(1)} Z`;

  const xTicks = [0, 5, 10, 15, 20, 25, 30, 35, 40];
  const yTicks = [0.25, 0.5, 0.75, 1].map((f) => Number((yMax * f).toFixed(1)));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Curva de sensibilidade">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb03a" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffb03a" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grade horizontal */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={yFor(t)} y2={yFor(t)} className="chart-grid" />
          <text x={PAD.l - 7} y={yFor(t) + 3.5} className="chart-tick" textAnchor="end">
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* grade vertical + rótulos x */}
      {xTicks.map((v) => (
        <g key={v}>
          <line x1={xFor(v)} x2={xFor(v)} y1={PAD.t} y2={H - PAD.b} className="chart-grid chart-grid--soft" />
          <text x={xFor(v)} y={H - PAD.b + 16} className="chart-tick" textAnchor="middle">
            {v}
          </text>
        </g>
      ))}

      {/* eixo base: sensibilidade 1.0 */}
      <line x1={PAD.l} x2={W - PAD.r} y1={yFor(1)} y2={yFor(1)} className="chart-baseline" />

      {/* área + curva */}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} className="chart-curve" />

      {/* rótulos dos eixos */}
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 2} className="chart-axis" textAnchor="middle">
        velocidade de entrada (counts/ms)
      </text>
      <text x={11} y={(PAD.t + H - PAD.b) / 2} className="chart-axis" transform={`rotate(-90 11 ${(PAD.t + H - PAD.b) / 2})`} textAnchor="middle">
        sensibilidade
      </text>
    </svg>
  );
}
