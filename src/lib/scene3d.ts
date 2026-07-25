import * as THREE from "three";
import type { DistrictState } from "../sim/types";

// ————————————————————————————————————————————————————————————————
// Geometrie et matieres procedurales de Meridienne (aucun asset).
// Batiments implantes en ilots (rues + fronts bâtis + coeurs d'ilot),
// repartis sur plusieurs matieres (beton, verre, brique, industriel,
// eteint) pour casser l'uniformite. Fusion par matiere.
// ————————————————————————————————————————————————————————————————

export const WORLD_W = 128;
export const WORLD_D = 100;

export function toWorld(nx: number, ny: number): [number, number] {
  return [(nx - 0.5) * WORLD_W, (ny - 0.5) * WORLD_D];
}

export const RIVER: [number, number][] = [
  [-0.02, 0.16],
  [0.22, 0.3],
  [0.4, 0.46],
  [0.55, 0.6],
  [0.72, 0.66],
  [1.02, 0.74],
];

export const FLOW_ROUTES: Record<string, string[]> = {
  "mob-lrt": ["quai-nord", "ferronnerie", "halage", "verrieres"],
  "mob-logistics": ["quai-nord", "ferronnerie", "halage"],
  "cli-density": ["solferine", "ferronnerie"],
};

export const ROAD_LINKS: [string, string][] = [
  ["quai-nord", "ferronnerie"],
  ["ferronnerie", "solferine"],
  ["ferronnerie", "halage"],
  ["verrieres", "ferronnerie"],
  ["verrieres", "halage"],
  ["halage", "bas-marais"],
  ["quai-nord", "verrieres"],
  ["solferine", "halage"],
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointInPoly(px: number, py: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      yi = poly[i][1],
      xj = poly[j][0],
      yj = poly[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// —————————————————————————— Textures utilitaires ——————————————————————————

function sobelNormal(height: Float32Array, size: number, strength: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 0.5 * 255 + 128;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function aniso(t: THREE.Texture, r: THREE.WebGLRenderer) {
  t.anisotropy = r.capabilities.getMaxAnisotropy();
}

// —————————————————————————— Façades par matiere ——————————————————————————

export type Bucket = "concrete" | "glass" | "brick" | "industrial" | "dark";
export const BUILDING_BUCKETS: Bucket[] = [
  "concrete",
  "glass",
  "brick",
  "industrial",
  "dark",
];

interface FacadeOpts {
  base: string;
  window: string;
  cols: number;
  rows: number;
  glass: boolean;
  brick: boolean;
  litFrac: number;
  lit: [number, number, number];
  normalStrength: number;
}

const FACADE_OPTS: Record<Bucket, FacadeOpts> = {
  concrete: {
    base: "#8f8c83",
    window: "#414a52",
    cols: 6,
    rows: 7,
    glass: false,
    brick: false,
    litFrac: 0.16,
    lit: [255, 206, 140],
    normalStrength: 2.0,
  },
  glass: {
    base: "#313d47",
    window: "#4a5a65",
    cols: 8,
    rows: 10,
    glass: true,
    brick: false,
    litFrac: 0.42,
    lit: [255, 224, 176],
    normalStrength: 1.2,
  },
  brick: {
    base: "#7a463a",
    window: "#241f22",
    cols: 5,
    rows: 6,
    glass: false,
    brick: true,
    litFrac: 0.09,
    lit: [246, 190, 120],
    normalStrength: 1.6,
  },
  industrial: {
    base: "#565a5c",
    window: "#31363a",
    cols: 4,
    rows: 4,
    glass: false,
    brick: false,
    litFrac: 0.05,
    lit: [250, 210, 150],
    normalStrength: 1.4,
  },
  dark: {
    base: "#3c4043",
    window: "#22262b",
    cols: 7,
    rows: 8,
    glass: false,
    brick: false,
    litFrac: 0.1,
    lit: [240, 196, 130],
    normalStrength: 1.8,
  },
};

function drawFacade(o: FacadeOpts, seed: number) {
  const S = 256;
  const cw = S / o.cols;
  const ch = S / o.rows;
  const rng = mulberry32(seed);

  const a = document.createElement("canvas");
  a.width = a.height = S;
  const actx = a.getContext("2d")!;
  actx.fillStyle = o.base;
  actx.fillRect(0, 0, S, S);

  const height = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) height[i] = 0.8;

  if (o.brick) {
    // assises de briques
    const bh = 6;
    for (let y = 0; y < S; y += bh) {
      const off = (Math.floor(y / bh) % 2) * 8;
      for (let x = -8; x < S; x += 16) {
        const shade = 0.85 + rng() * 0.3;
        actx.fillStyle = `rgb(${Math.round(122 * shade)},${Math.round(
          70 * shade,
        )},${Math.round(58 * shade)})`;
        actx.fillRect(x + off + 1, y + 1, 14, bh - 2);
      }
      actx.fillStyle = "rgba(40,30,26,0.5)";
      actx.fillRect(0, y, S, 1);
    }
  } else {
    for (let i = 0; i < 1400; i++) {
      const g = rng() * 30 - 15;
      actx.fillStyle = `rgba(${128 + g},${128 + g},${124 + g},0.05)`;
      actx.fillRect(rng() * S, rng() * S, 2, 2);
    }
  }

  const em = document.createElement("canvas");
  em.width = em.height = S;
  const ectx = em.getContext("2d")!;
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, S, S);

  for (let r = 0; r < o.rows; r++) {
    for (let c = 0; c < o.cols; c++) {
      const inset = o.glass ? 1.5 : Math.min(cw, ch) * 0.24;
      const x = c * cw + inset;
      const y = r * ch + inset;
      const w = cw - inset * 2;
      const h = ch - inset * 2 - (o.glass ? 1 : 0);
      // vitre
      actx.fillStyle = o.window;
      actx.fillRect(x, y, w, h);
      if (o.glass) {
        actx.fillStyle = "rgba(140,165,175,0.22)";
        actx.fillRect(x, y, w, Math.max(1, h * 0.3));
      }
      // relief : creux de la baie
      for (let py = 0; py < ch; py++)
        for (let px = 0; px < cw; px++) {
          const gx = c * cw + px;
          const gy = r * ch + py;
          if (gx >= S || gy >= S) continue;
          const inWin = px >= inset && px < cw - inset && py >= inset && py < ch - inset;
          height[gy * S + gx] = inWin ? 0.2 : 0.85;
        }
      // eclairage
      if (rng() > 1 - o.litFrac) {
        const k = 0.75 + rng() * 0.25;
        ectx.fillStyle = `rgb(${Math.round(o.lit[0] * k)},${Math.round(
          o.lit[1] * k,
        )},${Math.round(o.lit[2] * k)})`;
        ectx.fillRect(x, y, w, h);
      }
    }
  }

  const albedo = new THREE.CanvasTexture(a);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  const emissive = new THREE.CanvasTexture(em);
  emissive.colorSpace = THREE.SRGBColorSpace;
  emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
  const normal = sobelNormal(height, S, o.normalStrength);
  return { albedo, emissive, normal };
}

export function makeBuildingTextures(renderer: THREE.WebGLRenderer) {
  const out = {} as Record<
    Bucket,
    { albedo: THREE.Texture; emissive: THREE.Texture; normal: THREE.Texture }
  >;
  let seed = 11;
  for (const b of BUILDING_BUCKETS) {
    const set = drawFacade(FACADE_OPTS[b], seed++);
    aniso(set.albedo, renderer);
    aniso(set.emissive, renderer);
    aniso(set.normal, renderer);
    out[b] = set;
  }
  return out;
}

export function makeConcreteNormal(renderer: THREE.WebGLRenderer) {
  const S = 128;
  const rng = mulberry32(3);
  const height = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) height[i] = rng();
  const sm = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          s += height[((y + dy + S) % S) * S + ((x + dx + S) % S)];
      sm[y * S + x] = s / 9;
    }
  const n = sobelNormal(sm, S, 0.5);
  aniso(n, renderer);
  return n;
}

