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

/** Lignes visibles dans la maquette, activees par les politiques votees. */
export const FLOW_ROUTES: Record<string, string[]> = {
  "mob-tram-ligne-a": ["quai-nord", "ferronnerie", "halage", "verrieres"],
  "mob-tram-tangentielle": ["verrieres", "halage", "bas-marais"],
  "mob-metro-automatique": ["ferronnerie", "solferine"],
  "mob-rer-metropolitain": ["quai-nord", "ferronnerie", "solferine"],
  "mob-logistique-fluviale": ["quai-nord", "ferronnerie", "halage"],
  "cli-densification-douce": ["solferine", "ferronnerie"],
};

/** Politiques qui font apparaitre le champ eolien au large. */
export const TURBINE_TRIGGERS = ["nrg-eolien-large"];

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

/** Tirage pondere generique (les poids doivent sommer a ~1). */
function pickWeighted<T>(entries: [T, number][], r: number): T {
  let acc = 0;
  for (const [v, w] of entries) {
    acc += w;
    if (r <= acc) return v;
  }
  return entries[entries.length - 1][0];
}

/** Archetypes bâtis disponibles. */
type Kind =
  | "slab"
  | "point"
  | "stepped"
  | "round"
  | "courtyard"
  | "rowhouse"
  | "sawtooth"
  | "silo"
  | "civic"
  | "ell";

/** Repartition des archetypes selon la fonction du quartier. */
const KIND_WEIGHTS: Record<DistrictState["fn"], [Kind, number][]> = {
  portuaire: [
    ["sawtooth", 0.24],
    ["silo", 0.16],
    ["slab", 0.15],
    ["ell", 0.12],
    ["rowhouse", 0.1],
    ["courtyard", 0.08],
    ["stepped", 0.06],
    ["point", 0.05],
    ["round", 0.03],
    ["civic", 0.01],
  ],
  affaires: [
    ["point", 0.2],
    ["stepped", 0.16],
    ["round", 0.14],
    ["courtyard", 0.14],
    ["slab", 0.13],
    ["ell", 0.09],
    ["rowhouse", 0.06],
    ["sawtooth", 0.04],
    ["civic", 0.02],
    ["silo", 0.02],
  ],
  residentiel: [
    ["courtyard", 0.22],
    ["slab", 0.18],
    ["rowhouse", 0.16],
    ["ell", 0.14],
    ["point", 0.11],
    ["stepped", 0.08],
    ["round", 0.05],
    ["civic", 0.03],
    ["sawtooth", 0.02],
    ["silo", 0.01],
  ],
  historique: [
    ["rowhouse", 0.32],
    ["courtyard", 0.2],
    ["ell", 0.15],
    ["slab", 0.11],
    ["civic", 0.09],
    ["stepped", 0.05],
    ["point", 0.04],
    ["round", 0.02],
    ["sawtooth", 0.02],
  ],
  mixte: [
    ["slab", 0.18],
    ["courtyard", 0.16],
    ["point", 0.14],
    ["ell", 0.12],
    ["rowhouse", 0.12],
    ["round", 0.1],
    ["stepped", 0.1],
    ["sawtooth", 0.04],
    ["civic", 0.02],
    ["silo", 0.02],
  ],
  humide: [
    ["rowhouse", 0.34],
    ["slab", 0.18],
    ["ell", 0.14],
    ["courtyard", 0.1],
    ["silo", 0.1],
    ["sawtooth", 0.08],
    ["civic", 0.04],
    ["stepped", 0.02],
  ],
};

/**
 * Hauteur a laquelle ancrer l'etiquette d'un quartier : au-dessus de sa
 * silhouette bâtie, pour qu'elle ne soit jamais enfouie dans les volumes.
 */
export function districtLabelHeight(d: DistrictState): number {
  const st = FN_STYLE[d.fn];
  const hBase = st.hMin + (st.hMax - st.hMin) * (d.density / 100);
  return Math.min(st.hMax * 1.35, hBase * 1.8) + 7;
}

/**
 * Decoupe recursive d'un ilot en parcelles irregulieres (BSP).
 * Produit un parcellaire qui pave l'ilot sans recouvrement, avec des
 * tailles et proportions variees — la cle d'un tissu urbain credible.
 */
