import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { actions, getState, useSelector, useStore } from "../store/store";
import { DISTRICT_FN_LABEL } from "../sim/data";
import { MAP_METRIC_LABEL, metricValue, rampColor } from "../lib/colors";
import type { AppState } from "../store/store";
import type { DistrictState } from "../sim/types";
import { fmtPop } from "../lib/format";
import {
  buildBuildings,
  districtGroundGeometry,
  FLOW_ROUTES,
  riverGeometry,
  skyTexture,
  toWorld,
  treeGeometry,
  treeMatrices,
} from "../lib/scene3d";

interface GroundEntry {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  border: THREE.LineLoop;
  borderMat: THREE.LineBasicMaterial;
  id: string;
}

interface Flow {
  line: THREE.Line;
  dot: THREE.Mesh;
  pts: THREE.Vector3[];
  color: THREE.Color;
}

interface SceneCtx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  grounds: GroundEntry[];
  buildingMat: THREE.MeshStandardMaterial;
  buildingMesh: THREE.Mesh | null;
  treeMesh: THREE.InstancedMesh | null;
  treeGeo: THREE.BufferGeometry;
  treeMat: THREE.MeshStandardMaterial;
  flows: Flow[];
  raf: number;
  signature: string;
  raycaster: THREE.Raycaster;
}