export function makeWaterNormal(renderer: THREE.WebGLRenderer) {
  const S = 128;
  const height = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      height[y * S + x] =
        Math.sin(x * 0.3) * 0.5 + Math.sin(y * 0.21 + 1.3) * 0.5 + Math.sin((x + y) * 0.15) * 0.3;
  const n = sobelNormal(height, S, 1.4);
  n.repeat.set(6, 5);
  aniso(n, renderer);
  return n;
}

export function makeRoadTexture(renderer: THREE.WebGLRenderer) {
  const W = 32,
    H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#15181b";
  ctx.fillRect(0, 0, W, H);
  const rng = mulberry32(9);
  for (let i = 0; i < 300; i++) {
    const g = 20 + rng() * 22;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(rng() * W, rng() * H, 1, 1);
  }
  ctx.fillStyle = "rgba(214,161,58,0.7)";
  for (let y = 6; y < H; y += 22) ctx.fillRect(W / 2 - 1, y, 2, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  aniso(t, renderer);
  return t;
}

// —————————————————————————— Primitives ——————————————————————————

export interface Sink {
  pos: number[];
  nor: number[];
  uv: number[];
  col: number[];
}
export const newSink = (): Sink => ({ pos: [], nor: [], uv: [], col: [] });

export function addBox(
  s: Sink,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  r: number,
  g: number,
  b: number,
  uvk = 0.24,
  ry = 0,
  uOff = 0,
  vOff = 0,
) {
  const co = Math.cos(ry);
  const si = Math.sin(ry);
  const rot = (x: number, z: number): [number, number] => [
    cx + (x - cx) * co - (z - cz) * si,
    cz + (x - cx) * si + (z - cz) * co,
  ];
  const rn = (nx: number, nz: number): [number, number] => [
    nx * co - nz * si,
    nx * si + nz * co,
  ];
  const x0 = cx - sx / 2,
    x1 = cx + sx / 2,
    y0 = cy,
    y1 = cy + sy,
    z0 = cz - sz / 2,
    z1 = cz + sz / 2;
  const raw = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const v = raw.map(([x, y, z]) => {
    const [rx, rz] = rot(x, z);
    return [rx, y, rz];
  });
  const faces: [number[], [number, number, number], number, number][] = [
    [[0, 1, 2, 3], [0, 0, -1], sx, sy],
    [[5, 4, 7, 6], [0, 0, 1], sx, sy],
    [[4, 0, 3, 7], [-1, 0, 0], sz, sy],
    [[1, 5, 6, 2], [1, 0, 0], sz, sy],
    [[3, 2, 6, 7], [0, 1, 0], sx, sz],
    [[4, 5, 1, 0], [0, -1, 0], sx, sz],
  ];
  for (const [idx, n, fw, fh] of faces) {
    const uw = fw * uvk;
    const uh = fh * uvk;
    const uvc = [
      [uOff, vOff],
      [uOff + uw, vOff],
      [uOff + uw, vOff + uh],
      [uOff, vOff + uh],
    ];
    const [rnx, rnz] = rn(n[0], n[2]);
    const tri = [0, 1, 2, 0, 2, 3];
    for (const t of tri) {
      const vi = idx[t];
      s.pos.push(v[vi][0], v[vi][1], v[vi][2]);
      s.nor.push(rnx, n[1], rnz);
      s.uv.push(uvc[t][0], uvc[t][1]);
      s.col.push(r, g, b);
    }
  }
}

export function addGable(
  s: Sink,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  hy: number,
  sz: number,
  r: number,
  g: number,
  b: number,
  ry = 0,
) {
  const co = Math.cos(ry);
  const si = Math.sin(ry);
  const rot = (x: number, z: number): [number, number] => [
    cx + (x - cx) * co - (z - cz) * si,
    cz + (x - cx) * si + (z - cz) * co,
  ];
  const x0 = cx - sx / 2,
    x1 = cx + sx / 2,
    z0 = cz - sz / 2,
    z1 = cz + sz / 2;
  const P = (x: number, y: number, z: number) => {
    const [rx, rz] = rot(x, z);
    return [rx, y, rz] as [number, number, number];
  };
  const bl0 = P(x0, cy, z0),
    bl1 = P(x1, cy, z0),
    br1 = P(x1, cy, z1),
    br0 = P(x0, cy, z1);
  const rg0 = P(cx, cy + hy, z0),
    rg1 = P(cx, cy + hy, z1);
  const push = (p: number[], n: number[]) => {
    s.pos.push(p[0], p[1], p[2]);
    s.nor.push(n[0], n[1], n[2]);
    s.uv.push(0.02, 0.02);
    s.col.push(r, g, b);
  };
  const face = (a: number[], b2: number[], c: number[]) => {
    const ux = b2[0] - a[0],
      uy = b2[1] - a[1],
      uz = b2[2] - a[2];
    const vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    push(a, [nx / l, ny / l, nz / l]);
    push(b2, [nx / l, ny / l, nz / l]);
    push(c, [nx / l, ny / l, nz / l]);
  };
  face(bl0, bl1, rg0);
  face(br1, br0, rg1);
  face(bl0, rg0, rg1);
  face(bl0, rg1, br0);
  face(bl1, br1, rg1);
  face(bl1, rg1, rg0);
}

export function addCylinder(
  s: Sink,
  cx: number,
  cy: number,
  cz: number,
  rTop: number,
  rBot: number,
  h: number,
  seg: number,
  r: number,
  g: number,
  b: number,
  uvk = 0.24,
  uOff = 0,
) {
  const y0 = cy,
    y1 = cy + h;
  const circ = 2 * Math.PI * rBot;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0),
      s0 = Math.sin(a0),
      c1 = Math.cos(a1),
      s1 = Math.sin(a1);
    const p00 = [cx + c0 * rBot, y0, cz + s0 * rBot];
    const p10 = [cx + c1 * rBot, y0, cz + s1 * rBot];
    const p11 = [cx + c1 * rTop, y1, cz + s1 * rTop];
    const p01 = [cx + c0 * rTop, y1, cz + s0 * rTop];
    const n0 = [c0, 0, s0],
      n1 = [c1, 0, s1];
    const u0 = uOff + (i / seg) * circ * uvk,
      u1 = uOff + ((i + 1) / seg) * circ * uvk,
      vh = h * uvk;
    const emit = (p: number[], n: number[], u: number, vv: number) => {
      s.pos.push(p[0], p[1], p[2]);
      s.nor.push(n[0], n[1], n[2]);
      s.uv.push(u, vv);
      s.col.push(r, g, b);
    };
    emit(p00, n0, u0, 0);
    emit(p10, n1, u1, 0);
    emit(p11, n1, u1, vh);
    emit(p00, n0, u0, 0);
    emit(p11, n1, u1, vh);
    emit(p01, n0, u0, vh);
    const cap = (p: number[]) => {
      s.pos.push(p[0], p[1], p[2]);
      s.nor.push(0, 1, 0);
      s.uv.push(0.02, 0.02);
      s.col.push(r * 0.85, g * 0.85, b * 0.85);
    };
    cap([cx, y1, cz]);
    cap(p01);
    cap(p11);
  }
}

