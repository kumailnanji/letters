import { type HersheyGlyph, scriptSimple, scriptComplex } from "./hershey-data";
import fitCurveModule from "fit-curve";

type FitCurveFn = (
  points: [number, number][],
  error: number
) => number[][][];

const fitCurveFn: FitCurveFn =
  typeof fitCurveModule === "function"
    ? (fitCurveModule as unknown as FitCurveFn)
    : ((fitCurveModule as { default: FitCurveFn }).default);

export type FontVariant = "simple" | "complex";

export const fonts = {
  simple: scriptSimple,
  complex: scriptComplex,
} as const;

// ── exported types ────────────────────────────────────────

export interface PathSegment {
  d: string;
  type: "body" | "connection" | "detail";
  approxLength: number;
  char: string;
  positionIndex: number;
}

export interface SegmentedLayout {
  segments: PathSegment[];
  totalLength: number;
  totalWidth: number;
  minY: number;
  maxY: number;
}

export type CurveMode = "catmull-rom" | "fit-curve";

export interface SmoothingOptions {
  tension?: number;
  chaikinIterations?: number;
  chaikinRatio?: number;
  resampleInterval?: number;
  gaussianSigma?: number;
  gaussianPasses?: number;
  curveMode?: CurveMode;
  fitError?: number;
}

// ── helpers ───────────────────────────────────────────────

