import * as THREE from "three";
import type { DistrictState } from "../sim/types";

// ————————————————————————————————————————————————————————————————
// Geometrie et matieres procedurales de Meridienne (aucun asset).
// Batiments fusionnes par matiere, textures PBR dessinees au canvas,
// fenetres eclairees en crepuscule, reliefs etages, repere par decision.
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

// Reseau viaire permanent (adjacence de quartiers).
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

// —————————————————————————— Textures ——————————————————————————

function sobelNormal(height: Float32Array, size: number, strength: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
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
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function tuneAniso(t: THREE.Texture, renderer: THREE.WebGLRenderer) {
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
}

/** Façade : albedo (trame vitree), relief (normal), emissif (fenetres allumees). */
export function makeFacadeTextures(renderer: THREE.WebGLRenderer) {
  const S = 256;
  const cols = 8;
  const rows = 8;
  const cw = S / cols;
  const ch = S / rows;

  // albedo
  const a = document.createElement("canvas");
  a.width = a.height = S;
  const actx = a.getContext("2d")!;
  actx.fillStyle = "#8b8880";
  actx.fillRect(0, 0, S, S);
  // trame beton legere
  const rng = mulberry32(7);
  for (let i = 0; i < 1600; i++) {
    const g = 120 + rng() * 40;
    actx.fillStyle = `rgba(${g},${g},${g - 6},0.05)`;
    actx.fillRect(rng() * S, rng() * S, 2, 2);
  }
  // vitrages
  const height = new Float32Array(S * S);
  const em = document.createElement("canvas");
  em.width = em.height = S;
  const ectx = em.getContext("2d")!;
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, S, S);
  const litRng = mulberry32(41);
  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      const x = cc * cw + 2;
      const y = r * ch + 2;
      const w = cw - 4;
      const h = ch - 5;
      // vitre (albedo sombre reflechissant)
      actx.fillStyle = "#3a444d";
      actx.fillRect(x, y, w, h);
      actx.fillStyle = "rgba(120,140,150,0.25)";
      actx.fillRect(x, y, w, 2);
      // relief : creux de la vitre, saillie du meneau
      for (let py = 0; py < ch; py++)
        for (let px = 0; px < cw; px++) {
          const gx = cc * cw + px;
          const gy = r * ch + py;
          const inWin = px >= 2 && px < cw - 2 && py >= 2 && py < ch - 3;
          height[gy * S + gx] = inWin ? 0.15 : 0.85;
        }
      // emissif : une partie des fenetres allumee
      if (litRng() > 0.62) {
        const warm = litRng();
        const rr = 255;
        const gg = 200 + warm * 40;
        const bb = 120 + warm * 70;
        ectx.fillStyle = `rgb(${rr},${Math.round(gg)},${Math.round(bb)})`;
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
  const normal = sobelNormal(height, S, 2.2);
  [albedo, emissive, normal].forEach((t) => tuneAniso(t, renderer));
  return { albedo, emissive, normal };
}

/** Bruit de beton clair pour le relief des sols. */
export function makeConcreteNormal(renderer: THREE.WebGLRenderer) {
  const S = 128;
  const rng = mulberry32(3);
  const height = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) height[i] = rng();
  // lissage leger
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
  tuneAniso(n, renderer);
  return n;
}

/** Normal map d'eau (rides) pour un fleuve anime. */
export function makeWaterNormal(renderer: THREE.WebGLRenderer) {
  const S = 128;
  const height = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      height[y * S + x] =
        Math.sin(x * 0.3) * 0.5 +
        Math.sin(y * 0.21 + 1.3) * 0.5 +
        Math.sin((x + y) * 0.15) * 0.3;
  const n = sobelNormal(height, S, 1.4);
  n.repeat.set(6, 5);
  tuneAniso(n, renderer);
  return n;
}

/** Chaussee : asphalte sombre + ligne axiale pointillee. */
export function makeRoadTexture(renderer: THREE.WebGLRenderer) {
  const W = 32;
  const H = 128;
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
  tuneAniso(t, renderer);
  return t;
}

// —————————————————————————— Sinks / primitives ——————————————————————————

export interface Sink {
  pos: number[];
  nor: number[];
  uv: number[];
  col: number[];
}
export const newSink = (): Sink => ({ pos: [], nor: [], uv: [], col: [] });