// —————————————————————————— Implantation urbaine ——————————————————————————

interface FnStyle {
  hMin: number;
  hMax: number;
  color: [number, number, number];
  block: number; // taille d'ilot
  blockFill: number; // prob. d'occuper un ilot
  buckets: [Bucket, number][];
  gableRoofs: boolean;
}
const FN_STYLE: Record<DistrictState["fn"], FnStyle> = {
  portuaire: {
    hMin: 3,
    hMax: 9,
    color: [0.5, 0.5, 0.48],
    block: 14,
    blockFill: 0.78,
    buckets: [["industrial", 0.62], ["dark", 0.26], ["concrete", 0.12]],
    gableRoofs: true,
  },
  affaires: {
    hMin: 8,
    hMax: 26,
    color: [0.6, 0.63, 0.68],
    block: 11,
    blockFill: 1,
    buckets: [["glass", 0.44], ["concrete", 0.3], ["dark", 0.26]],
    gableRoofs: false,
  },
  residentiel: {
    hMin: 6,
    hMax: 15,
    color: [0.66, 0.62, 0.55],
    block: 11,
    blockFill: 1,
    buckets: [["concrete", 0.44], ["brick", 0.26], ["dark", 0.3]],
    gableRoofs: false,
  },
  historique: {
    hMin: 5,
    hMax: 10,
    color: [0.7, 0.62, 0.5],
    block: 9,
    blockFill: 1,
    buckets: [["brick", 0.56], ["concrete", 0.22], ["dark", 0.22]],
    gableRoofs: true,
  },
  mixte: {
    hMin: 5,
    hMax: 18,
    color: [0.6, 0.62, 0.58],
    block: 12,
    blockFill: 0.94,
    buckets: [["glass", 0.28], ["concrete", 0.36], ["brick", 0.16], ["dark", 0.2]],
    gableRoofs: false,
  },
  humide: {
    hMin: 3,
    hMax: 6,
    color: [0.52, 0.56, 0.48],
    block: 18,
    blockFill: 0.4,
    buckets: [["brick", 0.4], ["dark", 0.4], ["concrete", 0.2]],
    gableRoofs: true,
  },
};

