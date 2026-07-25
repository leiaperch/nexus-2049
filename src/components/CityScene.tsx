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
  BUILDING_BUCKETS,
  buildConstructionCranes,
  buildGreenRoofs,
  buildPortCranes,
  buildRoads,
  buildRooftopSolar,
  smogGeometry,
  buildStreetLights,
  districtGroundGeometry,
  districtLabelHeight,
  FLOW_ROUTES,
  makeBuildingTextures,
  makeConcreteNormal,
  makeRoadTexture,
  makeTurbine,
  makeWaterNormal,
  riverGeometry,
  skyTexture,
  toWorld,
  treeGeometry,
  treeMatrices,
  TURBINE_SPOTS,
  TURBINE_TRIGGERS,
  type Bucket,
} from "../lib/scene3d";

interface GroundEntry {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  border: THREE.LineLoop;
  borderMat: THREE.LineBasicMaterial;
  id: string;
}
interface Flow {
  car: THREE.Mesh;
  line: THREE.Line;
  pts: THREE.Vector3[];
}
interface Turbine {
  group: THREE.Group;
  rotor: THREE.Mesh;
}

interface SceneCtx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  grounds: GroundEntry[];
  buildingMats: Record<Bucket, THREE.MeshStandardMaterial>;
  buildingMeshes: THREE.Mesh[];
  solarMat: THREE.MeshStandardMaterial;
  greenRoofMat: THREE.MeshStandardMaterial;
  craneMat: THREE.MeshStandardMaterial;
  smog: { id: string; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[];
  treeMesh: THREE.InstancedMesh | null;
  treeGeo: THREE.BufferGeometry;
  treeMat: THREE.MeshStandardMaterial;
  roadMesh: THREE.Mesh | null;
  lightMesh: THREE.Mesh | null;
  craneMesh: THREE.Mesh | null;
  flows: Flow[];
  turbines: Turbine[];
  waterNormal: THREE.Texture;
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
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f16);
    scene.fog = new THREE.Fog(0x0b0f16, 150, 320);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 1000);
    camera.position.set(-72, 74, 98);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const sky = skyTexture();
    scene.environment = pmrem.fromEquirectangular(sky).texture;
    sky.dispose();
    pmrem.dispose();

    // Lumiere crepusculaire : soleil rasant chaud
    const sun = new THREE.DirectionalLight(0xffe0c0, 2.2);
    sun.position.set(72, 52, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 340;
    const sc = 92;
    sun.shadow.camera.left = -sc;
    sun.shadow.camera.right = sc;
    sun.shadow.camera.top = sc;
    sun.shadow.camera.bottom = -sc;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x7d97b8, 0x201d18, 1.0));

    // Textures procedurales
    const facades = makeBuildingTextures(renderer);
    const concreteNormal = makeConcreteNormal(renderer);
    const roadTex = makeRoadTexture(renderer);
    const waterNormal = makeWaterNormal(renderer);

    // Sol de base
    const baseGeo = new THREE.PlaneGeometry(420, 420);
    baseGeo.rotateX(-Math.PI / 2);
    const base = new THREE.Mesh(
      baseGeo,
      new THREE.MeshStandardMaterial({ color: 0x0c0f12, roughness: 0.98, metalness: 0 }),
    );
    base.position.y = -0.05;
    base.receiveShadow = true;
    scene.add(base);

    // Fleuve (eau reflechissante animee)
    const water = new THREE.Mesh(
      riverGeometry(7),
      new THREE.MeshStandardMaterial({
        color: 0x0c1a20,
        roughness: 0.12,
        metalness: 0.55,
        envMapIntensity: 1.05,
        normalMap: waterNormal,
        normalScale: new THREE.Vector2(0.32, 0.32),
      }),
    );
    scene.add(water);

    // Sols de quartiers (couche donnee) + contours
    const st0 = getState();
    const ys0 = st0.projection.byYear[st0.currentYear];
    const grounds: GroundEntry[] = [];
    for (const d of ys0.districts) {
      const geo = districtGroundGeometry(d.poly);
      // Socle de terrain : quasi invisible. Les plaques colorees ont
      // disparu — seuls les batiments portent la donnee. Ce maillage
      // reste la pour recevoir les ombres et le clic sur le quartier.
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(
          rampColor(st0.mapMetric, metricValue(d, st0.mapMetric)),
        ).multiplyScalar(0.05),
        roughness: 0.98,
        metalness: 0,
        normalMap: concreteNormal,
        normalScale: new THREE.Vector2(0.35, 0.35),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0;
      mesh.receiveShadow = true;
      mesh.userData.id = d.id;
      scene.add(mesh);
      const borderMat = new THREE.LineBasicMaterial({
        color: 0xe9e5d9,
        transparent: true,
        opacity: 0.22,
      });
      const border = new THREE.LineLoop(districtGroundGeometry(d.poly), borderMat);
      border.position.y = 0.05;
      scene.add(border);
      grounds.push({ mesh, mat, border, borderMat, id: d.id });
    }

    // Une matiere par famille de bâti : reflets, rugosite et eclairage distincts.
    const MAT_TUNE: Record<
      Bucket,
      { rough: number; metal: number; env: number; emi: number; nrm: number }
    > = {
      concrete: { rough: 0.82, metal: 0.02, env: 0.35, emi: 0.2, nrm: 0.9 },
      glass: { rough: 0.16, metal: 0.5, env: 1.0, emi: 0.5, nrm: 0.5 },
      brick: { rough: 0.92, metal: 0.0, env: 0.28, emi: 0.16, nrm: 1.0 },
      industrial: { rough: 0.88, metal: 0.18, env: 0.32, emi: 0.12, nrm: 0.85 },
      dark: { rough: 0.78, metal: 0.06, env: 0.3, emi: 0.16, nrm: 0.9 },
    };
    const buildingMats = {} as Record<Bucket, THREE.MeshStandardMaterial>;
    for (const b of BUILDING_BUCKETS) {
      const t = MAT_TUNE[b];
      buildingMats[b] = new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: facades[b].albedo,
        normalMap: facades[b].normal,
        normalScale: new THREE.Vector2(t.nrm, t.nrm),
        emissiveMap: facades[b].emissive,
        emissive: new THREE.Color(0xffcf92),
        emissiveIntensity: t.emi,
        roughness: t.rough,
        metalness: t.metal,
        envMapIntensity: t.env,
      });
    }

    const treeMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
    });
    const treeGeo = treeGeometry();

    // Routes + lampadaires + grues (statiques)
    const roadMesh = new THREE.Mesh(
      buildRoads(ys0.districts),
      new THREE.MeshStandardMaterial({
        map: roadTex,
        roughness: 0.85,
        metalness: 0.05,
      }),
    );
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    const lightMesh = new THREE.Mesh(
      buildStreetLights(ys0.districts),
      new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    );
    scene.add(lightMesh);

    const craneMesh = new THREE.Mesh(
      buildPortCranes(ys0.districts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.35 }),
    );
    craneMesh.castShadow = true;
    scene.add(craneMesh);

    // Voile de pollution : une nappe par quartier, au-dessus du bâti.
    const smogLayers: {
      id: string;
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
    }[] = [];
    for (const d of ys0.districts) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xc4643a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(smogGeometry(d.poly), mat);
      mesh.position.y = 18;
      mesh.visible = false;
      scene.add(mesh);
      smogLayers.push({ id: d.id, mesh, mat });
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 5, 4);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 58;
    controls.maxDistance = 195;
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
      buildingMats,
      buildingMeshes: [],
      solarMat: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.22,
        metalness: 0.65,
        envMapIntensity: 1.1,
      }),
      greenRoofMat: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0,
      }),
      craneMat: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.6,
        metalness: 0.3,
      }),
      smog: smogLayers,
      treeMesh: null,
      treeGeo,
      treeMat,
      roadMesh,
      lightMesh,
      craneMesh,
      flows: [],
      turbines: [],
      waterNormal,
      raf: 0,
      signature: "",
      raycaster: new THREE.Raycaster(),
    };
    ctxRef.current = ctx;

    const rebuild = (yearState: { districts: DistrictState[] }, active: string[]) => {
      for (const m of ctx.buildingMeshes) {
        scene.remove(m);
        m.geometry.dispose();
      }
      ctx.buildingMeshes = [];
      const metric = getState().mapMetric;
      const tint: Record<string, THREE.Color> = {};
      for (const d of yearState.districts)
        tint[d.id] = new THREE.Color(rampColor(metric, metricValue(d, metric)));
      const { geoms, roofs } = buildBuildings(yearState.districts, tint);
      for (const b of BUILDING_BUCKETS) {
        const g = geoms[b];
        if (g.attributes.position.count === 0) {
          g.dispose();
          continue;
        }
        const m = new THREE.Mesh(g, ctx.buildingMats[b]);
        m.castShadow = true;
        m.receiveShadow = true;
        scene.add(m);
        ctx.buildingMeshes.push(m);
      }

      // — Calques de transformation pilotes par la simulation —
      const st = getState();
      const ind = st.projection.byYear[st.currentYear].indicators;
      const baseline = st.projection.timeline[0].districts;
      const greeneryBy: Record<string, number> = {};
      for (const d of yearState.districts) greeneryBy[d.id] = d.greenery;

      const layers: [THREE.BufferGeometry, THREE.Material, boolean][] = [
        [buildRooftopSolar(roofs, ind.energy), ctx.solarMat, false],
        [buildGreenRoofs(roofs, greeneryBy), ctx.greenRoofMat, false],
        [
          buildConstructionCranes(yearState.districts, baseline),
          ctx.craneMat,
          true,
        ],
      ];
      for (const [g, mat, shadow] of layers) {
        if (g.attributes.position.count === 0) {
          g.dispose();
          continue;
        }
        const m = new THREE.Mesh(g, mat);
        m.castShadow = shadow;
        scene.add(m);
        ctx.buildingMeshes.push(m);
      }

      // voile de pollution : opacite suivant la pollution du quartier
      for (const sm of ctx.smog) {
        const d = yearState.districts.find((x) => x.id === sm.id);
        const p = d ? Math.max(0, (d.pollution - 42) / 58) : 0;
        sm.mesh.visible = p > 0.02;
        sm.mat.opacity = p * 0.3;
        sm.mesh.position.y = 16 + p * 10;
      }

      if (ctx.treeMesh) {
        scene.remove(ctx.treeMesh);
        ctx.treeMesh.dispose();
      }
      const { matrices, colors } = treeMatrices(yearState.districts);
      const inst = new THREE.InstancedMesh(treeGeo, treeMat, Math.max(1, matrices.length));
      inst.castShadow = true;
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
        inst.setColorAt(i, colors[i]);
      }
      inst.count = matrices.length;
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      scene.add(inst);
      ctx.treeMesh = inst;

      // Flux (rames / barges)
      for (const f of ctx.flows) {
        scene.remove(f.car);
        scene.remove(f.line);
        f.car.geometry.dispose();
        f.line.geometry.dispose();
      }
      ctx.flows = [];
      const byId = Object.fromEntries(yearState.districts.map((d) => [d.id, d]));
      for (const [decId, route] of Object.entries(FLOW_ROUTES)) {
        if (!active.includes(decId)) continue;
        const ds = route.map((id) => byId[id]).filter(Boolean) as DistrictState[];
        if (ds.length < 2) continue;
        const pts = ds.map((d) => {
          const [x, z] = toWorld(d.center[0], d.center[1]);
          return new THREE.Vector3(x, 2.4, z);
        });
        const color = new THREE.Color(
          decId.startsWith("cli-") ? 0xb07fb8 : 0x8fd0e6,
        );
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }),
        );
        scene.add(line);
        const car = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 1.2, 1.4),
          new THREE.MeshBasicMaterial({ color, toneMapped: false }),
        );
        scene.add(car);
        ctx.flows.push({ car, line, pts });
      }

      // Eoliennes offshore (si champ eolien actif)
      const wantTurbines = TURBINE_TRIGGERS.some((t) => active.includes(t));
      if (wantTurbines && ctx.turbines.length === 0) {
        for (const [nx, ny] of TURBINE_SPOTS) {
          const t = makeTurbine();
          const [x, z] = toWorld(nx, ny);
          t.group.position.set(x, 0, z);
          scene.add(t.group);
          ctx.turbines.push(t);
        }
      } else if (!wantTurbines && ctx.turbines.length > 0) {
        for (const t of ctx.turbines) scene.remove(t.group);
        ctx.turbines = [];
      }
    };

    const clock = new THREE.Clock();
    const tmpColor = new THREE.Color();
    const proj = new THREE.Vector3();

    const frame = (manual: boolean) => {
      const s = getState();
      const ys = s.projection.byYear[s.currentYear];
      const t = clock.getElapsedTime();
      // Seules les politiques deja promulguees a l'annee courante sont
      // visibles : une ligne votee en 2060 n'existe pas en 2049.
      const activeNow = s.enacted
        .filter((e) => e.year <= s.currentYear)
        .map((e) => e.decisionId);
      const sig = `${s.currentYear}|${s.mapMetric}|${activeNow.join(",")}`;
      if (sig !== ctx.signature) {
        ctx.signature = sig;
        rebuild(ys, activeNow);
      }
      for (const g of ctx.grounds) {
        const d = ys.districts.find((x) => x.id === g.id)!;
        tmpColor.set(rampColor(s.mapMetric, metricValue(d, s.mapMetric))).multiplyScalar(0.05);
        g.mat.color.lerp(tmpColor, manual ? 1 : 0.15);
        const isSel = s.selectedDistrict === g.id;
        const isHov = hoverRef.current === g.id;
        g.mat.emissive.copy(g.mat.color);
        g.mat.emissiveIntensity = isSel ? 1.6 : isHov ? 0.8 : 0.1;
        g.borderMat.color.set(isSel ? 0xf2c14e : 0xe9e5d9);
        g.borderMat.opacity = isSel ? 0.9 : isHov ? 0.5 : 0.2;
      }
      if (!s.reducedMotion) {
        for (const f of ctx.flows) {
          const seg = f.pts.length - 1;
          const prog = ((t / 5) % 1) * seg;
          const si = Math.min(seg - 1, Math.floor(prog));
          const u = prog - si;
          f.car.position.lerpVectors(f.pts[si], f.pts[si + 1], u);
          f.car.position.y = 2.4;
          const dir = f.pts[si + 1].clone().sub(f.pts[si]);
          f.car.rotation.y = Math.atan2(dir.x, dir.z);
        }
        for (const tb of ctx.turbines) tb.rotor.rotation.z = t * 1.3;
        ctx.waterNormal.offset.set(t * 0.02, t * 0.012);
      }
      ctx.controls.update();
      ctx.renderer.render(ctx.scene, ctx.camera);

      // — Etiquettes de quartier —
      // Ancrees au-dessus de la silhouette bâtie, au droit du centroide.
      // On ne les recadre PAS de force : une etiquette plaquee au bord
      // ne designerait plus rien. Hors champ, on la masque.
      const w = ctx.renderer.domElement.clientWidth;
      const h = ctx.renderer.domElement.clientHeight;
      const placed: { x: number; y: number }[] = [];
      const marked = ys.districts
        .map((d) => {
          const [x, z] = toWorld(d.center[0], d.center[1]);
          proj.set(x, districtLabelHeight(d), z).project(ctx.camera);
          return {
            d,
            sx: (proj.x * 0.5 + 0.5) * w,
            sy: (-proj.y * 0.5 + 0.5) * h,
            depth: proj.z,
          };
        })
        // les plus proches se placent d'abord et gardent leur position
        .sort((a, b) => a.depth - b.depth);

      for (const m of marked) {
        const btn = btnRefs.current.get(m.d.id);
        if (!btn) continue;
        const inFrame =
          m.depth < 1 &&
          m.sx > 44 &&
          m.sx < w - 44 &&
          m.sy > 12 &&
          m.sy < h - 12;
        let sy = m.sy;
        if (inFrame) {
          // ecarter verticalement les etiquettes qui se recouvrent
          for (let pass = 0; pass < 6; pass++) {
            const clash = placed.find(
              (p) => Math.abs(p.x - m.sx) < 84 && Math.abs(p.y - sy) < 20,
            );
            if (!clash) break;
            sy = clash.y - 21;
          }
          placed.push({ x: m.sx, y: sy });
        }
        btn.style.transform = `translate(-50%, -50%) translate(${m.sx}px, ${sy}px)`;
        btn.style.opacity = inFrame ? "1" : "0";
        btn.style.pointerEvents = inFrame ? "auto" : "none";
      }
    };

    const loop = () => {
      frame(false);
      ctx.raf = requestAnimationFrame(loop);
    };
    ctx.raf = requestAnimationFrame(loop);

    if (import.meta.env.DEV) {
      (window as any).__nexusRender = (n = 1) => {
        for (let i = 0; i < n; i++) frame(true);
      };
      (window as any).__nexusStats = () => ({
        objets: ctx.scene.children.length,
        maillesBati: ctx.buildingMeshes.length,
        triangles: ctx.renderer.info.render.triangles,
        appels: ctx.renderer.info.render.calls,
        smogVisible: ctx.smog.filter((s) => s.mesh.visible).length,
        arbres: ctx.treeMesh?.count ?? 0,
        eoliennes: ctx.turbines.length,
        flux: ctx.flows.length,
      });
    }

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    const ndc = new THREE.Vector2();
    let downX = 0,
      downY = 0,
      downT = 0;
    const pick = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      ctx.raycaster.setFromCamera(ndc, camera);
      const hits = ctx.raycaster.intersectObjects(ctx.grounds.map((g) => g.mesh), false);
      return hits.length ? (hits[0].object.userData.id as string) : null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons !== 0) return;
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
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 5 && performance.now() - downT < 400) {
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
      for (const b of BUILDING_BUCKETS) {
        facades[b].albedo.dispose();
        facades[b].normal.dispose();
        facades[b].emissive.dispose();
      }
      [concreteNormal, roadTex, waterNormal].forEach((t) => t.dispose());
      scene.traverse((o) => (o as any).geometry?.dispose?.());
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