/** Boite avec UV proportionnelles a la taille des faces (uvk = repet./unite).
 *  ry : rotation autour de Y (radians) pour casser la trame orthogonale. */
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
  uvk = 0.16,
  ry = 0,
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
    const corners = idx;
    const uw = fw * uvk;
    const uh = fh * uvk;
    const uvc = [
      [0, 0],
      [uw, 0],
      [uw, uh],
      [0, uh],
    ];
    const [rnx, rnz] = rn(n[0], n[2]);
    const tri = [0, 1, 2, 0, 2, 3];
    for (const t of tri) {
      const vi = corners[t];
      s.pos.push(v[vi][0], v[vi][1], v[vi][2]);
      s.nor.push(rnx, n[1], rnz);
      s.uv.push(uvc[t][0], uvc[t][1]);
      s.col.push(r, g, b);
    }
  }
}

/** Toit a deux pentes (prisme triangulaire), faitage le long de X. */
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
  // sommets : base (4) + faitage (2)
  const bl0 = P(x0, cy, z0),
    bl1 = P(x1, cy, z0),
    br1 = P(x1, cy, z1),
    br0 = P(x0, cy, z1);
  const rg0 = P(cx, cy + hy, z0),
    rg1 = P(cx, cy + hy, z1);
  const push = (p: number[], n: number[]) => {
    s.pos.push(p[0], p[1], p[2]);
    s.nor.push(n[0], n[1], n[2]);
    s.uv.push(0, 0);
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
    nx /= l;
    ny /= l;
    nz /= l;
    push(a, [nx, ny, nz]);
    push(b2, [nx, ny, nz]);
    push(c, [nx, ny, nz]);
  };
  // pente avant (z0) et arriere (z1)
  face(bl0, bl1, rg0);
  face(br1, br0, rg1);
  // les deux pans : quads (bas -> faitage)
  face(bl0, rg0, rg1);
  face(bl0, rg1, br0);
  face(bl1, br1, rg1);
  face(bl1, rg1, rg0);
}

/** Tour cylindrique (verre) avec UV enroulees et calotte. */
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
  uvk = 0.16,
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
    const u0 = (i / seg) * circ * uvk,
      u1 = ((i + 1) / seg) * circ * uvk,
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
    // calotte
    const cap = (p: number[]) => {
      s.pos.push(p[0], p[1], p[2]);
      s.nor.push(0, 1, 0);
      s.uv.push(0, 0);
      s.col.push(r * 0.85, g * 0.85, b * 0.85);
    };
    cap([cx, y1, cz]);
    cap(p01);
    cap(p11);
  }
}