function hashAngle(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) / 4294967296) * Math.PI;
}

function pickBucket(buckets: [Bucket, number][], r: number): Bucket {
  let acc = 0;
  for (const [b, w] of buckets) {
    acc += w;
    if (r <= acc) return b;
  }
  return buckets[buckets.length - 1][0];
}

/**
 * Implante les batiments en ilots : rues, fronts bâtis continus le long
 * des ilots, coeurs d'ilot laisses vides. Chaque quartier a sa propre
 * orientation de trame ; chaque batiment tire une matiere et un gabarit.
 * Renvoie une geometrie par matiere (fusion).
 */
export function buildBuildings(
  districts: DistrictState[],
  /** teinte de donnee par quartier (rampe de la couche active). */
  tint: Record<string, THREE.Color>,
): Record<Bucket, THREE.BufferGeometry> {
  const sinks: Record<Bucket, Sink> = {
    concrete: newSink(),
    glass: newSink(),
    brick: newSink(),
    industrial: newSink(),
    dark: newSink(),
  };

  for (const d of districts) {
    const style = FN_STYLE[d.fn];
    const rng = mulberry32((d.id.length * 2654435761) ^ Math.round(d.density * 13));
    const densF = d.density / 100;
    const [cwx, cwz] = toWorld(d.center[0], d.center[1]);
    const theta = hashAngle(d.id);
    const co = Math.cos(theta);
    const si = Math.sin(theta);
    // monde -> local (repere de l'ilot), et retour
    const toLocal = (x: number, z: number): [number, number] => {
      const dx = x - cwx;
      const dz = z - cwz;
      return [dx * co + dz * si, -dx * si + dz * co];
    };
    const toWorldL = (lx: number, lz: number): [number, number] => [
      cwx + lx * co - lz * si,
      cwz + lx * si + lz * co,
    ];

    // bbox locale du polygone
    let lminX = Infinity,
      lmaxX = -Infinity,
      lminZ = Infinity,
      lmaxZ = -Infinity;
    for (const [nx, ny] of d.poly) {
      const [wx, wz] = toWorld(nx, ny);
      const [lx, lz] = toLocal(wx, wz);
      lminX = Math.min(lminX, lx);
      lmaxX = Math.max(lmaxX, lx);
      lminZ = Math.min(lminZ, lz);
      lmaxZ = Math.max(lmaxZ, lz);
    }

    const block = style.block;
    const street = 3.4;
    const pitch = block + street;
    const depth = 4.2; // profondeur du front bâti

    const insidePt = (lx: number, lz: number) => {
      const [wx, wz] = toWorldL(lx, lz);
      return pointInPoly(wx / WORLD_W + 0.5, wz / WORLD_D + 0.5, d.poly);
    };
    /** l'emprise entiere doit tenir dans le quartier (pas de debord). */
    const footprintInside = (lcx: number, lcz: number, ax: number, az: number) => {
      const hx = ax / 2 + 0.6;
      const hz = az / 2 + 0.6;
      return (
        insidePt(lcx - hx, lcz - hz) &&
        insidePt(lcx + hx, lcz - hz) &&
        insidePt(lcx + hx, lcz + hz) &&
        insidePt(lcx - hx, lcz + hz)
      );
    };
    const dTint = tint[d.id] ?? new THREE.Color(0.6, 0.6, 0.6);

    const place = (
      lcx: number,
      lcz: number,
      alongX: number,
      alongZ: number,
      corner: boolean,
    ) => {
      if (!footprintInside(lcx, lcz, alongX, alongZ)) return;
      const [wx, wz] = toWorldL(lcx, lcz);
      const bucket = pickBucket(style.buckets, rng());
      const s = sinks[bucket];
      const shade = 0.84 + rng() * 0.3;

      // Couleur de base propre a la matiere…
      let mr: number, mg: number, mb: number;
      if (bucket === "glass") {
        mr = 0.42;
        mg = 0.5;
        mb = 0.6;
      } else if (bucket === "brick") {
        mr = 0.66;
        mg = 0.42;
        mb = 0.35;
      } else if (bucket === "industrial") {
        mr = 0.54;
        mg = 0.56;
        mb = 0.55;
      } else if (bucket === "dark") {
        mr = 0.4;
        mg = 0.41;
        mb = 0.44;
      } else {
        mr = 0.7;
        mg = 0.68;
        mb = 0.63;
      }
      // …melangee a la teinte de la couche de donnee : ce sont les
      // batiments qui portent l'information, pas le sol.
      const k = 0.85;
      const gain = 1.5; // les facades doivent lire la donnee franchement
      const cr = (mr * (1 - k) + dTint.r * k) * shade * gain;
      const cg = (mg * (1 - k) + dTint.g * k) * shade * gain;
      const cb = (mb * (1 - k) + dTint.b * k) * shade * gain;
      const uOff = rng() * 4;
      const vOff = rng() * 4;
      const hBase = style.hMin + (style.hMax - style.hMin) * densF;
      // distribution non uniforme : beaucoup de bas, quelques emergences
      const u = rng();
      const spike = u > 0.86 ? 1.5 + rng() * 0.9 : u > 0.6 ? 1.0 : 0.62 + rng() * 0.3;
      let h = Math.max(2.5, hBase * spike);
      if (corner && style.hMax > 14) h *= 1.15 + rng() * 0.25;

      const sx = alongX;
      const sz = alongZ;

      if (bucket === "glass" && corner && h > 16) {
        // tour ronde de verre en tete d'ilot
        addCylinder(s, wx, 0, wz, Math.min(sx, sz) * 0.42, Math.min(sx, sz) * 0.5, h, 12, cr, cg, cb, 0.24, uOff);
        addCylinder(s, wx, h, wz, Math.min(sx, sz) * 0.3, Math.min(sx, sz) * 0.42, 1.4, 12, cr * 0.8, cg * 0.8, cb * 0.8, 0.24, uOff);
      } else {
        addBox(s, wx, 0, wz, sx, h, sz, cr, cg, cb, 0.24, theta, uOff, vOff);
        if (style.gableRoofs && rng() > 0.35) {
          addGable(s, wx, h, wz, sx, Math.min(sx, sz) * 0.45 + 0.6, sz, cr * 0.85, cg * 0.8, cb * 0.72, theta);
        } else if (rng() > 0.55) {
          addBox(
            s,
            wx,
            h,
            wz,
            sx * (0.3 + rng() * 0.3),
            0.6 + rng() * 1.8,
            sz * (0.3 + rng() * 0.3),
            cr * 0.75,
            cg * 0.75,
            cb * 0.75,
            0.24,
            theta,
            uOff,
            vOff,
          );
          if (corner && h > 18 && rng() > 0.5)
            addBox(s, wx, h + 1.6, wz, 0.3, 2 + rng() * 4, 0.3, 0.18, 0.18, 0.18, 0.24, theta);
        }
      }
    };

    // parcours des ilots
    for (let bx = lminX; bx <= lmaxX; bx += pitch) {
      for (let bz = lminZ; bz <= lmaxZ; bz += pitch) {
        if (rng() > style.blockFill) continue;
        const x0 = bx,
          x1 = bx + block,
          z0 = bz,
          z1 = bz + block;
        // Parcelles individuelles : chaque batiment est un lot distinct,
        // separe par un joint, avec un leger recul variable sur rue.
        const GAP = 0.7; // joint mitoyen
        const rowX = (zEdge: number, dirIn: number, isCorner0: boolean) => {
          let x = x0 + depth * 0.5;
          let first = true;
          while (x < x1 - depth * 0.5) {
            const w = Math.min(3 + rng() * 2.6, x1 - depth * 0.5 - x);
            if (w < 1.6) break;
            const dd = depth * (0.75 + rng() * 0.45); // profondeur variable
            const setback = rng() * 1.1; // recul sur rue
            place(
              x + w / 2,
              zEdge + dirIn * (dd / 2 + setback),
              w - GAP,
              dd,
              first && isCorner0,
            );
            x += w;
            first = false;
          }
        };
        const rowZ = (xEdge: number, dirIn: number) => {
          let z = z0 + depth * 0.5;
          while (z < z1 - depth * 0.5) {
            const w = Math.min(3 + rng() * 2.6, z1 - depth * 0.5 - z);
            if (w < 1.6) break;
            const dd = depth * (0.75 + rng() * 0.45);
            const setback = rng() * 1.1;
            place(xEdge + dirIn * (dd / 2 + setback), z + w / 2, dd, w - GAP, false);
            z += w;
          }
        };
        rowX(z0, 1, true);
        rowX(z1, -1, false);
        rowZ(x0, 1);
        rowZ(x1, -1);
        // coeur d'ilot : plots bas, plus frequents en secteur dense
        const cores = densF > 0.6 ? 2 : 1;
        for (let k = 0; k < cores; k++) {
          if (rng() > 0.55) continue;
          place(
            (x0 + x1) / 2 + (rng() - 0.5) * block * 0.42,
            (z0 + z1) / 2 + (rng() - 0.5) * block * 0.42,
            3 + rng() * 2.6,
            3 + rng() * 2.6,
            false,
          );
        }
      }
    }
  }

  const out = {} as Record<Bucket, THREE.BufferGeometry>;
  for (const b of BUILDING_BUCKETS) {
    const s = sinks[b];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(s.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(s.col, 3));
    out[b] = g;
  }
  return out;
}