function rn(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function polylineLength(points: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function positionStroke(
  stroke: [number, number][],
  offsetX: number
): [number, number][] {
  return stroke.map(([x, y]) => [x + offsetX, y]);
}

function isDetailStroke(points: [number, number][]): boolean {
  const len = polylineLength(points);
  if (len < 2.5) return true;
  if (points.length <= 5 && len < 5) return true;
  return false;
}

// ── Chaikin smoothing ────────────────────────────────────

export function chaikinSmooth(
  points: [number, number][],
  iterations: number,
  ratio = 0.25
): [number, number][] {
  if (iterations <= 0 || points.length < 3) return points;

  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next: [number, number][] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      next.push([
        (1 - ratio) * x0 + ratio * x1,
        (1 - ratio) * y0 + ratio * y1,
      ]);
      next.push([
        ratio * x0 + (1 - ratio) * x1,
        ratio * y0 + (1 - ratio) * y1,
      ]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

// ── Uniform arc-length resampling ────────────────────────

export function resamplePolyline(
  points: [number, number][],
  interval: number
): [number, number][] {
  if (points.length < 2 || interval <= 0) return points;

  const totalLen = polylineLength(points);
  if (totalLen < interval) return points;

  const count = Math.max(2, Math.round(totalLen / interval));
  const step = totalLen / (count - 1);
  const result: [number, number][] = [points[0]];

  let segIdx = 0;
  let traveled = 0;

  for (let i = 1; i < count - 1; i++) {
    const target = i * step;
    while (segIdx < points.length - 1) {
      const dx = points[segIdx + 1][0] - points[segIdx][0];
      const dy = points[segIdx + 1][1] - points[segIdx][1];
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (traveled + segLen >= target) {
        const t = (target - traveled) / segLen;
        result.push([
          points[segIdx][0] + dx * t,
          points[segIdx][1] + dy * t,
        ]);
        break;
      }
      traveled += segLen;
      segIdx++;
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

// ── Gaussian kernel smoothing ────────────────────────────

export function gaussianSmooth(
  points: [number, number][],
  sigma: number,
  passes = 1
): [number, number][] {
  if (points.length < 3 || sigma <= 0 || passes <= 0) return points;

  let pts = points;
  for (let pass = 0; pass < passes; pass++) {
    const radius = Math.ceil(sigma * 3);
    const kernel: number[] = [];
    let sum = 0;
    for (let j = -radius; j <= radius; j++) {
      const w = Math.exp(-(j * j) / (2 * sigma * sigma));
      kernel.push(w);
      sum += w;
    }
    for (let j = 0; j < kernel.length; j++) kernel[j] /= sum;

    const next: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      let sx = 0, sy = 0;
      for (let j = -radius; j <= radius; j++) {
        const idx = Math.max(0, Math.min(pts.length - 1, i + j));
        const w = kernel[j + radius];
        sx += pts[idx][0] * w;
        sy += pts[idx][1] * w;
      }
      next.push([sx, sy]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

// ── fit-curve (Schneider's algorithm) ────────────────────

function fitCurveToPath(
  points: [number, number][],
  error: number,
  includeMoveTo: boolean
): string {
  if (points.length < 2) {
    return includeMoveTo && points.length === 1
      ? `M ${rn(points[0][0])} ${rn(points[0][1])}`
      : "";
  }
  if (points.length === 2) {
    const parts: string[] = [];
    if (includeMoveTo) parts.push(`M ${rn(points[0][0])} ${rn(points[0][1])}`);
    parts.push(`L ${rn(points[1][0])} ${rn(points[1][1])}`);
    return parts.join(" ");
  }

  const beziers: number[][][] = fitCurveFn(points, error);
  const parts: string[] = [];
  if (includeMoveTo && beziers.length > 0) {
    parts.push(`M ${rn(beziers[0][0][0])} ${rn(beziers[0][0][1])}`);
  }
  for (const [, cp1, cp2, end] of beziers) {
    parts.push(
      `C ${rn(cp1[0])} ${rn(cp1[1])}, ${rn(cp2[0])} ${rn(cp2[1])}, ${rn(end[0])} ${rn(end[1])}`
    );
  }
  return parts.join(" ");
}

// ── Catmull-Rom core ──────────────────────────────────────

function crBezier(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number
): string {
  const cp1x = p1[0] + (p2[0] - p0[0]) / t;
  const cp1y = p1[1] + (p2[1] - p0[1]) / t;
  const cp2x = p2[0] - (p3[0] - p1[0]) / t;
  const cp2y = p2[1] - (p3[1] - p1[1]) / t;
  return `C ${rn(cp1x)} ${rn(cp1y)}, ${rn(cp2x)} ${rn(cp2y)}, ${rn(p2[0])} ${rn(p2[1])}`;
}

function catmullRom(
  points: [number, number][],
  tension: number,
  includeMoveTo: boolean
): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return includeMoveTo
      ? `M ${rn(points[0][0])} ${rn(points[0][1])}`
      : "";
  }

  const parts: string[] = [];
  if (includeMoveTo) {
    parts.push(`M ${rn(points[0][0])} ${rn(points[0][1])}`);
  }

  if (points.length === 2) {
    parts.push(`L ${rn(points[1][0])} ${rn(points[1][1])}`);
    return parts.join(" ");
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : points[i + 1];
    parts.push(crBezier(p0, p1, p2, p3, tension));
  }
  return parts.join(" ");
}

// ── curve mode dispatch ──────────────────────────────────

function pointsToPath(
  points: [number, number][],
  tension: number,
  includeMoveTo: boolean,
  mode: CurveMode,
  fitError: number
): string {
  if (mode === "fit-curve") {
    return fitCurveToPath(points, fitError, includeMoveTo);
  }
  return catmullRom(points, tension, includeMoveTo);
}

// ── connection strategies ─────────────────────────────────

function buildLetterEntry(
  pts: [number, number][],
  prevLast: [number, number],
  prevSecondLast: [number, number] | null,
  tension: number
): { connectionD: string | null; connectionLength: number } {
  if (pts.length === 0) return { connectionD: null, connectionLength: 0 };

  let closestIdx = 0;
  let closestDistSq = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i][0] - prevLast[0];
    const dy = pts[i][1] - prevLast[1];
    const dSq = dx * dx + dy * dy;
    if (dSq < closestDistSq) {
      closestDistSq = dSq;
      closestIdx = i;
    }
  }

  const connPts: [number, number][] = [];
  const samePt =
    Math.abs(prevLast[0] - pts[closestIdx][0]) < 0.5 &&
    Math.abs(prevLast[1] - pts[closestIdx][1]) < 0.5;

  if (!samePt) connPts.push(prevLast);
  for (let i = closestIdx; i >= 0; i--) connPts.push(pts[i]);

  if (connPts.length <= 1) return { connectionD: null, connectionLength: 0 };

  const ctx: [number, number][] =
    prevSecondLast && !samePt ? [prevSecondLast] : [];
  const ext = [...ctx, ...connPts];
  const si = ctx.length;

  const parts = [`M ${rn(ext[si][0])} ${rn(ext[si][1])}`];
  for (let i = si; i < ext.length - 1; i++) {
    parts.push(
      crBezier(
        i > 0 ? ext[i - 1] : ext[i],
        ext[i],
        ext[i + 1],
        i + 2 < ext.length ? ext[i + 2] : ext[i + 1],
        tension
      )
    );
  }

  return {
    connectionD: parts.join(" "),
    connectionLength: Math.max(polylineLength(connPts), 0.5),
  };
}

function buildIntraLetterConnection(
  pts: [number, number][],
  prevLast: [number, number],
  prevSecondLast: [number, number] | null,
  tension: number
): { connectionD: string | null; bodyD: string; connectionLength: number } {
  const ctx: [number, number][] = prevSecondLast
    ? [prevSecondLast, prevLast]
    : [prevLast];
  const all = [...ctx, ...pts];
  const ci = ctx.length - 1;
  const bodyStart = ctx.length;

  const connectionD =
    `M ${rn(all[ci][0])} ${rn(all[ci][1])} ` +
    crBezier(
      ci > 0 ? all[ci - 1] : all[ci],
      all[ci],
      all[ci + 1],
      ci + 2 < all.length ? all[ci + 2] : all[ci + 1],
      tension
    );

  const dx = pts[0][0] - prevLast[0];
  const dy = pts[0][1] - prevLast[1];
  const connectionLength = Math.sqrt(dx * dx + dy * dy);

  const bodyParts = [`M ${rn(pts[0][0])} ${rn(pts[0][1])}`];
  for (let j = bodyStart; j < all.length - 1; j++) {
    bodyParts.push(
      crBezier(
        all[j - 1],
        all[j],
        all[j + 1],
        j + 2 < all.length ? all[j + 2] : all[j + 1],
        tension
      )
    );
  }

  return {
    connectionD,
    bodyD: bodyParts.join(" "),
    connectionLength: Math.max(connectionLength, 0.5),
  };
}

// ── main layout function ──────────────────────────────────

export function layoutTextSegmented(
  text: string,
  variant: FontVariant = "simple",
  opts: SmoothingOptions = {}
): SegmentedLayout {
  const {
    tension = 4,
    chaikinIterations = 0,
    chaikinRatio = 0.25,
    resampleInterval = 0,
    gaussianSigma = 0,
    gaussianPasses = 1,
    curveMode = "catmull-rom",
    fitError = 2,
  } = opts;

  const font = fonts[variant];
  let cursorX = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  interface SI {
    pts: [number, number][];
    detail: boolean;
    len: number;
  }

  const perLetter: { char: string; posIdx: number; strokes: SI[] }[] = [];
  let posIdx = 0;

  for (const char of text) {
    if (char === " ") {
      cursorX += 10;
      continue;
    }
    const glyph: HersheyGlyph | undefined = font[char];
    if (!glyph) continue;

    const offsetX = cursorX - glyph.left;
    const strokes: SI[] = [];

    for (const raw of glyph.strokes) {
      const positioned = positionStroke(raw, offsetX);
      const detail = isDetailStroke(raw);
      let pts = positioned;
      if (!detail) {
        if (resampleInterval > 0) pts = resamplePolyline(pts, resampleInterval);
        if (gaussianSigma > 0) pts = gaussianSmooth(pts, gaussianSigma, gaussianPasses);
        if (chaikinIterations > 0) pts = chaikinSmooth(pts, chaikinIterations, chaikinRatio);
      }
      const len = polylineLength(pts);
      strokes.push({ pts, detail, len });
      for (const [, y] of pts) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    perLetter.push({ char, posIdx, strokes });
    posIdx++;
    cursorX += glyph.right - glyph.left;
  }

  const bodySegs: PathSegment[] = [];
  const detailSegs: PathSegment[] = [];

  let prevLast: [number, number] | null = null;
  let prevSecondLast: [number, number] | null = null;

  for (const { char: ch, posIdx: pi, strokes } of perLetter) {
    let isFirstBodyInLetter = true;

    for (const s of strokes) {
      if (s.detail) {
        detailSegs.push({
          d: pointsToPath(s.pts, tension, true, curveMode, fitError),
          type: "detail",
          approxLength: s.len,
          char: ch,
          positionIndex: pi,
        });
        continue;
      }

      if (prevLast !== null && isFirstBodyInLetter) {
        const entry = buildLetterEntry(s.pts, prevLast, prevSecondLast, tension);
        if (entry.connectionD) {
          bodySegs.push({
            d: entry.connectionD,
            type: "connection",
            approxLength: entry.connectionLength,
            char: ch,
            positionIndex: pi,
          });
        }
        bodySegs.push({
          d: pointsToPath(s.pts, tension, true, curveMode, fitError),
          type: "body",
          approxLength: s.len,
          char: ch,
          positionIndex: pi,
        });
      } else if (prevLast !== null) {
        const { connectionD, bodyD, connectionLength } =
          buildIntraLetterConnection(s.pts, prevLast, prevSecondLast, tension);
        if (connectionD) {
          bodySegs.push({
            d: connectionD,
            type: "connection",
            approxLength: connectionLength,
            char: ch,
            positionIndex: pi,
          });
        }
        bodySegs.push({ d: bodyD, type: "body", approxLength: s.len, char: ch, positionIndex: pi });
      } else {
        bodySegs.push({
          d: pointsToPath(s.pts, tension, true, curveMode, fitError),
          type: "body",
          approxLength: s.len,
          char: ch,
          positionIndex: pi,
        });
      }

      isFirstBodyInLetter = false;
      const n = s.pts.length;
      prevLast = s.pts[n - 1];
      prevSecondLast = n >= 2 ? s.pts[n - 2] : null;
    }
  }

  const segments = [...bodySegs, ...detailSegs];
  const totalLength = segments.reduce((acc, s) => acc + s.approxLength, 0);

  return {
    segments,
    totalLength,
    totalWidth: cursorX,
    minY: isFinite(minY) ? minY : -12,
    maxY: isFinite(maxY) ? maxY : 12,
  };
}

// ── per-letter layout for custom shape workflow ──────────

export interface LetterSlot {
  char: string;
  positionIndex: number;
  offsetX: number;
  width: number;
  left: number;
  right: number;
}

/**
 * Compute per-letter positions using Hershey kerning.
 * Returns an array of slots with the x offset and glyph bounds
 * so custom SVG shapes can be positioned correctly.
 */
export function getLetterSlots(
  text: string,
  variant: FontVariant = "simple"
): { slots: LetterSlot[]; totalWidth: number; minY: number; maxY: number } {
  const font = fonts[variant];
  let cursorX = 0;
  let minY = -12;
  let maxY = 12;
  const slots: LetterSlot[] = [];
  let slotPosIdx = 0;

  for (const char of text) {
    if (char === " ") {
      cursorX += 10;
      continue;
    }
    const glyph: HersheyGlyph | undefined = font[char];
    if (!glyph) continue;

    const offsetX = cursorX - glyph.left;
    slots.push({
      char,
      positionIndex: slotPosIdx,
      offsetX,
      width: glyph.right - glyph.left,
      left: glyph.left,
      right: glyph.right,
    });
    slotPosIdx++;

    for (const stroke of glyph.strokes) {
      for (const [, y] of stroke) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    cursorX += glyph.right - glyph.left;
  }

  return { slots, totalWidth: cursorX, minY, maxY };
}

/**
 * Build a SINGLE continuous SVG path that traces the Hershey centerline
 * through every stroke of every letter. Strokes are connected with straight
 * line segments so the whole thing is one subpath — meaning a single
 * stroke-dashoffset animation produces a smooth "writing" reveal instead
 * of per-segment circles.
 */
export function getCenterlinePath(
  text: string,
  variant: FontVariant = "simple",
  opts: SmoothingOptions = {}
): { d: string; totalLength: number } {
  const {
    chaikinIterations = 0,
    chaikinRatio = 0.25,
    resampleInterval = 0,
    gaussianSigma = 0,
    gaussianPasses = 1,
  } = opts;

  const font = fonts[variant];
  let cursorX = 0;
  const allPoints: [number, number][][] = [];

  for (const char of text) {
    if (char === " ") {
      cursorX += 10;
      continue;
    }
    const glyph: HersheyGlyph | undefined = font[char];
    if (!glyph) continue;

    const offsetX = cursorX - glyph.left;

    for (const raw of glyph.strokes) {
      const positioned = positionStroke(raw, offsetX);
      const detail = isDetailStroke(raw);
      let pts = positioned;
      if (!detail) {
        if (resampleInterval > 0) pts = resamplePolyline(pts, resampleInterval);
        if (gaussianSigma > 0) pts = gaussianSmooth(pts, gaussianSigma, gaussianPasses);
        if (chaikinIterations > 0) pts = chaikinSmooth(pts, chaikinIterations, chaikinRatio);
      }
      if (pts.length >= 2) allPoints.push(pts);
    }

    cursorX += glyph.right - glyph.left;
  }

  if (allPoints.length === 0) return { d: "", totalLength: 0 };

  let totalLength = 0;
  const parts: string[] = [];

  for (let si = 0; si < allPoints.length; si++) {
    const stroke = allPoints[si];

    if (si === 0) {
      parts.push(`M${rn(stroke[0][0])},${rn(stroke[0][1])}`);
    } else {
      const dx = stroke[0][0] - allPoints[si - 1][allPoints[si - 1].length - 1][0];
      const dy = stroke[0][1] - allPoints[si - 1][allPoints[si - 1].length - 1][1];
      totalLength += Math.sqrt(dx * dx + dy * dy);
      parts.push(`L${rn(stroke[0][0])},${rn(stroke[0][1])}`);
    }

    for (let i = 1; i < stroke.length; i++) {
      parts.push(`L${rn(stroke[i][0])},${rn(stroke[i][1])}`);
      const dx = stroke[i][0] - stroke[i - 1][0];
      const dy = stroke[i][1] - stroke[i - 1][1];
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
  }

  return { d: parts.join(""), totalLength };
}

/**
 * Parse the starting M x y from an SVG path d string.
 */
export function parsePathStart(d: string): [number, number] | null {
  const m = d.match(/^M\s*([-\d.]+)\s+([-\d.]+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

/**
 * Build a smooth cubic bezier connection from one point to another.
 * The curve exits horizontally from `from` and enters smoothly into `to`.
 */
export function buildSmoothConnection(
  from: [number, number],
  to: [number, number]
): { d: string; length: number } {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  const cp1x = from[0] + dx * 0.4;
  const cp1y = from[1] + dy * 0.15;
  const cp2x = to[0] - dx * 0.25;
  const cp2y = to[1] - dy * 0.15;
  const d = `M ${rn(from[0])} ${rn(from[1])} C ${rn(cp1x)} ${rn(cp1y)} ${rn(cp2x)} ${rn(cp2y)} ${rn(to[0])} ${rn(to[1])}`;
  return { d, length: dist };
}

/**
 * For connection segments targeting custom letter positions, compute replacement
 * `d` strings that smoothly bridge to the custom letter's first path start
 * instead of the Hershey polyline points (which don't match the custom beziers).
 */
export function computeConnectionOverrides(
  segments: PathSegment[],
  slots: { char: string; positionIndex: number; offsetX: number; left: number }[],
  customPositions: Set<number>,
  getFirstPathD: (ch: string) => string | null
): Record<number, string> {
  const overrides: Record<number, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type !== "connection" || !customPositions.has(seg.positionIndex)) continue;
    const slot = slots.find((s) => s.positionIndex === seg.positionIndex);
    if (!slot) continue;
    const firstD = getFirstPathD(slot.char);
    if (!firstD) continue;
    const target = parsePathStart(firstD);
    const connStart = parsePathStart(seg.d);
    if (!target || !connStart) continue;
    const absTarget: [number, number] = [target[0] + slot.offsetX + slot.left, target[1]];
    overrides[i] = buildSmoothConnection(connStart, absTarget).d;
  }
  return overrides;
}

/**
 * Compute per-custom-path dashoffsets for a letter position.
 *
 * Only body segments drive timing — connections are rendered separately
 * by the Hershey fallback layer, and detail segments happen after all
 * bodies. Custom paths play back-to-back within the position's body
 * time window.
 */
export function computeCustomPathOffsets(
  segIndices: number[],
  numPaths: number,
  segments: PathSegment[],
  dashOffsets: number[]
): number[] {
  if (segIndices.length === 0 || numPaths === 0) {
    return Array(numPaths).fill(1);
  }

  const bodyIndices = segIndices.filter(
    (idx) => segments[idx].type === "body"
  );
  if (bodyIndices.length === 0) return Array(numPaths).fill(1);

  let totalLen = 0;
  let drawnLen = 0;
  for (const idx of bodyIndices) {
    const len = segments[idx].approxLength;
    const off = dashOffsets[idx];
    totalLen += len;
    drawnLen += len * (1 - off);
  }

  const posProgress = totalLen > 0 ? drawnLen / totalLen : 0;

  const offsets: number[] = [];
  const slice = 1 / numPaths;
  for (let pi = 0; pi < numPaths; pi++) {
    const start = pi * slice;
    const end = start + slice;
    if (posProgress <= start) {
      offsets.push(1);
    } else if (posProgress >= end) {
      offsets.push(0);
    } else {
      const raw = 1 - (posProgress - start) / slice;
      offsets.push(raw > 0.97 ? 1 : raw);
    }
  }
  return offsets;
}

export function computeDashOffsets(
  segments: PathSegment[],
  progress: number,
  totalLength: number
): number[] {
  let remaining = progress * totalLength;
  return segments.map((seg) => {
    if (remaining <= 0) return 1;
    if (remaining >= seg.approxLength) {
      remaining -= seg.approxLength;
      return 0;
    }
    const p = remaining / seg.approxLength;
    remaining = 0;
    return 1 - p;
  });
}