export function sinkToGeometry(s: Sink): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(s.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(s.nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(s.uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(s.col, 3));
  return g;
}

// —————————————————————————— Ville ——————————————————————————

interface FnStyle {
  hMin: number;
  hMax: number;
  color: [number, number, number];
  fill: number;
  spacing: number;
  tiered: boolean;
}
const FN_STYLE: Record<DistrictState["fn"], FnStyle> = {
  portuaire: { hMin: 2.5, hMax: 9, color: [0.4, 0.4, 0.38], fill: 0.5, spacing: 6.4, tiered: false },
  affaires: { hMin: 9, hMax: 38, color: [0.46, 0.5, 0.56], fill: 0.85, spacing: 5.6, tiered: true },
  residentiel: { hMin: 6, hMax: 19, color: [0.56, 0.52, 0.46], fill: 0.82, spacing: 5.0, tiered: false },
  historique: { hMin: 4, hMax: 11, color: [0.6, 0.54, 0.44], fill: 0.74, spacing: 4.4, tiered: false },
  mixte: { hMin: 5, hMax: 24, color: [0.5, 0.53, 0.5], fill: 0.62, spacing: 5.2, tiered: true },
  humide: { hMin: 2, hMax: 5, color: [0.42, 0.46, 0.4], fill: 0.14, spacing: 8, tiered: false },
};

/** Batiments de tous les quartiers : gabarits varies pilotes par la densite.
 *  Archetypes : bloc oriente, tour a retraits, tour ronde, socle + tour,
 *  batisse a toit en pente, hangar/cheminee portuaire. */
export function buildBuildings(districts: DistrictState[]): THREE.BufferGeometry {
  const s = newSink();
  let seedBase = 1;
  for (const d of districts) {
    const style = FN_STYLE[d.fn];
    const rng = mulberry32((seedBase++ * 2654435761) ^ Math.round(d.density * 7));
    const densF = d.density / 100;
    const fill = Math.min(0.96, style.fill + densF * 0.22);
    const spacing = style.spacing * (1 - densF * 0.16);
    const xs = d.poly.map((p) => p[0]);
    const ys = d.poly.map((p) => p[1]);
    const minx = Math.min(...xs),
      maxx = Math.max(...xs),
      miny = Math.min(...ys),
      maxy = Math.max(...ys);
    const stepX = spacing / WORLD_W;
    const stepZ = spacing / WORLD_D;
    for (let nx = minx; nx <= maxx; nx += stepX) {
      for (let ny = miny; ny <= maxy; ny += stepZ) {
        if (rng() > fill) continue;
        const jx = nx + (rng() - 0.5) * stepX * 0.6;
        const jy = ny + (rng() - 0.5) * stepZ * 0.6;
        if (!pointInPoly(jx, jy, d.poly)) continue;
        const [wx, wz] = toWorld(jx, jy);
        const foot = spacing * (0.42 + rng() * 0.3);
        const foot2 = spacing * (0.42 + rng() * 0.3);
        const hBase = style.hMin + (style.hMax - style.hMin) * densF;
        const h = Math.max(2, hBase * (0.5 + rng() * 0.95));
        const shade = 0.82 + rng() * 0.3;
        const cr = style.color[0] * shade;
        const cg = style.color[1] * shade;
        const cb = style.color[2] * shade;
        const ry = (rng() - 0.5) * 0.7; // orientation variee
        const tall = h > style.hMax * 0.5;
        const p = rng();

        if (d.fn === "portuaire") {
          // hangars bas larges + cheminees
          if (p < 0.24) {
            addCylinder(s, wx, 0, wz, foot * 0.22, foot * 0.28, h * 1.5 + 4, 8, cr, cg, cb, 0.1);
          } else {
            addBox(s, wx, 0, wz, foot * 1.15, Math.min(h, 6), foot2, cr, cg, cb, 0.16, ry);
            if (rng() > 0.6)
              addGable(s, wx, Math.min(h, 6), wz, foot * 1.15, 1.4, foot2, cr * 0.9, cg * 0.9, cb * 0.9, ry);
          }
        } else if (style.tiered && tall) {
          if (p < 0.28) {
            // tour ronde (verre)
            const seg = 12;
            addCylinder(s, wx, 0, wz, foot * 0.34, foot * 0.42, h, seg, cr, cg, cb);
            addCylinder(s, wx, h, wz, foot * 0.2, foot * 0.34, 1.5, seg, cr * 0.8, cg * 0.8, cb * 0.8);
          } else if (p < 0.62) {
            // socle + tour elancee
            const podium = h * (0.22 + rng() * 0.12);
            addBox(s, wx, 0, wz, foot * 1.2, podium, foot2 * 1.2, cr * 0.92, cg * 0.92, cb * 0.92, 0.16, ry);
            addBox(s, wx, podium, wz, foot * 0.62, h - podium, foot2 * 0.62, cr, cg, cb, 0.16, ry);
            addBox(s, wx, h, wz, foot * 0.3, 1 + rng() * 2, foot2 * 0.3, cr * 0.8, cg * 0.8, cb * 0.8, 0.16, ry);
            if (rng() > 0.5) addBox(s, wx, h + 1.5, wz, 0.3, 2 + rng() * 3, 0.3, 0.18, 0.18, 0.18, 0.16, ry);
          } else {
            // tour a retraits
            const tiers = 2 + Math.floor(rng() * 2);
            let y = 0;
            let fw = foot;
            let fd = foot2;
            for (let ti = 0; ti < tiers; ti++) {
              const th = (h / tiers) * (0.7 + rng() * 0.5);
              addBox(s, wx, y, wz, fw, th, fd, cr, cg, cb, 0.16, ry);
              y += th;
              fw *= 0.72 + rng() * 0.12;
              fd *= 0.72 + rng() * 0.12;
            }
            addBox(s, wx, y, wz, fw * 0.5, 1 + rng() * 2, fd * 0.5, cr * 0.8, cg * 0.8, cb * 0.8, 0.16, ry);
          }
        } else if ((d.fn === "historique" || d.fn === "humide") && p < 0.7) {
          // batisse a toit en pente
          addBox(s, wx, 0, wz, foot, h, foot2, cr, cg, cb, 0.16, ry);
          addGable(s, wx, h, wz, foot, foot2 * 0.42 + 1, foot2, cr * 0.86, cg * 0.8, cb * 0.72, ry);
        } else if (p < 0.2) {
          // bloc en L (deux corps)
          addBox(s, wx, 0, wz, foot, h, foot2 * 0.55, cr, cg, cb, 0.16, ry);
          addBox(s, wx + foot * 0.28, 0, wz + foot2 * 0.28, foot * 0.5, h * (0.7 + rng() * 0.3), foot2, cr, cg, cb, 0.16, ry);
        } else {
          // bloc simple oriente + edicule
          addBox(s, wx, 0, wz, foot, h, foot2, cr, cg, cb, 0.16, ry);
          if (rng() > 0.5)
            addBox(
              s,
              wx + (rng() - 0.5) * foot * 0.3,
              h,
              wz + (rng() - 0.5) * foot2 * 0.3,
              foot * (0.3 + rng() * 0.3),
              0.6 + rng() * 1.6,
              foot2 * (0.3 + rng() * 0.3),
              cr * 0.75,
              cg * 0.75,
              cb * 0.75,
              0.16,
              ry,
            );
        }
      }
    }
  }
  return sinkToGeometry(s);
}

/** Reseau routier (rubans textures) reliant les quartiers. */
export function buildRoads(districts: DistrictState[]): THREE.BufferGeometry {
  const byId = Object.fromEntries(districts.map((d) => [d.id, d]));
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const width = 2.6;
  for (const [aId, bId] of ROAD_LINKS) {
    const a = byId[aId];
    const b = byId[bId];
    if (!a || !b) continue;
    const [ax, az] = toWorld(a.center[0], a.center[1]);
    const [bx, bz] = toWorld(b.center[0], b.center[1]);
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    const px = (-dz / len) * width;
    const pz = (dx / len) * width;
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

/** Points lumineux (lampadaires) le long des routes -> maille emissive. */
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
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      addBox(s, x + 3, 2.4, z, 0.35, 0.35, 0.35, 1.0, 0.82, 0.5);
    }
  }
  return sinkToGeometry(s);
}