function splitLot(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  minLot: number,
  rng: () => number,
  out: [number, number, number, number][],
  depth: number,
) {
  const w = x1 - x0;
  const d = z1 - z0;
  const canSplitX = w > minLot * 2;
  const canSplitZ = d > minLot * 2;
  // arret : parcelle assez petite, ou arret aleatoire pour garder de gros lots
  if ((!canSplitX && !canSplitZ) || depth > 5 || (depth > 1 && rng() < 0.16)) {
    out.push([x0, z0, x1, z1]);
    return;
  }
  const splitAlongX = canSplitX && (!canSplitZ || w >= d);
  const t = 0.36 + rng() * 0.28; // coupe franchement asymetrique
  if (splitAlongX) {
    const xm = x0 + w * t;
    splitLot(x0, z0, xm, z1, minLot, rng, out, depth + 1);
    splitLot(xm, z0, x1, z1, minLot, rng, out, depth + 1);
  } else {
    const zm = z0 + d * t;
    splitLot(x0, z0, x1, zm, minLot, rng, out, depth + 1);
    splitLot(x0, zm, x1, z1, minLot, rng, out, depth + 1);
  }
}

/**
 * Implante les batiments : chaque quartier a sa propre orientation de
 * trame, se decoupe en ilots separes par des rues, et chaque ilot est
 * subdivise en parcelles irregulieres portant un archetype distinct.
 * Renvoie une geometrie par matiere (fusion).
 */
/** Toiture plate exploitable (solaire, vegetalisation). */
export interface RoofAnchor {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  ry: number;
  district: string;
}

