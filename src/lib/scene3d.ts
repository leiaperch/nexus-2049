import * as THREE from "three";
import type { DistrictState } from "../sim/types";

// ————————————————————————————————————————————————————————————————
// Geometrie procedurale de Meridienne.
// Tout est construit en code (aucun asset). Les batiments sont fusionnes
// en une seule geometrie (vertex colors) pour tenir en quelques draw calls.
// ————————————————————————————————————————————————————————————————

export const WORLD_W = 128;
export const WORLD_D = 100;

/** Normalise (0..1) -> monde (x,z), y vers le haut. */
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

// — Parametres de forme urbaine par fonction de quartier —
interface FnStyle {
  hMin: number;
  hMax: number;
  color: [number, number, number];
  fill: number; // densite d'implantation de base
  spacing: number;
}
const FN_STYLE: Record<DistrictState["fn"], FnStyle> = {
  portuaire: { hMin: 2.5, hMax: 9, color: [0.42, 0.42, 0.4], fill: 0.5, spacing: 6.2 },
  affaires: { hMin: 8, hMax: 34, color: [0.5, 0.53, 0.58], fill: 0.82, spacing: 5.4 },
  residentiel: { hMin: 5, hMax: 17, color: [0.56, 0.53, 0.47], fill: 0.8, spacing: 5.0 },
  historique: { hMin: 4, hMax: 10, color: [0.62, 0.56, 0.46], fill: 0.72, spacing: 4.4 },
  mixte: { hMin: 5, hMax: 22, color: [0.53, 0.54, 0.5], fill: 0.6, spacing: 5.2 },
  humide: { hMin: 2, hMax: 5, color: [0.44, 0.47, 0.4], fill: 0.16, spacing: 8 },
};

interface BoxSink {
  pos: number[];
  nor: number[];
  col: number[];
}

function pushBox(
  s: BoxSink,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  r: number,
  g: number,
  b: number,
) {
  const x0 = cx - sx / 2,
    x1 = cx + sx / 2,
    y0 = cy,
    y1 = cy + sy,
    z0 = cz - sz / 2,
    z1 = cz + sz / 2;
  // 8 sommets
  const v = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  // faces (quads) avec normale
  const faces: [number[], [number, number, number]][] = [
    [[0, 1, 2, 3], [0, 0, -1]],
    [[5, 4, 7, 6], [0, 0, 1]],
    [[4, 0, 3, 7], [-1, 0, 0]],
    [[1, 5, 6, 2], [1, 0, 0]],
    [[3, 2, 6, 7], [0, 1, 0]],
    [[4, 5, 1, 0], [0, -1, 0]],
  ];
  for (const [idx, n] of faces) {
    const [a, b2, c, d] = idx;
    const tri = [a, b2, c, a, c, d];
    for (const t of tri) {
      s.pos.push(v[t][0], v[t][1], v[t][2]);
      s.nor.push(n[0], n[1], n[2]);
      s.col.push(r, g, b);
    }
  }
}

/**
 * Construit la geometrie fusionnee des batiments de tous les quartiers,
 * hauteur pilotee par la densite, implantation deterministe (rng graine).
 */
