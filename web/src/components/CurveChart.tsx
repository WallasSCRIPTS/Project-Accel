import { MAX_SPEED, buildSeries, type Mode, type CurveParams } from "../curves";

interface CurveChartProps {
  mode: Mode;
  params: CurveParams;
  angleSnapping: boolean;
  onLutChange: (points: CurveParams["lut"]) => void;
  sensitivityLabel: string;
}

const W = 720;
const H = 320;
const PAD = { l: 44, r: 18, t: 16, b: 30 };

const xFor = (v: number) => PAD.l + (v / MAX_SPEED) * (W - PAD.l - PAD.r);

/** SVG puro: grade, eixo base 1.0, curva de sensibilidade e área sob a curva. */
export function CurveChart({ mode, params, angleSnapping, onLutChange, sensitivityLabel }: CurveChartProps) {
  const series = buildSeries(mode, params);
  const dataMax = Math.max(...series);
  const yMax = Math.min(8, Math.max(2, Math.ceil(dataMax * 2) / 2));
  const yFor = (s: number) => PAD.t + (1 - Math.min(s / yMax, 1)) * (H - PAD.t - PAD.b);

  const step = MAX_SPEED / (series.length - 1);
  const pts = series.map((s, i) => [xFor(i * step), yFor(s)] as const);
  const line = mode === "lut" ? pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") : pts.reduce((path, [x, y], i) => {
    if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
    const [previousX, previousY] = pts[i - 1];
    const middleX = (previousX + x) / 2;
    return `${path} Q${previousX.toFixed(1)},${previousY.toFixed(1)} ${middleX.toFixed(1)},${((previousY + y) / 2).toFixed(1)}`;
  }, "") + ` Q${pts[pts.length - 1][0].toFixed(1)},${pts[pts.length - 1][1].toFixed(1)} ${pts[pts.length - 1][0].toFixed(1)},${pts[pts.length - 1][1].toFixed(1)}`;
  const area = `${line} L${xFor(MAX_SPEED).toFixed(1)},${yFor(0).toFixed(1)} L${xFor(0).toFixed(1)},${yFor(0).toFixed(1)} Z`;

  const lastPoint = pts[pts.length - 1];
  const xTicks = [0, 10, 20, 30, 40];
  const yTicks = [0.25, 0.5, 0.75, 1].map((f) => Number((yMax * f).toFixed(1)));

  const dragPoint = (index: number, event: React.PointerEvent<SVGCircleElement>) => {
    if (mode !== "lut") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const move = (pointer: PointerEvent) => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const cursor = new DOMPoint(pointer.clientX, pointer.clientY).matrixTransform(matrix.inverse());
      const x = Math.max(0, Math.min(MAX_SPEED, Math.round(((cursor.x - PAD.l) / (W - PAD.l - PAD.r) * MAX_SPEED) * 2) / 2));
      let y = Math.max(0.1, Math.min(5, Math.round((1 - (cursor.y - PAD.t) / (H - PAD.t - PAD.b)) * yMax / params.sensitivity * 20) / 20));
      const ordered = [...params.lut].sort((a, b) => a.x - b.x);
      if (angleSnapping && index > 0) {
        const previous = ordered[index - 1];
        const dxPixels = ((x - previous.x) / MAX_SPEED) * (W - PAD.l - PAD.r);
        if (dxPixels > 0) {
          const currentAngle = Math.atan2(-(y - previous.y) * ((H - PAD.t - PAD.b) / yMax * params.sensitivity), dxPixels) * 180 / Math.PI;
          const snappedAngle = Math.max(-75, Math.min(75, Math.round(currentAngle / 15) * 15));
          const slope = Math.tan(snappedAngle * Math.PI / 180);
          const yDelta = slope * dxPixels / ((H - PAD.t - PAD.b) / yMax * params.sensitivity);
          y = Math.max(0.1, Math.min(5, Math.round((previous.y - yDelta) * 20) / 20));
        }
      }
      const next = ordered.map((point, i) => i === index ? { x, y } : point).sort((a, b) => a.x - b.x);
      onLutChange(next);
    };
    const finish = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  };

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Curva de sensibilidade">
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
      <text x={W - PAD.r - 4} y={yFor(1) - 8} className="chart-reference" textAnchor="end">1.0× base</text>

      {/* área + curva */}
      <path d={area} className="chart-area" />
      <path d={line} className="chart-curve" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="4" className="chart-endpoint" />
      {mode === "lut" && [...params.lut].sort((a, b) => a.x - b.x).map((point, index) => (
        <circle key={`${point.x}-${index}`} cx={xFor(point.x)} cy={yFor(point.y * params.sensitivity)} r="7" className="chart-control-point" onPointerDown={(event) => dragPoint(index, event)} />
      ))}

      {/* rótulos dos eixos */}
      <text x={13} y={(PAD.t + H - PAD.b) / 2} className="chart-axis" transform={`rotate(-90 13 ${(PAD.t + H - PAD.b) / 2})`} textAnchor="middle">
        {sensitivityLabel}
      </text>
    </svg>
  );
}