export function CityScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const ctxRef = useRef<SceneCtx | null>(null);
  const hoverRef = useRef<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const mapMetric = useSelector((s) => s.mapMetric);
  const selected = useSelector((s) => s.selectedDistrict);
  const districts = useStore().projection.byYear[useStore().currentYear].districts;
  const year = useStore().currentYear;

  // — Initialisation three.js —
  useEffect(() => {
    const mount = mountRef.current!;
    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d0f);
    scene.fog = new THREE.Fog(0x0a0d0f, 150, 300);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 1000);
    camera.position.set(-70, 78, 96);

    // Environnement (IBL)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const sky = skyTexture();
    scene.environment = pmrem.fromEquirectangular(sky).texture;
    sky.dispose();
    pmrem.dispose();

    // Lumieres
    const sun = new THREE.DirectionalLight(0xffe9cf, 2.5);
    sun.position.set(58, 96, 44);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 320;
    const sc = 90;
    sun.shadow.camera.left = -sc;
    sun.shadow.camera.right = sc;
    sun.shadow.camera.top = sc;
    sun.shadow.camera.bottom = -sc;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x8090a0, 0x1a1e1a, 0.4));

    // Sol de base
    const baseGeo = new THREE.PlaneGeometry(400, 400);
    baseGeo.rotateX(-Math.PI / 2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f11,
      roughness: 0.98,
      metalness: 0,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.05;
    base.receiveShadow = true;
    scene.add(base);

    // Fleuve
    const water = new THREE.Mesh(
      riverGeometry(7),
      new THREE.MeshStandardMaterial({
        color: 0x14262b,
        roughness: 0.1,
        metalness: 0.5,
        envMapIntensity: 1.4,
      }),
    );
    scene.add(water);

    // Sols de quartiers + contours
    const st0 = getState();
    const ys0 = st0.projection.byYear[st0.currentYear];
    const grounds: GroundEntry[] = [];
    for (const d of ys0.districts) {
      const geo = districtGroundGeometry(d.poly);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(rampColor(st0.mapMetric, metricValue(d, st0.mapMetric))),
        roughness: 0.88,
        metalness: 0.02,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.02;
      mesh.receiveShadow = true;
      mesh.userData.id = d.id;
      scene.add(mesh);

      const edges = new THREE.EdgesGeometry(geo);
      const borderMat = new THREE.LineBasicMaterial({
        color: 0xe9e5d9,
        transparent: true,
        opacity: 0.22,
      });
      const border = new THREE.LineLoop(
        districtGroundGeometry(d.poly),
        borderMat,
      );
      edges.dispose();
      border.position.y = 0.06;
      scene.add(border);
      grounds.push({ mesh, mat, border, borderMat, id: d.id });
    }

    const buildingMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.74,
      metalness: 0.06,
      envMapIntensity: 0.5,
    });

    const treeMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
    });
    const treeGeo = treeGeometry();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 4, 4);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 60;
    controls.maxDistance = 190;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = 1.32;
    controls.rotateSpeed = 0.7;
    controls.update();

    const ctx: SceneCtx = {
      renderer,
      scene,
      camera,
      controls,
      grounds,
      buildingMat,
      buildingMesh: null,
      treeMesh: null,
      treeGeo,
      treeMat,
      flows: [],
      raf: 0,
      signature: "",
      raycaster: new THREE.Raycaster(),
    };
    ctxRef.current = ctx;
    // Hook de debug (dev uniquement) : forcer un rendu synchrone.
    if (import.meta.env.DEV)
      (window as any).__nexusRender = (n = 1) => {
      for (let i = 0; i < n; i++) {
        const s = getState();
        const ys = s.projection.byYear[s.currentYear];
        const sig = `${s.currentYear}|${s.projection.active.join(",")}`;
        if (sig !== ctx.signature) {
          ctx.signature = sig;
          rebuild(ys, s.projection.active);
        }
        for (const g of ctx.grounds) {
          const d = ys.districts.find((x) => x.id === g.id)!;
          g.mat.color.set(rampColor(s.mapMetric, metricValue(d, s.mapMetric)));
        }
        ctx.controls.update();
        ctx.renderer.render(ctx.scene, ctx.camera);
      }
    };

    // — Reconstruction du dynamique (batiments, arbres, flux) —
    const rebuild = (yearState: { districts: DistrictState[] }, active: string[]) => {
      if (ctx.buildingMesh) {
        scene.remove(ctx.buildingMesh);
        ctx.buildingMesh.geometry.dispose();
      }
      const bg = buildBuildings(yearState.districts);
      const bm = new THREE.Mesh(bg, buildingMat);
      bm.castShadow = true;
      bm.receiveShadow = true;
      scene.add(bm);
      ctx.buildingMesh = bm;

      if (ctx.treeMesh) {
        scene.remove(ctx.treeMesh);
        (ctx.treeMesh as any).dispose?.();
      }
      const { matrices, colors } = treeMatrices(yearState.districts);
      const inst = new THREE.InstancedMesh(treeGeo, treeMat, Math.max(1, matrices.length));
      inst.castShadow = true;
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
        inst.setColorAt(i, colors[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.count = matrices.length;
      scene.add(inst);
      ctx.treeMesh = inst;

      // Flux
      for (const f of ctx.flows) {
        scene.remove(f.line);
        scene.remove(f.dot);
        f.line.geometry.dispose();
        f.dot.geometry.dispose();
      }
      ctx.flows = [];
      const byId = Object.fromEntries(yearState.districts.map((d) => [d.id, d]));
      for (const [decId, route] of Object.entries(FLOW_ROUTES)) {
        if (!active.includes(decId)) continue;
        const ds = route.map((id) => byId[id]).filter(Boolean) as DistrictState[];
        if (ds.length < 2) continue;
        const pts = ds.map((d) => {
          const [x, z] = toWorld(d.center[0], d.center[1]);
          return new THREE.Vector3(x, 2.2, z);
        });
        const color = new THREE.Color(decId === "cli-density" ? 0xb07fb8 : 0x7fb0c9);
        const lg = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(
          lg,
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }),
        );
        scene.add(line);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(1.1, 12, 12),
          new THREE.MeshBasicMaterial({ color, toneMapped: false }),
        );
        scene.add(dot);
        ctx.flows.push({ line, dot, pts, color });
      }
    };

    // — Boucle de rendu —
    const clock = new THREE.Clock();
    const tmpColor = new THREE.Color();
    const proj = new THREE.Vector3();

    const loop = () => {
      const s = getState();
      const ys = s.projection.byYear[s.currentYear];
      const t = clock.getElapsedTime();
      const sig = `${s.currentYear}|${s.projection.active.join(",")}`;
      if (sig !== ctx.signature) {
        ctx.signature = sig;
        rebuild(ys, s.projection.active);
      }

      // sols : couleur de la metrique, surbrillance selection/survol
      for (const g of ctx.grounds) {
        const d = ys.districts.find((x) => x.id === g.id)!;
        tmpColor.set(rampColor(s.mapMetric, metricValue(d, s.mapMetric)));
        g.mat.color.lerp(tmpColor, 0.15);
        const isSel = s.selectedDistrict === g.id;
        const isHov = hoverRef.current === g.id;
        g.mat.emissive.copy(g.mat.color);
        g.mat.emissiveIntensity = isSel ? 0.28 : isHov ? 0.14 : 0.05;
        g.borderMat.color.set(isSel ? 0xf2c14e : 0xe9e5d9);
        g.borderMat.opacity = isSel ? 0.9 : isHov ? 0.5 : 0.2;
      }

      // flux animes
      if (!s.reducedMotion) {
        for (const f of ctx.flows) {
          const seg = f.pts.length - 1;
          const prog = ((t / 5) % 1) * seg;
          const si = Math.min(seg - 1, Math.floor(prog));
          const u = prog - si;
          f.dot.position.lerpVectors(f.pts[si], f.pts[si + 1], u);
          f.dot.position.y = 2.2 + Math.sin(t * 2) * 0.3;
        }
      }

      ctx.controls.update();
      ctx.renderer.render(ctx.scene, ctx.camera);

      // projeter les centres pour la couche d'interaction accessible
      const w = ctx.renderer.domElement.clientWidth;
      const h = ctx.renderer.domElement.clientHeight;
      for (const d of ys.districts) {
        const btn = btnRefs.current.get(d.id);
        if (!btn) continue;
        const [x, z] = toWorld(d.center[0], d.center[1]);
        proj.set(x, 6, z).project(ctx.camera);
        const sx = (proj.x * 0.5 + 0.5) * w;
        const sy = (-proj.y * 0.5 + 0.5) * h;
        const visible = proj.z < 1;
        btn.style.transform = `translate(-50%, -50%) translate(${sx}px, ${sy}px)`;
        btn.style.opacity = visible ? "1" : "0";
        btn.style.pointerEvents = visible ? "auto" : "none";
      }

      ctx.raf = requestAnimationFrame(loop);
    };
    ctx.raf = requestAnimationFrame(loop);

    // — Redimensionnement —
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    // — Picking (survol + selection sans drag) —
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let downT = 0;
    const pick = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      ctx.raycaster.setFromCamera(ndc, camera);
      const hits = ctx.raycaster.intersectObjects(
        ctx.grounds.map((g) => g.mesh),
        false,
      );
      return hits.length ? (hits[0].object.userData.id as string) : null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 0) return; // en cours de rotation
      const id = pick(e.clientX, e.clientY);
      if (id !== hoverRef.current) {
        hoverRef.current = id;
        setHoverId(id);
        renderer.domElement.style.cursor = id ? "pointer" : "grab";
      }
    };
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist < 5 && performance.now() - downT < 400) {
        const id = pick(e.clientX, e.clientY);
        if (id) actions.selectDistrict(id);
      }
    };
    const el = renderer.domElement;
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(ctx.raf);
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const any = o as any;
        any.geometry?.dispose?.();
      });
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      ctxRef.current = null;
    };
  }, []);

  const hovered = districts.find((d) => d.id === hoverId);

  return (
    <section className="citymap" aria-label={`Maquette 3D de Meridienne, annee ${year}`}>
      <div className="citymap-frame" ref={wrapRef}>
        <div className="scene3d-mount" ref={mountRef} />
        <div className="citymap-hit" role="group" aria-label="Quartiers">
          {districts.map((d) => (
            <button
              key={d.id}
              ref={(el) => {
                if (el) btnRefs.current.set(d.id, el);
                else btnRefs.current.delete(d.id);
              }}
              className={`district-hit district-hit-3d ${selected === d.id ? "is-selected" : ""}`}
              onClick={() => actions.selectDistrict(d.id)}
              onFocus={() => {
                hoverRef.current = d.id;
                setHoverId(d.id);
              }}
              onBlur={() => {
                hoverRef.current = null;
                setHoverId(null);
              }}
              aria-pressed={selected === d.id}
              aria-label={`${d.name}, ${DISTRICT_FN_LABEL[d.fn]}, ${fmtPop(
                d.population,
              )} habitants, ${MAP_METRIC_LABEL[mapMetric]} ${Math.round(
                metricValue(d, mapMetric) * 100,
              )} sur 100`}
            >
              <span className="district-hit-label">{d.name}</span>
            </button>
          ))}
        </div>
        <MapLegend metric={mapMetric} />
        <MetricSwitch metric={mapMetric} />
        <p className="scene-hint label" aria-hidden="true">
          glisser : pivoter · molette : zoom · clic : quartier
        </p>
        {hovered && !selected && <HoverBadge district={hovered} metric={mapMetric} />}
      </div>
    </section>
  );
}