export function buildBuildings(
  districts: DistrictState[],
  /** teinte de donnee par quartier (rampe de la couche active). */
  tint: Record<string, THREE.Color>,
): { geoms: Record<Bucket, THREE.BufferGeometry>; roofs: RoofAnchor[] } {
  const roofs: RoofAnchor[] = [];
  const sinks: Record<Bucket, Sink> = {
    concrete: newSink(),
    glass: newSink(),
    brick: newSink(),
    industrial: newSink(),
    dark: newSink(),
  };

  // Taille minimale de parcelle par fonction (pilote la finesse du tissu).
  const LOT_MIN: Record<DistrictState["fn"], number> = {
    portuaire: 5.5,
    affaires: 3.4,
    residentiel: 3.2,
    historique: 2.6,
    mixte: 3.6,
    humide: 6,
  };

  for (const d of districts) {
    const style = FN_STYLE[d.fn];
    const rng = mulberry32((d.id.length * 2654435761) ^ Math.round(d.density * 13));
    const densF = d.density / 100;
    const [cwx, cwz] = toWorld(d.center[0], d.center[1]);
    const theta = hashAngle(d.id);
    const co = Math.cos(theta);
    const si = Math.sin(theta);
    const toLocal = (x: number, z: number): [number, number] => {
      const dx = x - cwx;
      const dz = z - cwz;
      return [dx * co + dz * si, -dx * si + dz * co];
    };
    const toWorldL = (lx: number, lz: number): [number, number] => [
      cwx + lx * co - lz * si,
      cwz + lx * si + lz * co,
    ];

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

    const insidePt = (lx: number, lz: number) => {
      const [wx, wz] = toWorldL(lx, lz);
      return pointInPoly(wx / WORLD_W + 0.5, wz / WORLD_D + 0.5, d.poly);
    };
    /**
     * L'emprise entiere doit tenir dans le quartier. Strict : sans cela,
     * deux quartiers voisins (dont les trames sont orientees differemment)
     * laissent deborder leurs batiments de part et d'autre de la limite
     * commune, et les volumes s'interpenetrent.
     */
    const footprintInside = (lcx: number, lcz: number, ax: number, az: number) => {
      const hx = ax / 2 + 0.3;
      const hz = az / 2 + 0.3;
      return (
        insidePt(lcx, lcz) &&
        insidePt(lcx - hx, lcz - hz) &&
        insidePt(lcx + hx, lcz - hz) &&
        insidePt(lcx + hx, lcz + hz) &&
        insidePt(lcx - hx, lcz + hz)
      );
    };
    const dTint = tint[d.id] ?? new THREE.Color(0.6, 0.6, 0.6);

    // — Palette : matiere + teinte de donnee —
    /**
     * Couleur d'un batiment. La teinte de la couche de donnee donne la
     * TEINTE commune au quartier, mais la VALEUR varie fortement d'un
     * batiment a l'autre (age, entretien, materiau) : sans cet ecart de
     * luminosite, tous les volumes d'un meme quartier se confondent.
     */
    const colorFor = (bucket: Bucket) => {
      let mr: number, mg: number, mb: number;
      if (bucket === "glass") {
        mr = 0.46; mg = 0.56; mb = 0.68;
      } else if (bucket === "brick") {
        mr = 0.72; mg = 0.4; mb = 0.31;
      } else if (bucket === "industrial") {
        mr = 0.56; mg = 0.58; mb = 0.56;
      } else if (bucket === "dark") {
        mr = 0.34; mg = 0.35; mb = 0.39;
      } else {
        mr = 0.78; mg = 0.75; mb = 0.68;
      }
      // melange modere : la matiere reste lisible sous la donnee
      const k = 0.62;
      let r = mr * (1 - k) + dTint.r * k;
      let g = mg * (1 - k) + dTint.g * k;
      let b = mb * (1 - k) + dTint.b * k;
      // ecart de luminosite par batiment (large) + quelques volumes tres sombres
      const v = rng();
      const shade = v < 0.18 ? 0.34 + rng() * 0.22 : 0.72 + rng() * 0.95;
      // derive chromatique legere pour eviter l'aplat
      const warm = (rng() - 0.5) * 0.14;
      const gain = 1.35;
      r = (r + warm) * shade * gain;
      g = g * shade * gain;
      b = (b - warm * 0.6) * shade * gain;
      return [Math.max(0, r), Math.max(0, g), Math.max(0, b)] as [number, number, number];
    };

    // — Emission d'un batiment selon son archetype —
    const emit = (
      lcx: number,
      lcz: number,
      sx0: number,
      sz0: number,
      kind: Kind,
    ) => {
      if (sx0 < 2 || sz0 < 2) return;
      // Parcelle de bord : plutot que de la rejeter (ce qui creuse des
      // vides le long des limites), on retrecit l'emprise jusqu'a ce
      // qu'elle tienne. Les bords portent donc du bâti plus menu.
      let sx = 0;
      let sz = 0;
      for (const f of [1, 0.8, 0.62, 0.46, 0.34]) {
        if (footprintInside(lcx, lcz, sx0 * f, sz0 * f)) {
          sx = sx0 * f;
          sz = sz0 * f;
          break;
        }
      }
      if (sx < 1.6 || sz < 1.6) return;
      const [wx, wz] = toWorldL(lcx, lcz);
      const bucket = pickWeighted(style.buckets, rng());
      const s = sinks[bucket];
      const [cr, cg, cb] = colorFor(bucket);
      const uOff = rng() * 4;
      const vOff = rng() * 4;
      const hBase = style.hMin + (style.hMax - style.hMin) * densF;
      const u = rng();
      const spike = u > 0.9 ? 1.35 + rng() * 0.45 : u > 0.66 ? 0.95 + rng() * 0.25 : 0.48 + rng() * 0.35;
      const h = Math.max(2.5, Math.min(style.hMax * 1.35, hBase * spike));
      const dk = [cr * 0.78, cg * 0.78, cb * 0.78] as const;

      switch (kind) {
        case "courtyard": {
          // ilot ferme : quatre ailes autour d'une cour
          const wgt = Math.max(1.8, Math.min(sx, sz) * 0.3);
          const hh = Math.max(3, h * 0.62);
          roofs.push({ x: wx, y: hh, z: wz, w: sx, d: wgt, ry: theta, district: d.id });
          // aile -Z
          const [w0x, w0z] = toWorldL(lcx, lcz - (sz - wgt) / 2);
          addBox(s, w0x, 0, w0z, sx, hh, wgt, cr, cg, cb, 0.24, theta, uOff, vOff);
          // aile +Z
          const [w1x, w1z] = toWorldL(lcx, lcz + (sz - wgt) / 2);
          addBox(s, w1x, 0, w1z, sx, hh * (0.85 + rng() * 0.3), wgt, cr, cg, cb, 0.24, theta, uOff + 1, vOff);
          const [w2x, w2z] = toWorldL(lcx - (sx - wgt) / 2, lcz);
          addBox(s, w2x, 0, w2z, wgt, hh * (0.85 + rng() * 0.3), sz, cr, cg, cb, 0.24, theta, uOff + 2, vOff);
          const [w3x, w3z] = toWorldL(lcx + (sx - wgt) / 2, lcz);
          addBox(s, w3x, 0, w3z, wgt, hh * (0.85 + rng() * 0.3), sz, cr, cg, cb, 0.24, theta, uOff + 3, vOff);
          break;
        }
        case "point": {
          // tour ponctuelle elancee sur socle
          const pod = Math.max(2.5, h * 0.16);
          addBox(s, wx, 0, wz, sx, pod, sz, dk[0], dk[1], dk[2], 0.24, theta, uOff, vOff);
          const tw = sx * 0.58;
          const td = sz * 0.58;
          addBox(s, wx, pod, wz, tw, h - pod, td, cr, cg, cb, 0.24, theta, uOff, vOff);
          addBox(s, wx, h, wz, tw * 0.55, 1.2 + rng() * 1.6, td * 0.55, dk[0], dk[1], dk[2], 0.24, theta);
          if (rng() > 0.45)
            addBox(s, wx, h + 1.4, wz, 0.28, 2.5 + rng() * 4.5, 0.28, 0.16, 0.16, 0.17, 0.24, theta);
          break;
        }
        case "stepped": {
          // gradins successifs
          const tiers = 3 + Math.floor(rng() * 2);
          let y = 0;
          let fw = sx;
          let fd = sz;
          for (let t = 0; t < tiers; t++) {
            const th = (h / tiers) * (0.75 + rng() * 0.4);
            addBox(s, wx, y, wz, fw, th, fd, cr, cg, cb, 0.24, theta, uOff, vOff + t);
            y += th;
            fw *= 0.74 + rng() * 0.1;
            fd *= 0.74 + rng() * 0.1;
          }
          break;
        }
        case "round": {
          const rr = Math.min(sx, sz) * 0.48;
          addCylinder(s, wx, 0, wz, rr * 0.9, rr, h, 14, cr, cg, cb, 0.24, uOff);
          addCylinder(s, wx, h, wz, rr * 0.55, rr * 0.9, 1.3, 14, dk[0], dk[1], dk[2], 0.24, uOff);
          break;
        }
        case "rowhouse": {
          const hh = Math.max(3, h * 0.5);
          addBox(s, wx, 0, wz, sx, hh, sz, cr, cg, cb, 0.24, theta, uOff, vOff);
          addGable(s, wx, hh, wz, sx, Math.min(sx, sz) * 0.42 + 0.8, sz, dk[0], dk[1], dk[2], theta);
          break;
        }
        case "sawtooth": {
          // halle industrielle : bas, longue, toiture en sheds
          const hh = Math.max(2.5, Math.min(h * 0.45, 7));
          addBox(s, wx, 0, wz, sx, hh, sz, cr, cg, cb, 0.24, theta, uOff, vOff);
          roofs.push({ x: wx, y: hh, z: wz, w: sx * 0.8, d: sz * 0.8, ry: theta, district: d.id });
          const n = Math.max(2, Math.floor(sx / 3));
          for (let i = 0; i < n; i++) {
            const ox = -sx / 2 + (i + 0.5) * (sx / n);
            const [gx, gz] = toWorldL(lcx + ox, lcz);
            addGable(s, gx, hh, gz, sx / n - 0.2, 1.1, sz, dk[0], dk[1], dk[2], theta);
          }
          break;
        }
        case "silo": {
          const rr = Math.min(sx, sz) * 0.24;
          const n = 2 + Math.floor(rng() * 2);
          for (let i = 0; i < n; i++) {
            const ox = -sx / 2 + ((i + 0.5) * sx) / n;
            const [gx, gz] = toWorldL(lcx + ox, lcz);
            addCylinder(s, gx, 0, gz, rr, rr, h * (0.9 + rng() * 0.6), 10, cr, cg, cb, 0.24, uOff + i);
          }
          break;
        }
        case "civic": {
          const hh = Math.max(4, h * 0.55);
          addBox(s, wx, 0, wz, sx, hh, sz, cr, cg, cb, 0.24, theta, uOff, vOff);
          addGable(s, wx, hh, wz, sx, Math.min(sx, sz) * 0.4 + 1, sz, dk[0], dk[1], dk[2], theta);
          // clocher
          const [tx, tz] = toWorldL(lcx - sx * 0.3, lcz);
          addBox(s, tx, 0, tz, sx * 0.22, hh * 1.9, sz * 0.22, cr, cg, cb, 0.24, theta, uOff, vOff);
          addCylinder(s, tx, hh * 1.9, tz, 0.05, sx * 0.13, 2.6, 6, dk[0], dk[1], dk[2], 0.24);
          break;
        }
        case "ell": {
          // deux corps en equerre, strictement contenus dans la parcelle
          const a = 0.5 + rng() * 0.16; // part du corps transversal
          const wingZ = sz * a;
          const wingX = sx * a;
          // aile le long de X, plaquee au bord -Z
          const [ax1, az1] = toWorldL(lcx, lcz - (sz - wingZ) / 2);
          addBox(s, ax1, 0, az1, sx, h, wingZ, cr, cg, cb, 0.24, theta, uOff, vOff);
          // aile le long de Z, plaquee au bord -X
          const [ax2, az2] = toWorldL(lcx - (sx - wingX) / 2, lcz);
          addBox(
            s, ax2, 0, az2, wingX, h * (0.62 + rng() * 0.34), sz,
            cr, cg, cb, 0.24, theta, uOff + 1, vOff,
          );
          break;
        }
        default: {
          // barre simple, avec edicule occasionnel
          addBox(s, wx, 0, wz, sx, h, sz, cr, cg, cb, 0.24, theta, uOff, vOff);
          // toiture plate : support possible de panneaux ou de vegetalisation
          roofs.push({ x: wx, y: h, z: wz, w: sx, d: sz, ry: theta, district: d.id });
          if (rng() > 0.55)
            addBox(
              s,
              wx,
              h,
              wz,
              sx * (0.28 + rng() * 0.3),
              0.7 + rng() * 1.8,
              sz * (0.28 + rng() * 0.3),
              dk[0],
              dk[1],
              dk[2],
              0.24,
              theta,
            );
        }
      }
    };

    // — Zone humide : habitat diffus, pas d'ilots —
    // Le Bas-Marais n'est pas loti : c'est un semis lache de constructions
    // basses sur pilotis, hangars et fermes, disperse sur toute l'emprise.
    if (d.fn === "humide") {
      const step = 6.4;
      for (let lx = lminX; lx <= lmaxX; lx += step) {
        for (let lz = lminZ; lz <= lmaxZ; lz += step) {
          if (rng() > 0.72) continue;
          const jx = lx + (rng() - 0.5) * step * 0.85;
          const jz = lz + (rng() - 0.5) * step * 0.85;
          const w = 2.6 + rng() * 2.8;
          const dd = 2.6 + rng() * 2.8;
          emit(jx, jz, w, dd, pickWeighted(KIND_WEIGHTS.humide, rng()));
          // annexe accolee : appentis, remise
          if (rng() < 0.34) {
            const ox = (rng() < 0.5 ? -1 : 1) * (w * 0.5 + 1.4 + rng());
            emit(jx + ox, jz + (rng() - 0.5) * 2, 1.8 + rng() * 1.6, 1.8 + rng() * 1.6, "slab");
          }
        }
      }
      continue;
    }

    // — Decoupage en ilots puis en parcelles (BSP) —
    const block = style.block;
    const street = 2.2;
    const pitch = block + street;
    const minLot = LOT_MIN[d.fn];

    for (let bx = lminX; bx <= lmaxX; bx += pitch) {
      for (let bz = lminZ; bz <= lmaxZ; bz += pitch) {
        if (rng() > style.blockFill) continue;
        const lots: [number, number, number, number][] = [];
        splitLot(bx, bz, bx + block, bz + block, minLot, rng, lots, 0);
        for (const [x0, z0, x1, z1] of lots) {
          // joint mitoyen + retrait variable : les parcelles ne se touchent pas
          const gap = 0.3 + rng() * 0.35;
          const sx = x1 - x0 - gap * 2;
          const sz = z1 - z0 - gap * 2;
          if (sx < 1.8 || sz < 1.8) continue;
          if (rng() < 0.07) continue; // parcelle laissee libre (cour, jardin)
          const kind = pickWeighted(KIND_WEIGHTS[d.fn], rng());
          emit((x0 + x1) / 2, (z0 + z1) / 2, sx, sz, kind);
        }
      }
    }
  }

  const geoms = {} as Record<Bucket, THREE.BufferGeometry>;
  for (const b of BUILDING_BUCKETS) {
    const s = sinks[b];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(s.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(s.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(s.col, 3));
    geoms[b] = g;
  }
  return { geoms, roofs };
}

// —————————————————————————— Transformation visible ——————————————————————————
// La ville doit rendre compte des politiques votees, pas seulement les
// indicateurs. Ces calques se reconstruisent a chaque annee.

/**
 * Panneaux solaires en toiture. La couverture suit la part d'energie
 * decarbonee : plus le mix se decarbone, plus les toits se couvrent.
 */
export function buildRooftopSolar(
  roofs: RoofAnchor[],
  energyPct: number,
): THREE.BufferGeometry {
  const s = newSink();
  const cover = Math.max(0, (energyPct - 30) / 70); // rien avant 30 %
  const rng = mulberry32(1337);
  for (const r of roofs) {
    if (rng() > cover * 0.85) continue;
    if (r.w < 2.4 || r.d < 2.4) continue;
    const cols = Math.max(1, Math.floor(r.w / 1.5));
    const rows = Math.max(1, Math.floor(r.d / 1.5));
    const co = Math.cos(r.ry);
    const si = Math.sin(r.ry);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (rng() > 0.78) continue;
        const lx = -r.w / 2 + (i + 0.5) * (r.w / cols);
        const lz = -r.d / 2 + (j + 0.5) * (r.d / rows);
        const px = r.x + lx * co - lz * si;
        const pz = r.z + lx * si + lz * co;
        addBox(s, px, r.y + 0.05, pz, 1.05, 0.16, 0.72, 0.1, 0.14, 0.26, 0.5, r.ry);
      }
    }
  }
  return sinkToGeometryBasic(s);
}