// —————————————————————————— Voirie, mobilier, repere ——————————————————————————

export function buildRoads(districts: DistrictState[]): THREE.BufferGeometry {
  const byId = Object.fromEntries(districts.map((d) => [d.id, d]));
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const width = 2.8;
  for (const [aId, bId] of ROAD_LINKS) {
    const a = byId[aId];
    const b = byId[bId];
    if (!a || !b) continue;
    const [ax, az] = toWorld(a.center[0], a.center[1]);
    const [bx, bz] = toWorld(b.center[0], b.center[1]);
    const dx = bx - ax,
      dz = bz - az;
    const len = Math.hypot(dx, dz);
    const px = (-dz / len) * width,
      pz = (dx / len) * width;
    const reps = len / 8;
    const quad = [
      [ax + px, az + pz, 0, 0],
      [ax - px, az - pz, 1, 0],
      [bx - px, bz - pz, 1, reps],
      [ax + px, az + pz, 0, 0],
      [bx - px, bz - pz, 1, reps],
      [bx + px, bz + pz, 0, reps],
    ];
    for (const [x, z, u, vv] of quad) {
      pos.push(x, 0.12, z);
      nor.push(0, 1, 0);
      uv.push(u, vv);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export function buildStreetLights(districts: DistrictState[]): THREE.BufferGeometry {
  const byId = Object.fromEntries(districts.map((d) => [d.id, d]));
  const s = newSink();
  for (const [aId, bId] of ROAD_LINKS) {
    const a = byId[aId];
    const b = byId[bId];
    if (!a || !b) continue;
    const [ax, az] = toWorld(a.center[0], a.center[1]);
    const [bx, bz] = toWorld(b.center[0], b.center[1]);
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.floor(len / 7));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      addBox(s, ax + (bx - ax) * t + 3.4, 2.4, az + (bz - az) * t, 0.35, 0.35, 0.35, 1.0, 0.82, 0.5);
    }
  }
  return sinkToGeometryBasic(s);
}

export function buildPortCranes(districts: DistrictState[]): THREE.BufferGeometry {
  const s = newSink();
  const quai = districts.find((d) => d.id === "quai-nord");
  if (quai) {
    const spots: [number, number][] = [
      [0.12, 0.16],
      [0.2, 0.12],
      [0.28, 0.2],
    ];
    for (const [nx, ny] of spots) {
      const [x, z] = toWorld(nx, ny);
      const col: [number, number, number] = [0.55, 0.42, 0.2];
      addBox(s, x - 1.5, 0, z, 0.6, 15, 0.6, ...col);
      addBox(s, x + 1.5, 0, z, 0.6, 15, 0.6, ...col);
      addBox(s, x, 15, z, 4, 0.8, 0.8, ...col);
      addBox(s, x + 4, 14, z, 11, 0.5, 0.6, 0.4, 0.4, 0.42);
    }
  }
  return sinkToGeometryBasic(s);
}

function sinkToGeometryBasic(s: Sink): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(s.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(s.nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(s.uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(s.col, 3));
  return g;
}

export function makeTurbine(): { group: THREE.Group; rotor: THREE.Mesh } {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.4, metalness: 0.2 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 16, 8), metal);
  tower.position.y = 8;
  tower.castShadow = true;
  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 0.9), metal);
  nacelle.position.set(0, 16, 0);
  group.add(tower, nacelle);
  const rotor = new THREE.Mesh(new THREE.BufferGeometry(), metal);
  const blade = newSink();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const bl = 7;
    for (let k = 0; k < 6; k++) {
      const t = k / 6;
      addBox(blade, Math.cos(a) * bl * t, Math.sin(a) * bl * t, 0, 0.5 - t * 0.35, 0.12, 0.12, 0.85, 0.85, 0.85);
    }
  }
  rotor.geometry = sinkToGeometryBasic(blade);
  rotor.position.set(1.1, 16, 0);
  rotor.rotation.y = Math.PI / 2;
  group.add(rotor);
  return { group, rotor };
}