function MapLegend({ metric }: { metric: AppState["mapMetric"] }) {
  const stops = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="map-legend" aria-hidden="true">
      <span className="label">{MAP_METRIC_LABEL[metric]}</span>
      <div className="legend-ramp">
        {stops.map((t) => (
          <span key={t} style={{ background: rampColor(metric, t) }} />
        ))}
      </div>
      <div className="legend-ends label">
        <span>faible</span>
        <span>eleve</span>
      </div>
    </div>
  );
}

const METRICS: AppState["mapMetric"][] = [
  "pollution",
  "greenery",
  "density",
  "energyUse",
  "satisfaction",
];

function MetricSwitch({ metric }: { metric: AppState["mapMetric"] }) {
  return (
    <div className="map-metric-switch" role="group" aria-label="Couche cartographiee">
      {METRICS.map((mk) => (
        <button
          key={mk}
          className={`btn ${metric === mk ? "is-active" : ""}`}
          aria-pressed={metric === mk}
          onClick={() => actions.setMapMetric(mk)}
        >
          {MAP_METRIC_LABEL[mk]}
        </button>
      ))}
    </div>
  );
}

function HoverBadge({
  district,
  metric,
}: {
  district: DistrictState;
  metric: AppState["mapMetric"];
}) {
  return (
    <div className="hover-badge" aria-hidden="true">
      <strong>{district.name}</strong>
      <span className="label">{DISTRICT_FN_LABEL[district.fn]}</span>
      <span className="num">
        {MAP_METRIC_LABEL[metric]} · {Math.round(metricValue(district, metric) * 100)}
      </span>
    </div>
  );
}