export function buildBuildings(districts: DistrictState[]): THREE.BufferGeometry {
  const sink: BoxSink = { pos: [], nor: [], col: [] };
  let seedBase = 1;
  for (const d of districts) {
    const style = FN_STYLE[d.fn];
    const rng = mulberry32(
      (seedBase++ * 2654435761) ^ Math.round(d.density * 7),
    );
    const densF = d.density / 100;
    const fill = Math.min(0.95, style.fill + densF * 0.25);
    const spacing = style.spacing * (1 - densF * 0.18);
    // bbox du polygone
    const xs = d.poly.map((p) => p[0]);
    const ys = d.poly.map((p) => p[1]);
    const minx = Math.min(...xs),
      maxx = Math.max(...xs);
    const miny = Math.min(...ys),
      maxy = Math.max(...ys);
    const stepX = spacing / WORLD_W;
    const stepZ = spacing / WORLD_D;
    for (let nx = minx; nx <= maxx; nx += stepX) {
      for (let ny = miny; ny <= maxy; ny += stepZ) {
        if (rng() > fill) continue;
        const jx = nx + (rng() - 0.5) * stepX * 0.7;
        const jy = ny + (rng() - 0.5) * stepZ * 0.7;
        if (!pointInPoly(jx, jy, d.poly)) continue;
        const [wx, wz] = toWorld(jx, jy);
        const foot = spacing * (0.42 + rng() * 0.28);
        const foot2 = spacing * (0.42 + rng() * 0.28);
        const hBase = style.hMin + (style.hMax - style.hMin) * densF;
        const h = Math.max(1.5, hBase * (0.55 + rng() * 0.85));
        const shade = 0.86 + rng() * 0.24;
        pushBox(
          sink,
          wx,
          0,
          wz,
          foot,
          h,
          foot2,
          style.color[0] * shade,
          style.color[1] * shade,
          style.color[2] * shade,
        );
        // toit / edicule pour les plus hauts
        if (h > style.hMax * 0.55 && rng() > 0.5) {
          pushBox(
            sink,
            wx,
            h,
            wz,
            foot * 0.4,
            1 + rng() * 2,
            foot2 * 0.4,
            style.color[0] * shade * 0.8,
            style.color[1] * shade * 0.8,
            style.color[2] * shade * 0.8,
          );
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(sink.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(sink.nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(sink.col, 3));
  return g;
}

/** Positions des arbres, quantite pilotee par le verdissement du quartier. */
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
    const count = Math.round((d.greenery / 100) * 46 + 2);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963 + rng() * 0.4;
      const r = 0.02 + 0.07 * Math.sqrt(i / Math.max(1, count));
      const nx = d.center[0] + Math.cos(a) * r;
      const ny = d.center[1] + Math.sin(a) * r * 0.82;
      if (!pointInPoly(nx, ny, d.poly)) continue;
      const [wx, wz] = toWorld(nx, ny);
      const s = 0.7 + rng() * 0.8;
      pos.set(wx, 0, wz);
      scl.set(s, s * (0.9 + rng() * 0.5), s);
      m.compose(pos, q, scl);
      matrices.push(m.clone());
      const g = 0.32 + rng() * 0.22;
      colors.push(new THREE.Color(0.14 + rng() * 0.08, g, 0.16 + rng() * 0.06));
    }
  }
  return { matrices, colors };
}

/** Geometrie d'un arbre bas-poly (tronc + houppier), origine au sol. */
export function treeGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.0, 5);
  trunk.translate(0, 0.5, 0);
  const crown = new THREE.ConeGeometry(0.9, 2.2, 7);
  crown.translate(0, 2.0, 0);
  const trunkColors: number[] = [];
  for (let i = 0; i < trunk.attributes.position.count; i++)
    trunkColors.push(0.28, 0.2, 0.13);
  trunk.setAttribute("color", new THREE.Float32BufferAttribute(trunkColors, 3));
  const crownColors: number[] = [];
  for (let i = 0; i < crown.attributes.position.count; i++)
    crownColors.push(1, 1, 1); // teinte via instanceColor
  crown.setAttribute("color", new THREE.Float32BufferAttribute(crownColors, 3));
  return mergeGeoms([trunk, crown]);
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

/** Ruban plat suivant le fleuve. */
export function riverGeometry(width = 6): THREE.BufferGeometry {
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
    const quad = [a1, a2, b2, a1, b2, b1];
    for (const p of quad) {
      pos.push(p.x, 0.08, p.y);
      nor.push(0, 1, 0);
      uv.push((p.x + WORLD_W / 2) / WORLD_W, (p.y + WORLD_D / 2) / WORLD_D);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** Geometrie de sol pour un quartier (polygone triangule, a plat). */
export function districtGroundGeometry(poly: [number, number][]): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  poly.forEach(([nx, ny], i) => {
    const [x, z] = toWorld(nx, ny);
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** Ciel degrade -> texture equirectangulaire pour l'IBL (PMREM). */
export function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#243244");
  grad.addColorStop(0.45, "#3a4a5a");
  grad.addColorStop(0.5, "#6d7a80");
  grad.addColorStop(0.62, "#c8b79a");
  grad.addColorStop(0.72, "#7c8a86");
  grad.addColorStop(1, "#2a3436");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