export const TURBINE_SPOTS: [number, number][] = [
  [0.06, 0.06],
  [0.14, 0.02],
  [0.02, 0.14],
  [0.22, 0.04],
  [0.1, 0.12],
];

// —————————————————————————— Vegetation, eau, sol ——————————————————————————

export function treeMatrices(districts: DistrictState[]): {
  matrices: THREE.Matrix4[];
  colors: THREE.Color[];
} {
  const matrices: THREE.Matrix4[] = [];
  const colors: THREE.Color[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let seed = 99;
  for (const d of districts) {
    const rng = mulberry32(seed++ * 40503);
    const count = Math.round((d.greenery / 100) * 52 + 3);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963 + rng() * 0.4;
      const r = 0.02 + 0.08 * Math.sqrt(i / Math.max(1, count));
      const nx = d.center[0] + Math.cos(a) * r;
      const ny = d.center[1] + Math.sin(a) * r * 0.82;
      if (!pointInPoly(nx, ny, d.poly)) continue;
      const [wx, wz] = toWorld(nx, ny);
      const sc = 0.7 + rng() * 0.9;
      pos.set(wx, 0, wz);
      scl.set(sc, sc * (0.9 + rng() * 0.6), sc);
      m.compose(pos, q, scl);
      matrices.push(m.clone());
      const g = 0.32 + rng() * 0.24;
      colors.push(new THREE.Color(0.13 + rng() * 0.08, g, 0.15 + rng() * 0.06));
    }
  }
  return { matrices, colors };
}

