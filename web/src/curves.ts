/**
 * Motor de curvas do ProjectAccel — matemática própria, compartilhada pelo
 * preview do editor (hoje) e pelo backend (Fase 1/2). Domínio: velocidade de
 * entrada v (counts/ms) → multiplicador de sensibilidade.
 */

export type Mode =
  | "off"
  | "linear"
  | "classic"
  | "natural"
  | "synchronous"
  | "power"
  | "jump"
  | "lut";

export interface LutPoint {
  x: number;
  y: number;
}

export interface CurveParams {
  sensitivity: number; // multiplicador global de sensibilidade
  yxRatio: number;     // proporção vertical/horizontal (preview: aplicado em Y)

  // linear & classic
  acceleration: number;
  inputOffset: number;
  exponent: number;
  gainCap: number; // 1.0 = sem teto prático

  // natural
  decay: number;
  limit: number;

  // synchronous
  motivity: number;
  gamma: number;
  syncSpeed: number;

  // power
  scale: number;
  exponentPower: number;
  outputOffset: number;

  // jump
  jumpPoint: number;
  jumpMultiplier: number;
  jumpSmooth: number; // 0 = degrau, >0 = sigmoide

  // lut
  lut: LutPoint[];
}

export const DEFAULT_PARAMS: CurveParams = {
  sensitivity: 1.0,
  yxRatio: 1.0,
  acceleration: 0.005,
  inputOffset: 0,
  exponent: 2,
  gainCap: 3,
  decay: 0.06,
  limit: 1.6,
  motivity: 1.6,
  gamma: 1.0,
  syncSpeed: 5.0,
  scale: 1.0,
  exponentPower: 0.05,
  outputOffset: 0,
  jumpPoint: 12,
  jumpMultiplier: 1.6,
  jumpSmooth: 0.35,
  lut: [
    { x: 1.5, y: 1.0 },
    { x: 5, y: 1.15 },
    { x: 10, y: 1.45 },
    { x: 20, y: 2.05 },
  ],
};

export const MAX_SPEED = 40; // counts/ms exibidos no gráfico
const STEP = 0.5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Sensibilidade bruta (sem cap de ganho), sempre ≥ 0. */
function rawSens(mode: Mode, v: number, p: CurveParams): number {
  switch (mode) {
    case "off":
      return 1;
    case "linear": {
      const d = Math.max(0, v - p.inputOffset);
      return 1 + p.acceleration * d;
    }
    case "classic": {
      const d = Math.max(0, v - p.inputOffset);
      return 1 + p.acceleration * Math.pow(d, p.exponent);
    }
    case "natural": {
      const d = Math.max(0, v - p.inputOffset);
      return 1 + (p.limit - 1) * (1 - Math.exp(-p.decay * d));
    }
    case "synchronous": {
      const d = (v - p.syncSpeed) * p.gamma;
      return Math.pow(p.motivity, Math.tanh(d));
    }
    case "power": {
      return Math.pow(p.scale * v, p.exponentPower) + p.outputOffset;
    }
    case "jump": {
      if (p.jumpSmooth <= 0.001) {
        return v < p.jumpPoint ? 1 : p.jumpMultiplier;
      }
      const k = 1 + p.jumpSmooth * 9; // cauda da sigmoide
      const sig = 1 / (1 + Math.exp(-k * 0.5 * (v - p.jumpPoint)));
      return 1 + (p.jumpMultiplier - 1) * sig;
    }
    case "lut": {
      const pts = [...p.lut].sort((a, b) => a.x - b.x);
      if (pts.length === 0) return 1;
      if (v <= pts[0].x) return pts[0].y;
      if (v >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        if (v >= a.x && v <= b.x) {
          const t = (v - a.x) / (b.x - a.x || 1e-9);
          return a.y + (b.y - a.y) * t;
        }
      }
      return 1;
    }
  }
}

/** Série 0..MAX_SPEED com cap de ganho (quando aplicável) e sens global. */
export function buildSeries(mode: Mode, p: CurveParams): number[] {
  const out: number[] = [];
  let prev = rawSens(mode, 0, p);
  for (let v = 0; v <= MAX_SPEED; v += STEP) {
    let s = rawSens(mode, v, p);
    // cap de ganho: inclinação máxima por unidade de velocidade (linear/classic)
    if ((mode === "linear" || mode === "classic") && p.gainCap > 0 && v > 0) {
      const maxDelta = p.gainCap * STEP;
      s = Math.min(s, prev + maxDelta);
    }
    out.push(clamp(s * p.sensitivity, 0, 8));
    prev = s;
  }
  return out;
}

/** Velocidade de saída normalizada para leitura: v * sens / v_max_esperado */
export function sensitivityAt(mode: Mode, v: number, p: CurveParams): number {
  return clamp(rawSens(mode, v, p) * p.sensitivity, 0, 8);
}

export const MODE_LABELS: Record<Mode, string> = {
  off: "Off",
  linear: "Linear",
  classic: "Classic",
  natural: "Natural",
  synchronous: "Synchronous",
  power: "Power",
  jump: "Jump",
  lut: "Lookup Table",
};

export const READOUT_SPEEDS = [1, 5, 10, 15, 20, 25, 30, 40] as const;