/**
 * Toitures vegetalisees. Suit la couverture vegetale du quartier :
 * les programmes de canopee verdissent aussi les toits.
 */
export function buildGreenRoofs(
  roofs: RoofAnchor[],
  greeneryByDistrict: Record<string, number>,
): THREE.BufferGeometry {
  const s = newSink();
  const rng = mulberry32(4242);
  for (const r of roofs) {
    const g = (greeneryByDistrict[r.district] ?? 0) / 100;
    const cover = Math.max(0, (g - 0.25) / 0.75);
    if (rng() > cover * 0.8) continue;
    if (r.w < 2 || r.d < 2) continue;
    const tone = 0.42 + rng() * 0.3;
    addBox(
      s, r.x, r.y + 0.04, r.z, r.w * 0.86, 0.12, r.d * 0.86,
      0.16 * tone, 0.5 * tone, 0.2 * tone, 0.4, r.ry,
    );
  }
  return sinkToGeometryBasic(s);
}

/**
 * Grues de chantier : apparaissent dans les quartiers dont la densite a
 * progresse depuis 2049 — la densification devient visible.
 */
export function buildConstructionCranes(
  districts: DistrictState[],
  baseline: DistrictState[],
): THREE.BufferGeometry {
  const s = newSink();
  const base = Object.fromEntries(baseline.map((d) => [d.id, d]));
  for (const d of districts) {
    const b = base[d.id];
    if (!b) continue;
    const growth = d.density - b.density;
    if (growth < 1.5) continue;
    const n = Math.min(4, Math.floor(growth / 2.5) + 1);
    const rng = mulberry32(d.id.length * 7919 + Math.round(growth * 10));
    for (let i = 0; i < n; i++) {
      const a = i * 2.399963;
      const rr = 0.03 + 0.05 * rng();
      const nx = d.center[0] + Math.cos(a) * rr;
      const ny = d.center[1] + Math.sin(a) * rr * 0.8;
      if (!pointInPoly(nx, ny, d.poly)) continue;
      const [x, z] = toWorld(nx, ny);
      const H = 16 + rng() * 10;
      // mat + fleche + contrepoids, en jaune de chantier
      addBox(s, x, 0, z, 0.5, H, 0.5, 0.85, 0.62, 0.14);
      addBox(s, x + 4, H, z, 11, 0.42, 0.42, 0.85, 0.62, 0.14);
      addBox(s, x - 2.4, H, z, 3.2, 0.5, 0.5, 0.5, 0.5, 0.52);
    }
  }
  return sinkToGeometryBasic(s);
}