export function treeGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.0, 5);
  trunk.translate(0, 0.5, 0);
  const c1 = new THREE.ConeGeometry(0.95, 1.8, 7);
  c1.translate(0, 1.7, 0);
  const c2 = new THREE.ConeGeometry(0.7, 1.4, 7);
  c2.translate(0, 2.5, 0);
  const trunkC: number[] = [];
  for (let i = 0; i < trunk.attributes.position.count; i++) trunkC.push(0.28, 0.2, 0.13);
  trunk.setAttribute("color", new THREE.Float32BufferAttribute(trunkC, 3));
  for (const c of [c1, c2]) {
    const cc: number[] = [];
    for (let i = 0; i < c.attributes.position.count; i++) cc.push(1, 1, 1);
    c.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
  }
  return mergeGeoms([trunk, c1, c2]);
}

function mergeGeoms(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  for (const g of geoms) {
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const c = g.attributes.color as THREE.BufferAttribute;
    const idx = g.index;
    const emit = (i: number) => {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.getX(i), c.getY(i), c.getZ(i));
    };
    if (idx) for (let i = 0; i < idx.count; i++) emit(idx.getX(i));
    else for (let i = 0; i < p.count; i++) emit(i);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return out;
}

export function riverGeometry(width = 7): THREE.BufferGeometry {
  const pts = RIVER.map(([nx, ny]) => {
    const [x, z] = toWorld(nx, ny);
    return new THREE.Vector2(x, z);
  });
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dir = b.clone().sub(a).normalize();
    const perp = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(width);
    const a1 = a.clone().add(perp);
    const a2 = a.clone().sub(perp);
    const b1 = b.clone().add(perp);
    const b2 = b.clone().sub(perp);
    for (const p of [a1, a2, b2, a1, b2, b1]) {
      pos.push(p.x, 0.08, p.y);
      nor.push(0, 1, 0);
      uv.push((p.x + WORLD_W / 2) / 22, (p.y + WORLD_D / 2) / 22);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export function districtGroundGeometry(poly: [number, number][]): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  poly.forEach(([nx, ny], i) => {
    const [x, z] = toWorld(nx, ny);
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const uv: number[] = [];
  for (let i = 0; i < p.count; i++) uv.push(p.getX(i) / 12, p.getZ(i) / 12);
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

export function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#16213a");
  grad.addColorStop(0.42, "#33415e");
  grad.addColorStop(0.5, "#5f6a7c");
  grad.addColorStop(0.58, "#9a8570");
  grad.addColorStop(0.66, "#6d6a66");
  grad.addColorStop(1, "#1b2026");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