/** Grues portuaires a Quai-Nord (structure metallique). */
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
      addBox(s, x - 1.5, 0, z, 0.6, 14, 0.6, ...col);
      addBox(s, x + 1.5, 0, z, 0.6, 14, 0.6, ...col);
      addBox(s, x, 14, z, 4, 0.8, 0.8, ...col);
      addBox(s, x + 4, 13, z, 10, 0.5, 0.6, 0.4, 0.4, 0.42);
    }
  }
  return sinkToGeometry(s);
}

/** Une eolienne (mat + nacelle + rotor). Rotor separe pour l'animer. */
export function makeTurbine(): { group: THREE.Group; rotor: THREE.Mesh } {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0xd8d8d2,
    roughness: 0.4,
    metalness: 0.2,
  });
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
    // pale : boite fine orientee, empilee via addBox puis rotation par pos
    const bl = 7;
    const bx = Math.cos(a) * bl * 0.5;
    const by = Math.sin(a) * bl * 0.5;
    // approx : petite boite le long de l'angle (subdivisions)
    for (let k = 0; k < 6; k++) {
      const t = k / 6;
      addBox(
        blade,
        Math.cos(a) * bl * t,
        Math.sin(a) * bl * t,
        0,
        0.5 - t * 0.35,
        0.12,
        0.12,
        0.85,
        0.85,
        0.85,
      );
    }
    void bx;
    void by;
  }
  rotor.geometry = sinkToGeometry(blade);
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
  // UV planaires pour le relief de sol
  const p = geo.attributes.position;
  const uv: number[] = [];
  for (let i = 0; i < p.count; i++) uv.push(p.getX(i) / 12, p.getZ(i) / 12);
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

/** Ciel crepusculaire -> texture equirectangulaire (IBL). */
export function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#0f1830");
  grad.addColorStop(0.42, "#26324e");
  grad.addColorStop(0.5, "#4a4d63");
  grad.addColorStop(0.58, "#b3703f");
  grad.addColorStop(0.66, "#7a5a4a");
  grad.addColorStop(1, "#141a20");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