/**
 * Tache floue servant de particule de brume. Un degrade radial doux :
 * assemblees par centaines, ces taches forment un volume vaporeux, la ou
 * un plan a plat ne donnerait qu'un aplat.
 */
export function makeHazeTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,0.46)");
  g.addColorStop(0.35, "rgba(255,255,255,0.2)");
  g.addColorStop(0.7, "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Semis de particules de brume dans le volume d'air d'un quartier.
 * Reparties dans l'emprise et etagees en hauteur, avec une densite plus
 * forte pres du sol — la ou l'air stagne.
 */
export function hazeGeometry(
  poly: [number, number][],
  count = 190,
): THREE.BufferGeometry {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const minx = Math.min(...xs);
  const maxx = Math.max(...xs);
  const miny = Math.min(...ys);
  const maxy = Math.max(...ys);
  const rng = mulberry32(Math.round((minx + maxy) * 99991) ^ poly.length);
  const pos: number[] = [];
  let guard = 0;
  while (pos.length < count * 3 && guard < count * 60) {
    guard++;
    const nx = minx + rng() * (maxx - minx);
    const ny = miny + rng() * (maxy - miny);
    if (!pointInPoly(nx, ny, poly)) continue;
    const [x, z] = toWorld(nx, ny);
    // concentration decroissante avec l'altitude
    const u = rng();
    const y = 3 + u * u * 26;
    pos.push(x, y, z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
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

/**
 * Adoucit un polygone par decoupe de coins (Chaikin) : les limites de
 * quartier deviennent des courbes fermees plutot que des angles vifs.
 */
function chaikin(pts: [number, number][], iters: number): [number, number][] {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const out: [number, number][] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = out;
  }
  return p;
}

/**
 * Contour arrondi d'un quartier, en coordonnees normalisees.
 * `inflate` > 1 fait bomber la courbe vers l'exterieur pour qu'elle
 * enveloppe tout le bâti au lieu d'en rogner les angles.
 */
export function districtOutline(
  poly: [number, number][],
  inflate = 1.015,
  iters = 3,
): [number, number][] {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of poly) {
    cx += x;
    cy += y;
  }
  cx /= poly.length;
  cy /= poly.length;
  const scaled = poly.map(
    ([x, y]) => [cx + (x - cx) * inflate, cy + (y - cy) * inflate] as [number, number],
  );
  return chaikin(scaled, iters);
}

/**
 * Anneau au sol : ruban plat suivant le contour arrondi. Un ruban plutot
 * qu'une ligne, car l'epaisseur des lignes n'est pas fiable en WebGL.
 */
export function districtRingGeometry(
  poly: [number, number][],
  inflate = 1.015,
  width = 0.42,
): THREE.BufferGeometry {
  const pts = districtOutline(poly, inflate).map(([nx, ny]) => {
    const [x, z] = toWorld(nx, ny);
    return new THREE.Vector2(x, z);
  });
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * width;
    const py = (dx / len) * width;
    const quad = [
      [a.x + px, a.y + py],
      [a.x - px, a.y - py],
      [b.x - px, b.y - py],
      [a.x + px, a.y + py],
      [b.x - px, b.y - py],
      [b.x + px, b.y + py],
    ];
    for (const [x, z] of quad) {
      pos.push(x, 0, z);
      nor.push(0, 1, 0);
      uv.push(0, 0);
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
  districtOutline(poly).forEach(([nx, ny], i) => {
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
