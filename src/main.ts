import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { skyTexture, skyMeta } from "./skyGradient";
import { boundsOf, frameBox, framePoints, placeRoot } from "./landmarkViews";
import { clipRoads, campusAreas, inCampus } from "./campusClip";
import { createTerrain, subdividePath, type Terrain, type TerrainGrid } from "./terrain";
import { buildTerrainGround, buildFoundations, drapeSurfaces, liftPlants } from "./terrainMeshes";
import { buildCampusAVenues, prepareVenueTerrain, VENUE_SPOTS, venueBuildings, venuePlantExclusions } from "./aCampusVenues";
import { buildHeritageBuilding, FIFTH_ID, HERITAGE_NAMES, prepareHeritageTerrain, WENZI_ID } from "./aCampusHeritage";
import { BATCH_INFO, BATCH_SPOTS, batchBuildings, batchSpot, buildBatchBuilding, mainTeachingDetails, prepareBatchTerrain } from "./aCampusLandmarkBatch";
import { BATCH2_INFO, BATCH2_SPOTS, batch2Buildings, batch2Spot, buildBatch2Building, prepareBatch2Terrain } from "./aCampusLandmarkBatch2";
import { BATCH4_SHORTCUTS, batch4Buildings, batch4Info, batch4Spec, buildBatch4Building } from "./aCampusLandmarkBatch4";
import { buildContext } from "./context";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { SceneData, Building, Gate } from "./types";
import {
  bboxCenter,
  buildBoundaryLine,
  buildBuildings,
  buildGreen,
  buildGround,
  buildPaving,
  buildRoads,
  buildWater,
  waterMaterial,
} from "./sceneBuilder";
import { buildTrees, type TreeSystem, type Season } from "./trees";
import { buildVegetation, type VegetationSystem } from "./vegetation";
import { disposeGroup, streamLandmarkGLBs } from "./landmarkStream";
import { buildTraffic, type TrafficSystem, type TrafficControls } from "./traffic";
import { buildOverview, type OverviewBuild } from "./overview";
import { buildTourRoutes, type TourRoute } from "./tourRoutes";
import { FreeCam } from "./freecam";
import { SharedPointerLock } from "./pointerLock";
import { campusFromUrl, CAMPUSES, type CampusConfig } from "./campuses";
import { flyBoundsOf } from "./campuses/bounds";
import { initOnboarding } from "./onboarding";
import { cancelFly, flyTo, flyAlong } from "./flyTo";import { LabelLayer } from "./labels";
import {
  BuildingPicker,
  type BuildingUserData,
} from "./interact";
import { initSearch, type SearchItem } from "./search";
import { DayNight, applyBuildingEmissive, type PresetName } from "./dayNight";
import { buildActivity, buildGate, buildGym, buildLikelou, buildLibrary, buildZonghe, gateLabel } from "./landmarks";
import { applyStaticI18n, getLang, localName, onLangChange, setLang, t, tr, type Pair } from "./i18n";
import { buildSportsMarks, sportsSiteAreas } from "./sports";
import { Navigator } from "./navigation";
import { collectPlaces, initPlacesPanel, type PlaceEntry, type PlacesPanel } from "./placesPanel";
import { PLACE_INFO, REFINEMENT_INFO } from "./placesInfo";
import { TOUR_STOPS } from "./tourStops";
import { facadeTexture, roofMaterial } from "./facades";
import {formatSharedView,parseSharedView,sharedDistanceScale} from './shareView';
import {advanceFrame} from './frameTiming';
import {initNavigationPanel} from './navigationPanel';
let navPanel:{rebuild:()=>void}|null=null;
import {WalkWorld} from './walkCollision';
import {Walking} from './walking';
import walkSpawns from '../data/walk_spawns.json';

const app = document.querySelector<HTMLDivElement>("#app")!;
const statsEl = document.querySelector<HTMLDivElement>("#hud-stats")!;
const navStatusEl = document.querySelector<HTMLDivElement>("#nav-status")!;
const mobileLayout=window.matchMedia('(max-width:640px)');
const hud=document.querySelector<HTMLElement>('#hud')!;
let walking:Walking|null=null;
let walkWorld:WalkWorld|null=null;
let freeCam:FreeCam|null=null;
let sharedLock:SharedPointerLock;
let campus:CampusConfig = campusFromUrl(location.search);
let activeTerrain: Terrain | null = null;
let terrainGround: THREE.Group | null = null;
let terrainAttribution = "";
const corridorRequested = new URLSearchParams(location.search).get("terrain") === "corridor";
const inCorridorPreview = () => corridorRequested && campus.id === "shapingba";
const venuesRequested = new URLSearchParams(location.search).get("terrain") === "venues";
const inVenuesPreview = () => venuesRequested && campus.id === "shapingba";
const initialVenue = new URLSearchParams(location.search).get("venue") === "siqun" ? "思群广场" : "风雨操场";
const heritageRequested = new URLSearchParams(location.search).get("terrain") === "heritage";
const inHeritagePreview = () => heritageRequested && campus.id === "shapingba";
const initialHeritage = new URLSearchParams(location.search).get("building") === "wenzi" ? HERITAGE_NAMES[1] : HERITAGE_NAMES[0];
const isHeritageBuilding = (id: Building["id"]) => id === FIFTH_ID || id === WENZI_ID;
const batchMode = new URLSearchParams(location.search).get("terrain") || "batch4";
const inFourthPreview = () => batchMode === "batch4" && campus.id === "shapingba";
const inThirdPreview = () => batchMode === "batch3" && campus.id === "shapingba";
const inSecondPreview = () => batchMode === "batch2" && campus.id === "shapingba";
const hasFourthBatch = inFourthPreview;
const hasThirdBatch = () => inThirdPreview() || hasFourthBatch();
const hasSecondBatch = () => inSecondPreview() || hasThirdBatch();
const inBatchPreview = () => campus.id === "shapingba" && (batchMode === "batch1" || hasSecondBatch());
const thirdSpots = [
  { key:"fifth", name:HERITAGE_NAMES[0], label:"五教" },
  { key:"wenzi", name:HERITAGE_NAMES[1], label:"文字斋" },
  { key:"wind", name:VENUE_SPOTS[0].name, label:"风雨操场" },
  { key:"siqun", name:VENUE_SPOTS[1].name, label:"思群广场" },
] as const;
const previewSpots = batchMode === "batch4" ? BATCH4_SHORTCUTS : batchMode === "batch3" ? thirdSpots
  : batchMode === "batch2" ? BATCH2_SPOTS : BATCH_SPOTS;
const initialBatch = previewSpots.find(s => s.key === new URLSearchParams(location.search).get("landmark")) ?? previewSpots[0];
const replacesBatchBuilding = (id: Building["id"]) => !!batchSpot(id) && id !== 1556523865;
const groundHeight = (x: number, y: number): number => activeTerrain?.heightAt(x, y) ?? 0;
function lakeHeight(id: number | string, x: number, y: number): number {
  return id === 569007995 ? 0 : groundHeight(x, y);
}
function updateCampusUrl(): void {
  const url = new URL(location.href);
  url.searchParams.set("campus", campus.id);
  history.replaceState(null, "", url);
}
function renderCampusTitles(): void {
  const en = getLang() === "en";
  const name = en ? campus.nameEn : campus.nameZh;
  const title = en ? `CQU · ${name} · 3D Map` : `重庆大学${name} 3D 地图`;
  document.title = title;
  document.querySelector("#brand")!.setAttribute("aria-label", title);
  document.querySelector("#brand small")!.textContent = en ? `${name} · 3D Map` : `${name} · 三维校园地图`;
  const hudTitle = tr(campus.hudTitle);
  const terrainLabel = en ? "Terrain preview" : "地形预览";
  document.querySelector("#hud-head .title")!.textContent = inFourthPreview()
    ? (en ? "Explore Shapingba Campus A" : "探索沙坪坝 A 区")
    : inThirdPreview()
    ? (en ? "Campus A · Third refinement batch" : "A 区 · 第三批精修")
    : inSecondPreview()
    ? (en ? "Campus A · Second landmark batch" : "A 区 · 第二批地标")
    : inBatchPreview()
    ? (en ? "Campus A · First landmark batch" : "A 区 · 第一批地标")
    : inHeritagePreview()
    ? (en ? "Campus A · Fifth Building and Wenzi Zhai" : "A 区 · 第五教学楼与文字斋")
    : inVenuesPreview()
    ? (en ? "Campus A · Outdoor venues" : "A 区 · 风雨操场与思群广场")
    : inCorridorPreview()
    ? (en ? "Campus A · Dorm 9 to Film School" : "A 区 · 九舍至美视电影学院")
    : activeTerrain ? hudTitle + " · " + terrainLabel : hudTitle;
  const corridorNote = document.querySelector<HTMLElement>("#corridor-note")!;
  corridorNote.hidden = !(inCorridorPreview() || inVenuesPreview() || inHeritagePreview() || inBatchPreview());
  corridorNote.textContent = inFourthPreview() ? (en
    ? "Campus landmarks and terrain · Building details and local grades are approximate"
    : "校园地标与地形 · 建筑细节和局部标高为估算") : inThirdPreview() ? (en
    ? "Four sites · Details from photographs · Steps and local grades are approximate"
    : "第三批 4 处 · 按照片精修 · 台阶与局部地坪暂估") : inSecondPreview() ? (en
    ? "Seven sites · Hall and pavilion placements and local grades are provisional"
    : "第二批 7 处 · 礼堂与寅初亭落点、局部地坪暂估") : inBatchPreview() ? (en
    ? "Seven landmarks · Photo-based models · Site dimensions are approximate"
    : "第一批 7 处 · 按校方资料与影像建模 · 构件与地坪尺寸暂估") : inHeritagePreview() ? (en
    ? "Rebuilt from university photographs · Dimensions are approximate"
    : "按校方实拍重建 · 几何尺寸暂估") : inVenuesPreview() ? (en
    ? "Photo-based venue preview · Step dimensions and elevations are approximate"
    : "按实拍与航拍还原 · 台阶尺寸和标高暂估") : en
    ? "Preview 01 · FABDEM 30 m · Pads are estimates. Gold marks show the DEM sampling road."
    : "局部预览 01 · FABDEM 约 30 米 · 楼前平台标高暂估。金线为高程取样路段。";
  const terrainSource = document.querySelector<HTMLElement>("#terrain-source")!;
  terrainSource.hidden = !activeTerrain;
  terrainSource.textContent = terrainAttribution;
  document.querySelector("#about-title")!.textContent = title;
  document.querySelector("#watermark")!.textContent = `${title} · zhipengGui`;
}

let searchApi:{setItems(next:import("./search").SearchItem[]):void}|null=null;
const byName = new Map<string, THREE.Mesh>();
let dragLook:{x:number;y:number;id:number}|null=null;

// ---- 自由视角 ----
function enterFreeCam():void{
  if(!freeCam)return;
  if(freeCam.active){freeCam.exit();return;}
  walking?.exit();
  if(tour.on)setTour(false);
  if(navMode)setNavMode(false);
  if(followTarget)exitFollow();
  if(flagMode)setFlagMode(false);
  if(freeCam.enter()){
    document.body.classList.add('freecam-mode');
    picker?.setEnabled(false);
    document.querySelector('#freecam-speed')!.textContent=`${Math.round(freeCam.speed)} m/s`;
    showToast(t("flyEntered"));
    if(matchMedia('(pointer: coarse)').matches){
      document.body.classList.add('freecam-touch');
      if(matchMedia('(orientation: portrait)').matches)showToast(t("flyRotateHint"));
    }
  }
}
document.querySelector("#tl-fly")!.addEventListener("click",(e)=>{
  (e.currentTarget as HTMLButtonElement).blur(); // 防 Space 回触按钮
  enterFreeCam();
});
window.addEventListener("wheel",(e)=>{if(freeCam?.active){freeCam.wheel(e.deltaY);}},{passive:true});

let sceneData:SceneData|null=null;
let walkViewport:[number,number]=[0,0];
hud.classList.toggle('collapsed',mobileLayout.matches);
document.querySelector('#hud-fold')!.setAttribute('aria-expanded',String(!mobileLayout.matches));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
let shadowDirty=true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
app.appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0;
renderer.domElement.addEventListener("pointerdown", () => renderer.domElement.focus());

let scene = new THREE.Scene();
// 程序化天空兼作背景与环境反射（skyGradient，dayNight 切换预设）
scene.background = skyTexture("day");
scene.environment = skyTexture("day");
scene.environmentIntensity = skyMeta("day").envInt;

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 2, 18000);
const HOME_VIEW = { pos: new THREE.Vector3(520, 545, 880), target: new THREE.Vector3(0, 10, 0) };
camera.position.copy(HOME_VIEW.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME_VIEW.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 12;
controls.maxDistance = 8500;

const hemi = new THREE.HemisphereLight(0xcfe5ff, 0xb8b09a, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 1.8);
sun.position.set(600, 900, 350);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -1700;
sun.shadow.camera.right = 1700;
sun.shadow.camera.top = 1700;
sun.shadow.camera.bottom = -1700;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 4500;
sun.shadow.bias = -0.00008;
sun.shadow.normalBias = .07;
scene.add(sun);
scene.add(sun.target);

let labels = new LabelLayer(app);
scene.add(labels.root);

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  if(walking?.active)camera.clearViewOffset();else camera.setViewOffset(window.innerWidth, window.innerHeight,
    window.innerWidth > 640 ? -150 : 0, window.innerWidth <= 640 ? window.innerHeight * .20 : 0,
    window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labels.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", () => {
  resize();
  if(walking?.active)return;
  if(navMode&&routeNavigator?.result)focusRoute();
  else if (document.querySelector("#hud")!.classList.contains("detail-mode")) {
    if (flyTargetBuilding) focusBuilding(flyTargetBuilding, lastBuildingView);
    else if (selectedPlace) focusPlace(selectedPlace);
  } else homeView();
});
resize();

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function pickGround(ray: THREE.Raycaster): THREE.Vector3 | null {
  if (terrainGround) return ray.intersectObject(terrainGround, true)[0]?.point ?? null;
  return ray.ray.intersectPlane(groundPlane, new THREE.Vector3());
}
let downAt: [number, number] | null = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
  downAt = [e.clientX, e.clientY];
  cancelFly();
});
renderer.domElement.addEventListener("pointerup", (e) => {
  const d = downAt;
  downAt = null;
  if (!d || !navMode || !routeNavigator) return;
  const maxMove = e.pointerType === "touch" ? 10 : 6;
  if (Math.hypot(e.clientX - d[0], e.clientY - d[1]) > maxMove) return;
  // The building picker owns building taps; do not also set the ground behind it.
  if (picker?.hitAt(e.clientX, e.clientY)) return;
  raycaster.setFromCamera(
    new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1),
    camera,
  );
  const pt = pickGround(raycaster);
  if (pt) routeNavigator.clickGround(pt.x, pt.z);
});

// ---- 信息卡（已并入面板详情模式；此处仅保留导航面板状态）----
let dayNight: DayNight | null = null;
let picker: BuildingPicker | null = null;
let routeNavigator: Navigator | null = null;
let navMode = false;
let panel: PlacesPanel | null = null;
let places: PlaceEntry[] = [];
const boundaryLines: THREE.LineLoop[] = [];
let lastBuildingView = "overview";
let selectedPlace:(import("./placesPanel").PlaceEntry)|null=null;

// ---- 图层分组 ----
let gGreen = new THREE.Group();
let gSports = new THREE.Group();
let gWater = new THREE.Group();
let gRoads = new THREE.Group();
let gTrees = new THREE.Group();
let gTraffic = new THREE.Group();
gTraffic.name = "g-traffic";
let gContext = new THREE.Group();
scene.add(gGreen, gSports, gWater, gRoads, gTrees, gTraffic, gContext);

// ---- GLB ----
const gltfLoader = new GLTFLoader();
let GLB_LANDMARKS = new Set(["library", "info", "gym", "gongke", "activity", "zonghe", "teaching1", "likelou", "science", "canteen1", "canteen2", "canteen3", "hospital", "hospital_opd", "lab2", "lab3", "pharma", "pharma_rc", "gongpei", "xyiyuan"]);
let PRIORITY_ASSETS = new Set(["zonghe", "teaching1", "info", "library", "likelou", "gym", "activity", "gongke", "science", "canteen1", "canteen2", "canteen3", "hospital", "hospital_opd", "lab2", "lab3", "pharma", "pharma_rc", "gongpei", "xyiyuan"]);
const draco = new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL + "draco/");
gltfLoader.setDRACOLoader(draco);
const detailAssets: { root: THREE.Group; far: THREE.Group; asset: string; building: Building; near?: THREE.Group; requested: boolean }[] = [];
const GLB_GATES: Record<string, string> = { 北门: "gate_north", 东门: "gate_east", 西门: "gate_west" };

function bboxCenterOfBuilding(b: Building): [number, number] {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of b.polygon) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

function tagAsset(g: THREE.Group, b: Building, root: THREE.Group): void {
  const [cx, cy] = bboxCenterOfBuilding(b);
  g.traverse((o) => {
    if (typeof o.userData.courtX === "number") {
      root.userData.court = new THREE.Vector3(o.userData.courtX, 2, -o.userData.courtNorth);
      root.userData.courtRadius = o.userData.courtRadius;
    }
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true; mesh.receiveShadow = true;
    Object.assign(mesh.userData, { id: b.id, name: b.name, type: b.type, style: b.style,
      height: b.height, heightSource: b.heightSource, area: b.area, cx, cy: -cy, pickRoot: root });
  });
  applyBuildingEmissive(g);
}

function filmTheaterCupola(cx: number, cy: number): THREE.Group {
  const cupola = new THREE.Group();
  cupola.name = "film-theater-cupola";
  // Official facade photos and aerial imagery establish the form and roof location. Dimensions are approximate.
  cupola.position.set(302.5 - cx, 9.3, cy - 354.25);
  const stone = new THREE.MeshLambertMaterial({ color: 0xe4dfd0 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x53666c });
  const shell = new THREE.MeshLambertMaterial({ color: 0xb1aaa0 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(9.1, 9.1, 2.8, 32), stone);
  drum.position.y = 1.4;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9.1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), shell);
  dome.scale.y = 0.53;
  dome.position.y = 2.8;
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 1.5, 12), stone);
  lantern.position.y = 7.95;
  cupola.add(drum, dome, lantern);
  const opening = new THREE.BoxGeometry(1.2, 1.55, 0.14);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const window = new THREE.Mesh(opening, glass);
    window.position.set(Math.sin(angle) * 9.11, 1.48, Math.cos(angle) * 9.11);
    window.rotation.y = angle;
    cupola.add(window);
  }
  return cupola;
}

async function loadLandmarkGLB(asset: string, b: Building, base: number): Promise<THREE.Group | null> {
  if (!GLB_LANDMARKS.has(asset)) return null;
  const priority = PRIORITY_ASSETS.has(asset);
  const sourceScene = scene;
  try {
    const gltf = await gltfLoader.loadAsync(`${campus.modelDir}/` + asset + (priority ? ".far" : "") + ".glb?v=17");
    if (sourceScene !== scene) {
      disposeGroup(gltf.scene);
      return null;
    }
    const root = new THREE.Group();
    const [cx, cy] = bboxCenterOfBuilding(b);
    root.position.set(cx, base, -cy); root.name = b.name;
    root.add(gltf.scene); tagAsset(gltf.scene, b, root);
    if ((inCorridorPreview() || inHeritagePreview() || inBatchPreview()) && b.id === 1556523934) {
      const cupola = filmTheaterCupola(cx, cy);
      tagAsset(cupola, b, root);
      root.add(cupola);
    }
    if (inBatchPreview() && b.id === 1556523865) {
      const details = mainTeachingDetails(cx, cy);
      tagAsset(details, b, root);
      root.add(details);
    }
    if (priority) detailAssets.push({root, far: gltf.scene, asset, building: b, requested: false});
    return root;
  } catch (error) {
    if (sourceScene !== scene) return null;
    console.warn("地标模型加载失败，使用回退建筑", asset, error);
    notifyModelFallback();
    return null;
  }
}

function updateDetailAssets(): void {
  for(const mesh of gSports.children)if(['sports-net','sports-orange','sports-glass'].includes(mesh.name))
    mesh.visible=resolveHighQuality()&&camera.position.distanceTo(controls.target)<800;
  for (const entry of detailAssets) {
    const close = resolveHighQuality() && camera.position.distanceTo(entry.root.position) < 650;
    if (entry.near) { if(entry.near.visible!==close)shadowDirty=true;entry.near.visible = close; entry.far.visible = !close; }
    else if (close && !entry.requested) {
      entry.requested = true;
      const sourceScene = scene;
      void gltfLoader.loadAsync(`${campus.modelDir}/` + entry.asset + ".glb?v=17").then((gltf) => {
        if (sourceScene !== scene) {
          disposeGroup(gltf.scene);
          return;
        }
        entry.near = gltf.scene; tagAsset(gltf.scene, entry.building, entry.root);
        entry.root.add(gltf.scene);
        shadowDirty=true;
      }).catch(() => { if (sourceScene === scene) notifyModelFallback(); });
    }
  }
}

function loadGateGLB(asset: string, gate: Gate): Promise<THREE.Group | null> {
  return new Promise((resolve) => {
    gltfLoader.load(
      `${campus.modelDir}/` + asset + ".glb?v=17",
      (gltf) => {
        const g = gltf.scene;
        g.position.set(gate.x, 0, -gate.y);
        g.rotation.y = (gate.angle * Math.PI) / 180 + Math.PI / 2;
        g.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) mesh.castShadow = true;
        });
        resolve(g);
      },
      undefined,
      () => {notifyModelFallback();resolve(null);},
    );
  });
}
function notifyModelFallback():void {
  const status=document.querySelector<HTMLElement>('#asset-status')!;
  status.hidden=false;status.textContent='部分模型暂未加载，已保留简化外观；刷新页面可重试。';
}

function fallbackLandmark(b: Building): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape(b.polygon.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const hole of b.holes) {
    shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(b.height, 6), bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const tex = facadeTexture("teaching", 0).clone();
  tex.needsUpdate = true;
  tex.repeat.set(1, Math.max(1, Math.round(b.height / 3.3)));
  const mesh = new THREE.Mesh(geo, [roofMaterial, new THREE.MeshLambertMaterial({ map: tex })]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const [cx, cy] = bboxCenterOfBuilding(b);
  mesh.userData = { id: b.id, name: b.name, type: b.type, style: b.style,
    height: b.height, heightSource: b.heightSource, area: b.area, cx, cy: -cy };
  g.add(mesh);
  return g;
}

// ---- 详情卡（面板内 gxu 式）----
function openDetail(it: PlaceEntry): void {
  selectedPlace=it;
  flyTargetBuilding = it.mesh ?? null;
  const hud = document.querySelector("#hud")!;
  hud.classList.remove('collapsed');
  document.querySelector('#hud-fold')!.setAttribute('aria-expanded','true');
  hud.classList.add("detail-mode");
  document.querySelector("#place-detail")!.classList.add("open");
  (document.querySelector("#pd-num") as HTMLElement)!.textContent = it.num;
  document.querySelector("#pd-name")!.textContent = localName(it.name);
  // 居民楼/周边建筑标注（ring tier → 类别后缀）
  let kindLabel = it.kind === "water" ? t("kindWater") : it.kind === "gate" ? t("kindGate") : it.kind==='sports'?t("kindSports"):t("kindBuilding");
  if (it.mesh) {
    const bid = (it.mesh.userData as BuildingUserData).id;
    const bd = (sceneData?.buildings ?? []).find((x) => String(x.id) === String(bid));
    if (bd?.tier === "ring") kindLabel = t("kindResidential");
  }
  const meta: string[] = [kindLabel];
  (document.querySelector('.building-views') as HTMLElement).style.display=it.mesh?'flex':'none';
  if (it.mesh) {
    const d = it.mesh.userData as BuildingUserData;
    meta.push(`${d.height} m`, `${d.area.toLocaleString()} m²`);
  }
  document.querySelector("#pd-meta")!.textContent = meta.join(" · ");
  const info = (hasFourthBatch() && it.mesh ? batch4Info(it.mesh.userData.id) : undefined)
    ?? (hasThirdBatch() ? REFINEMENT_INFO[it.name] : undefined)
    ?? (hasSecondBatch() ? BATCH2_INFO[it.name] : undefined)
    ?? (inBatchPreview() ? BATCH_INFO[it.name] : undefined) ?? PLACE_INFO[it.name];
  document.querySelector("#pd-desc")!.textContent =
    (getLang() === "en" ? info?.descEn : info?.desc) ?? t("descFallback");
  const photo = document.querySelector("#pd-photo") as HTMLElement;
  photo.style.backgroundImage = info?.photo ? `url(${info.photo})` : "none";
  photo.hidden = !info?.photo;
  labels.active = it.name;
  if (it.mesh) meta.push(it.mesh.userData.heightSource === "override" ? t("heightCalibrated") : t("heightEstimated"));
  document.querySelector("#pd-meta")!.textContent = meta.join(" · ");
  panel?.setActive(it.name);
}

function closeDetail(): void {
  selectedPlace=null;
  labels.active = "";
  flyTargetBuilding = null;
  document.querySelector("#hud")!.classList.remove("detail-mode");
  document.querySelector("#place-detail")!.classList.remove("open");
}

function focusBuilding(mesh: THREE.Mesh | null, view = "overview"): void {
  if (!mesh) return;
  lastBuildingView = view;
  const box = boundsOf(mesh);
  const rect=mapRect();
  const usableWidth=rect.right-rect.left,usableHeight=rect.bottom-rect.top;
  const fit = frameBox(box, camera.fov, {width: window.innerWidth, height: window.innerHeight, usableWidth, usableHeight});
  const center = fit.target;
  let distance = fit.distance;
  let dir = new THREE.Vector3(.70,.80,1.0);
  if (view === "facade") { dir.set(.2,.35,1); distance *= .82; }
  const id = mesh.userData.id;
  if ((inHeritagePreview() || inBatchPreview()) && isHeritageBuilding(id) && (view === "overview" || view === "facade")) {
    const elevation = view === "facade" ? .23 : .56;
    dir = id === FIFTH_ID ? new THREE.Vector3(.22, elevation, -1) : new THREE.Vector3(-.58, elevation, 1);
    if (id === WENZI_ID) distance *= .86;
    if (hasThirdBatch() && view === "facade") {
      const entry = id === FIFTH_ID ? new THREE.Vector3(0,4.6,-14) : new THREE.Vector3(1.5,3.2,7.3);
      center.copy(placeRoot(mesh).localToWorld(entry));
      distance *= .50;
    }
  }
  const batch = (hasSecondBatch() ? batch2Spot(id) : undefined) ?? (inBatchPreview() && batchSpot(id));
  if (batch && (view === "overview" || view === "facade")) {
    dir = new THREE.Vector3(...batch.view);
    if (view === "facade") dir.y *= .55;
    if (id === 1556523865 && view === "facade") {
      center.set(273, box.min.y + 11, -699.6);
      distance = Math.max(100, distance * .49);
    } else if (batch.key !== "main") distance *= .9;
  }
  const root = placeRoot(mesh);
  const batch4Front = root.userData.batch4Front as [number,number] | undefined;
  if (batch4Front && (view === "overview" || view === "facade")) {
    const [x,z] = batch4Front;
    dir.set(x-.42*z,view === "facade" ? .26 : .57,z+.42*x);
    if (view === "facade") {
      center.copy(root.localToWorld(root.userData.batch4Entry.clone()));
      distance *= .64;
    }
  }
  if (view === "court") {
    dir.set(.35,1.2,.85); distance = Math.max(75,distance*.36);
    if (root.userData.court) center.copy(root.localToWorld((root.userData.court as THREE.Vector3).clone()));
    if (root.userData.courtRadius) {
      distance=THREE.MathUtils.clamp(root.userData.courtRadius*2.3,45,90);
      center.y=(mesh.userData as BuildingUserData).height*.35;
    }
  }
  // Compose into the actual free area, not behind the side/bottom panel.
  composeRect(rect);
  flyTo(camera, controls, center, distance, 1100, dir);
}

function mapRect() {
  const width=window.innerWidth,height=window.innerHeight,panel=hud.getBoundingClientRect();
  const brand=document.querySelector('#brand')!.getBoundingClientRect();
  const bottom=navMode?document.querySelector('#nav-panel')!.getBoundingClientRect().top-16:height-24;
  return width>640?{left:hud.classList.contains('collapsed')?24:panel.right+20,right:width-72,top:brand.bottom+18,bottom:Math.min(height-24,bottom)}
    :{left:12,right:width-12,top:Math.max(brand.bottom+16,72),bottom:navMode?bottom:Math.min(height-24,panel.top-16)};
}
function composeRect(rect:ReturnType<typeof mapRect>):void {
  camera.setViewOffset(innerWidth,innerHeight,innerWidth/2-(rect.left+rect.right)/2,innerHeight/2-(rect.top+rect.bottom)/2,innerWidth,innerHeight);
}
function focusPlace(it:SearchItem):void {
  if(it.mesh){focusBuilding(it.mesh);return;}
  const rect=mapRect();composeRect(rect);
  if ((inVenuesPreview() || hasThirdBatch()) && VENUE_SPOTS.some(spot => spot.name === it.name)) {
    const wind = it.name === "风雨操场";
    const third = hasThirdBatch();
    const baseDistance = wind ? (third ? 132 : 150) : third ? 312 : 337;
    const scale = Math.max(1, .76 * innerHeight / Math.max(100, rect.bottom - rect.top), .57 * innerHeight / Math.max(100, rect.right - rect.left));
    const direction = wind ? (third ? new THREE.Vector3(-.91,.40,.09) : new THREE.Vector3(-.83,.68,.74))
      : third ? new THREE.Vector3(-.76,.85,-.59) : new THREE.Vector3(-.52,.91,1.1);
    flyTo(camera, controls, it.target, baseDistance * scale, 1100, direction);
    return;
  }
  let distance=it.distance;
  if(it.extent) {
    const {width,length}=it.extent;
    const box=new THREE.Box3(it.target.clone().add(new THREE.Vector3(-width/2,0,-length/2)),it.target.clone().add(new THREE.Vector3(width/2,5,length/2)));
    distance=frameBox(box,camera.fov,{width:innerWidth,height:innerHeight,usableWidth:rect.right-rect.left,usableHeight:rect.bottom-rect.top}).distance;
  }
  flyTo(camera,controls,it.target,distance,1100,new THREE.Vector3(.35,1.3,1));
}
function homeView(): void {
  const customLandmark = new URLSearchParams(location.search).has("landmark");
  if (inVenuesPreview() || inHeritagePreview() || (inBatchPreview() && (!inFourthPreview() || customLandmark))) {
    const initial = inBatchPreview() ? initialBatch.name : inHeritagePreview() ? initialHeritage : initialVenue;
    const place = places.find(item => item.name === initial);
    if (place) { focusPlace(place); return; }
  }
  if (!campusPoints.length) return;
  const width=window.innerWidth,height=window.innerHeight,rect=mapRect();
  // 宿舍统一 6 层后校园垂直占比变大，压低俯角+收紧取景边距让全景宽度保持满框
  const corridor = inCorridorPreview();
  const direction = corridor ? new THREE.Vector3(-0.8, 0.72, 1.05) : new THREE.Vector3(...campus.homeDirection);
  const points = corridor ? [
    new THREE.Vector3(196, 0, -128), new THREE.Vector3(324, 0, -128),
    new THREE.Vector3(200, 12, -405), new THREE.Vector3(339, 15, -405),
  ] : campusPoints;
  const fit=framePoints(points,camera.fov,{width,height},rect,direction);
  camera.setViewOffset(width,height,fit.offset.x,fit.offset.y,width,height);
  flyTo(camera,controls,fit.target,fit.distance,1100,direction);
}

function selectPlace(it: SearchItem): void {
  walking?.exit();
  if (navMode && routeNavigator) {
    routeNavigator.setPlace(routeNavigator.pickEndpoint??'end',it.name,it.target.x,it.target.z);
    return;
  }
  if (it.mesh) picker?.select(it.mesh);
  else picker?.clearSelection();
  openDetail(it as PlaceEntry);
  focusPlace(it);
}

// ---- 场景加载 ----
const campusPoints: THREE.Vector3[] = [];
let buildingsRef: THREE.Group | null = null;
async function loadScene(): Promise<void> {
  const res = await fetch(campus.sceneUrl);
  if (!res.ok) throw new Error("scene.json 加载失败 (HTTP " + res.status + ")");
  const data: SceneData = await res.json();
  const corridor = inCorridorPreview();
  const venues = inVenuesPreview();
  const batch = inBatchPreview();
  const fourth = hasFourthBatch();
  const third = hasThirdBatch();
  const second = hasSecondBatch();
  const replacedByBatch = (id: Building["id"]) => (batch && replacesBatchBuilding(id))
    || (second && !!batch2Spot(id)) || (fourth && !!batch4Spec(id));
  const heritage = inHeritagePreview() || batch;
  const revisedVenues = venues || heritage;
  const revisedCorridor = corridor || heritage;
  let venueTerrain: ReturnType<typeof prepareVenueTerrain> | undefined;
  let pads: Record<string, number> = {};
  let samplePath: [number, number][] = [];
  if (revisedCorridor) {
    const response = await fetch(import.meta.env.BASE_URL + "data/shapingba-corridor.json");
    if (!response.ok) throw new Error("Corridor data loading failed");
    const overlay: { sourceBuilding: number; buildings: Building[]; pads: Record<string, number>; samplePath: [number, number][] } = await response.json();
    data.buildings = data.buildings.flatMap(b => b.id === overlay.sourceBuilding ? overlay.buildings : [b]);
    pads = overlay.pads;
    if (corridor) samplePath = overlay.samplePath;
  }
  if (revisedVenues) data.buildings = venueBuildings(data.buildings);
  if (batch) data.buildings = batchBuildings(data.buildings);
  if (second) data.buildings = batch2Buildings(data.buildings);
  if (fourth) data.buildings = batch4Buildings(data.buildings);
  if (heritage) data.buildings = data.buildings.map(b => isHeritageBuilding(b.id) ? {
    ...b, name: b.id === WENZI_ID ? HERITAGE_NAMES[1] : HERITAGE_NAMES[0],
    height: b.id === FIFTH_ID ? 20.6 : 7.21, heightSource: "default",
  } : b);
  sceneData=data;

  const terrainMode = new URLSearchParams(location.search).get("terrain");
  if (campus.id === "shapingba" && (terrainMode === "1" || corridor || venues || heritage) && data.boundary) {
    const terrainResponse = await fetch(import.meta.env.BASE_URL + (corridor || venues || heritage
      ? "data/shapingba-corridor-terrain.json" : "data/shapingba-terrain.json"));
    if (!terrainResponse.ok) throw new Error("Terrain grid loading failed");
    const grid: TerrainGrid & { attribution: string } = await terrainResponse.json();
    venueTerrain = revisedVenues ? prepareVenueTerrain(grid) : undefined;
    const finishedTerrain = venueTerrain?.grid ?? grid;
    const heritageTerrain = heritage ? prepareHeritageTerrain(finishedTerrain, data.buildings) : undefined;
    if (heritageTerrain) Object.assign(pads, heritageTerrain.pads);
    const baseGrid = heritageTerrain?.grid ?? finishedTerrain;
    const batchTerrain = batch ? prepareBatchTerrain(baseGrid, data.buildings) : undefined;
    if (batchTerrain) Object.assign(pads, batchTerrain.pads);
    const earlierGrid = batchTerrain?.grid ?? baseGrid;
    const secondTerrain = second ? prepareBatch2Terrain(earlierGrid, data.buildings) : undefined;
    if (secondTerrain) Object.assign(pads, secondTerrain.pads);
    activeTerrain = createTerrain(secondTerrain?.grid ?? earlierGrid);
    terrainAttribution = grid.attribution + (revisedVenues ? " Venue grades and terraces are approximate reconstructions from CQU photography." : "")
      + (heritage ? " Ground around Fifth Building and Wenzi Zhai is locally fitted to estimated thresholds." : "");
    terrainGround = buildTerrainGround(scene, activeTerrain, data.boundary.pts);
  } else {
    buildGround(scene);
  }
  if (data.boundary && !activeTerrain) {
    const shape = new THREE.Shape(data.boundary.pts.map(([x,y]) => new THREE.Vector2(x,y)));
    const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI/2);
    const campusGround = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color: 0xa7b690}));
    campusGround.position.y = -.15; campusGround.receiveShadow = true; scene.add(campusGround);
  }
  const campusRings = ((data as { boundaries?: [number, number][][] }).boundaries?.length
    ? (data as { boundaries?: [number, number][][] }).boundaries
    : data.boundary ? [data.boundary.pts] : []) as [number, number][][];
  const campusGreen = campusAreas(data.green, campusRings);
  const campusWater = campusAreas(data.water, campusRings);
  buildGreen(gGreen, gSports, campusGreen);
  buildSportsMarks(gSports, campusGreen, revisedVenues, third);
  buildPaving(gRoads, campusAreas(data.paving, campusRings));
  buildRoads(gRoads, data.boundary ? clipRoads(data.roads, data.boundary.pts) : data.roads);
  if (activeTerrain) {
    for (const water of campusWater) {
      const layer = new THREE.Group();
      const [x, y] = bboxCenter(water.outers[0]);
      layer.position.y = lakeHeight(water.id, x, y);
      gWater.add(layer);
      buildWater(layer, [water]);
    }
    for (const layer of [gGreen, gSports, gRoads]) drapeSurfaces(layer, groundHeight);
  } else {
    buildWater(gWater, campusWater);
  }
  if (venueTerrain) buildCampusAVenues(gSports, venueTerrain, groundHeight, third);
  if (samplePath.length) {
    const lifted = ([x, y]: [number, number]) => new THREE.Vector3(x, groundHeight(x, y) + 0.55, -y);
    const color = 0xffcf6a;
    const profileLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(subdividePath(samplePath, 2).map(lifted)),
      new THREE.LineBasicMaterial({ color }));
    profileLine.name = "corridor-sample-road";
    scene.add(profileLine);
    for (const endpoint of [samplePath[0], samplePath[samplePath.length - 1]]) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(1.65, 12, 8), new THREE.MeshBasicMaterial({ color }));
      marker.position.copy(lifted(endpoint));
      scene.add(marker);
    }
  }
  const inside = data.buildings.filter((b) => b.inside);
  const ownFoundation = (b: Building) => second && b.id === 1365750556;
  const foundation = activeTerrain ? buildFoundations(scene, inside.filter(b => b.id !== "batch-gate" && !ownFoundation(b)), groundHeight, pads) : () => 0;
  const baseOf = (b: Building) => b.id === "batch-gate" ? groundHeight(...bboxCenterOfBuilding(b))
    : ownFoundation(b) ? pads[b.id] ?? 0 : foundation(b);
  const viewRings = activeTerrain && data.boundary ? [data.boundary.pts] : campusRings;
  for (const ring of viewRings) {
    for (const [x, y] of ring) campusPoints.push(new THREE.Vector3(x, groundHeight(x, y), -y));
  }
  for (const building of inside) {
    if (activeTerrain && data.boundary && !inCampus(bboxCenterOfBuilding(building), data.boundary.pts)) continue;
    for (const [x, y] of building.polygon) campusPoints.push(new THREE.Vector3(x, baseOf(building) + building.height, -y));
  }
  // 标签全景压缩阈值随校区尺寸自适应（虎溪≈1700 不变；大校区按校内包围盒对角线放宽）
  if (campusPoints.length > 1) {
    const box = new THREE.Box3().setFromPoints(campusPoints);
    const size = box.getSize(new THREE.Vector3());
    labels.overviewDistance = Math.max(1700, Math.hypot(size.x, size.z) * 1.15);
  }
  if (!activeTerrain) gContext.add(buildContext(data));
  boundaryLines.length = 0;
  for (const ring of campusRings) {
    const line = buildBoundaryLine({ pts: activeTerrain ? subdividePath([...ring, ring[0]]) : ring });
    if (activeTerrain) {
      const p = line.geometry.getAttribute("position");
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + groundHeight(p.getX(i), -p.getZ(i)));
    }
    boundaryLines.push(line);
    scene.add(line);
  }

  const generic = inside.filter(b => !b.landmark && !replacedByBatch(b.id) && !(heritage && isHeritageBuilding(b.id)));
  const buildings = buildBuildings(scene, generic, baseOf);
  buildingsRef = buildings;
  if (heritage) for (const b of inside.filter(b => isHeritageBuilding(b.id))) {
    const [cx, cy] = bboxCenterOfBuilding(b);
    const model = buildHeritageBuilding(Number(b.id), cx, cy, baseOf(b), third);
    tagAsset(model, b, model);
    buildings.add(model);
  }
  if (batch) for (const b of inside.filter(b => replacesBatchBuilding(b.id))) {
    const model = buildBatchBuilding(b, baseOf(b));
    tagAsset(model, b, model);
    buildings.add(model);
  }
  if (second) for (const b of inside.filter(b => batch2Spot(b.id))) {
    const model = buildBatch2Building(b, baseOf(b));
    tagAsset(model, b, model);
    buildings.add(model);
  }
  if (fourth) for (const b of inside.filter(b => batch4Spec(b.id))) {
    const model = buildBatch4Building(b, baseOf(b), groundHeight, data.roads);
    tagAsset(model, b, model);
    buildings.add(model);
  }
  // 地标流式加载：参数化回退先上（首屏零 GLB 等待），far 档按距离排序双并发后台替换
  const landmarkDefs = inside.filter(b => b.landmark && !(heritage && isHeritageBuilding(b.id)) && !replacedByBatch(b.id));
  for (const b of landmarkDefs) { GLB_LANDMARKS.add(b.landmark); PRIORITY_ASSETS.add(b.landmark); }
  const landmarkFallback = (b: Building): THREE.Group => {
    if (b.landmark === "gym") return buildGym(b);
    if (b.landmark === "library") return buildLibrary(b);
    if (b.landmark === "activity") return buildActivity(b);
    if (b.landmark === "zonghe") return buildZonghe(b);
    if (b.landmark === "likelou") return buildLikelou(b);
    return fallbackLandmark(b);
  };
  const streamDefs = landmarkDefs.map((b) => {
    const fallback = landmarkFallback(b);
    fallback.position.y += baseOf(b);
    buildings.add(fallback);
    return { asset: b.landmark, building: b, fallback };
  });
  rerankLandmarks = streamLandmarkGLBs(streamDefs, {
    parent: buildings,
    isCurrent: () => buildings.parent === scene,
    center: controls.target.clone(),
    load: (asset, b) => loadLandmarkGLB(asset, b, baseOf(b)),
    onSwap: (asset, root) => {
      // GLB 替换回退后，刷新地点表/标注选中引用（labels 用固定坐标无需改）
      let mesh: THREE.Mesh | undefined;
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!mesh && m.isMesh && (m.userData as BuildingUserData).name) mesh = m;
      });
      const def = streamDefs.find((d) => d.asset === asset);
      if (mesh && def) {
        byName.set(def.building.name, mesh);
        const it = places.find((p) => p.name === def.building.name);
        if (it) it.mesh = mesh;
        if (selectedPlace?.name === def.building.name) flyTargetBuilding = mesh;
      }
      shadowDirty = true;
    },
  });
  const manualGreenZones = data.green.filter((g) => g.manual);
  treeSys = buildTrees(gTrees, [...campusGreen,...sportsSiteAreas(campusGreen), ...(revisedVenues ? venuePlantExclusions() : [])], data.roads, campusWater, data.buildings, data.boundary?.pts, manualGreenZones, groundHeight);
  const vegetationGroup = activeTerrain ? new THREE.Group() : gTrees;
  vegetation = buildVegetation(vegetationGroup, { green: data.green, roads: data.roads, water: campusWater, buildings: data.buildings, gardens: campus.gardens });
  if (activeTerrain) {
    liftPlants(vegetationGroup, groundHeight);
    gTrees.add(vegetationGroup);
  }
  const jinOutline = campusWater.find((w) => w.name === "缙湖")?.outers[0] ?? null;
  // 人流热点：一教/图书馆/综合楼/一食/二食周边（上下课+就餐人流）
  const HOTSPOT_NAMES = new Set(campus.hotspots);
  const hotspots = data.buildings.filter((b) => b.inside && HOTSPOT_NAMES.has(b.name)).map((b) => {
    const xs = b.polygon.map((p) => p[0]);
    const ys = b.polygon.map((p) => p[1]);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, r: 95,
      hw: (Math.max(...xs) - Math.min(...xs)) / 2, hd: (Math.max(...ys) - Math.min(...ys)) / 2 };
  });
  traffic = buildTraffic(gTraffic, { roads: data.roads, lakeOutline: jinOutline, hotspots, heightAt: activeTerrain?.heightAt });
  walkBuildings = data.buildings.filter((b) => b.inside && b.name && !b.name.includes("门"));
  statsVegCount = vegetation.counts.bushes + vegetation.counts.flowers + vegetation.counts.hedges + vegetation.counts.beds;
  // 环湖专类园标牌（植物园环湖带，随语言切换 relabel）
  for (const gl of vegetation.gardenLabels) {
    labels.add(gl.zh, new THREE.Vector3(gl.x, 0, -gl.y), 2600, { cls: "gate", onClick: () => {
      flyTo(camera, controls, new THREE.Vector3(gl.x, 0, -gl.y), 220);
    } });
  }

  dayNight = new DayNight(scene, hemi, sun, buildings);
  dayNight.apply("day");

  routeNavigator = new Navigator(scene, data.graph, activeTerrain?.heightAt);
  walkWorld=new WalkWorld(data, groundHeight, baseOf);
  sharedLock=new SharedPointerLock(camera,renderer.domElement);
  walking=new Walking(camera,controls,walkWorld,sharedLock,(active,message)=>{
    walkRouteState=null;
    document.body.classList.toggle('walk-mode',active);picker?.setEnabled(!active);shadowDirty=true;
    document.querySelector<HTMLElement>('#walk-setup')!.hidden=true;
    if(message)showToast(message);
    else if(active)showToast(t("walkEntered"));
    if(!active&&(walkViewport[0]!==innerWidth||walkViewport[1]!==innerHeight)){resize();if(selectedPlace)focusPlace(selectedPlace);else homeView();}
  });
  freeCam=new FreeCam(camera,controls,walkWorld,sharedLock,flyBoundsOf(campus),{
    onSpeed:(s)=>{document.querySelector('#freecam-speed')!.textContent=`${Math.round(s)} m/s`;},
    onEdge:()=>showToast(t("flyEdge")),
    onExit:(msg)=>{document.body.classList.remove('freecam-mode');picker?.setEnabled(true);shadowDirty=true;if(msg)showToast(msg);},
  });
  // Pointer Lock 失败降级：按住拖动旋转视角（同触屏逻辑）
  renderer.domElement.addEventListener('pointerdown',(e)=>{
    if(!freeCam?.active||sharedLock.isLocked||e.pointerType==='touch')return;
    dragLook={x:e.clientX,y:e.clientY,id:e.pointerId};
  });
  renderer.domElement.addEventListener('pointermove',(e)=>{
    if(!freeCam?.active||!dragLook||e.pointerId!==dragLook.id)return;
    const yaw=-(e.clientX-dragLook.x)*0.0038,pitch=-(e.clientY-dragLook.y)*0.0038;
    const euler=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');
    euler.y+=yaw;euler.x=Math.max(-1.45,Math.min(1.45,euler.x+pitch));
    camera.quaternion.setFromEuler(euler);
    dragLook.x=e.clientX;dragLook.y=e.clientY;
  });
  const dragLookEnd=(e:PointerEvent):void=>{if(dragLook&&e.pointerId===dragLook.id)dragLook=null;};
  renderer.domElement.addEventListener('pointerup',dragLookEnd);
  renderer.domElement.addEventListener('pointercancel',dragLookEnd);
  routeNavigator.onStatus = (msg) => {
    navStatusEl.textContent = msg || (navMode ? t("navStatusDefault") : "");
  };

  // 地点收集：有名字的楼（同名取第一个 mesh，递归含 GLB 组）+ 湖 + 校门
  byName.clear();
  buildings.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const d = mesh.userData as BuildingUserData;
    if (!d.name || (d.name.includes("门") && d.id !== "batch-gate")) return;
    if (!byName.has(d.name)) byName.set(d.name, mesh);
  });
  const mapPoints = [...(campus.mapPoints ?? []).filter(point => !revisedCorridor || !byName.has(point.name)), ...(revisedVenues ? VENUE_SPOTS : [])];
  places = collectPlaces({...data, water: campusWater,green:campusGreen}, byName, mapPoints);
  if (activeTerrain) {
    const byId = new Map(inside.map((b) => [b.id, b]));
    for (const place of places) {
      const building = byId.get(place.mesh?.userData.id);
      const water = place.kind === "water" ? campusWater.find((item) => item.name === place.name) : undefined;
      const { x, z } = place.target;
      place.target.y += building ? baseOf(building) : water ? lakeHeight(water.id, x, -z) : groundHeight(x, -z);
    }
  }
  navPanel = initNavigationPanel(routeNavigator,places,focusRoute,{t,getLang,localName,onLangChange});
  tourRoutes = buildTourRoutes(vegetation.gardenLabels, TOUR_STOPS);
  activeRoute = tourRoutes[0];
  rebuildTourStops();
  for (const r of tourRoutes) {
    const el = document.querySelector<HTMLElement>(`[data-route-count="${r.id}"]`);
    if (el) el.textContent = `${r.stops.length} ${getLang() === "en" ? "stops" : "站"}`;
  }
  // 校区动态 UI：面板标题 + 步行出生点 + 快捷按钮（两处容器同源填充）
  renderCampusTitles();
  const spawnSel=document.querySelector<HTMLSelectElement>('#walk-spawn')!;
  spawnSel.innerHTML=campus.walkSpawns.map((n)=>`<option>${n}</option>`).join("");
  for (const sel of ["#quick-start", "#shortcuts"]) {
    const sc=document.querySelector(sel);
    if(!sc) continue;
    sc.classList.toggle("batch-shortcuts", batch);
    sc.innerHTML="";
    const shortcuts = batch ? previewSpots.map(s => [s.label, s.name]) : heritage ? HERITAGE_NAMES.map(name => [name, name]) : venues ? VENUE_SPOTS.map(spot => [spot.name, spot.name]) : corridor
      ? [["学生九舍", "A区学生九舍"], ["三食堂", "学生三食堂"], ["电影学院剧场", "美视电影学院剧场"]] : campus.shortcuts;
    for(const [label,q] of shortcuts){
      const b=document.createElement("button");
      b.type="button";b.textContent=label;b.dataset.shortcut=q;
      b.addEventListener("click",()=>{
        const place = (corridor || venues || heritage) && places.find(item => item.name === q);
        if (place) { selectPlace(place); return; }
        const input = document.querySelector<HTMLInputElement>("#search")!;
        input.value = label;
        input.dispatchEvent(new Event("input"));
      });
      sc.appendChild(b);
    }
  }
  renderPlacesPanel();
  if (!searchApi) {
    searchApi = initSearch(
      document.querySelector<HTMLInputElement>("#search")!,
      document.querySelector<HTMLElement>("#suggestions")!,
      places,
      selectPlace,
    );
  } else searchApi.setItems(places);

  picker = new BuildingPicker(renderer.domElement, camera, buildings, {
    onSelect: (mesh) => {
      if (navMode && routeNavigator) {
        const d = mesh.userData as BuildingUserData;
        routeNavigator.setPlace(routeNavigator.pickEndpoint??'end',d.name,d.cx,d.cy);
        return;
      }
      const entry = places.find((p) => p.mesh === mesh || p.name === (mesh.userData as BuildingUserData).name);
      if (entry) {
        picker!.select(mesh);
        openDetail(entry);
      } else {
        picker!.clearSelection();
      }
    },
    onClear: () => {
      if (!navMode) closeDetail();
    },
  });

  // 标注：楼名（楼顶）+ 湖名
  for(const place of places.filter(p=>p.kind==='sports'))labels.add(place.name,place.target.clone().add(new THREE.Vector3(0,3,0)),6000,
    {cls:'sports',priority:3,onClick:()=>selectPlace(place)});
  for (const [name, mesh] of byName) {
    const box = boundsOf(mesh);
    const pos = box.getCenter(new THREE.Vector3());
    pos.y = box.max.y + (corridor && mesh.userData.id === 1556523934 ? 13 : 5);
    labels.add(name, pos, 6000, { priority: Object.hasOwn(pads, String(mesh.userData.id)) ? 8 : mesh.userData.pickRoot ? 5 : 1, onClick: () => {
      const item=places.find(p=>p.name===name);if(item)selectPlace(item);
    } });
  }
  for (const point of mapPoints ?? []) {
    const place = places.find((item) => item.name === point.name)!;
    labels.add(place.name, place.target.clone().add(new THREE.Vector3(0, 3, 0)), 6000, {
      cls: place.kind === "gate" ? "gate" : undefined,
      priority: 5,
      onClick: () => selectPlace(place),
    });
  }

  for (const w of campusWater) {
    if (!w.name || w.inside === false) continue;
    const [cx, cy] = bboxCenter(w.outers[0]);
    labels.add(w.name, new THREE.Vector3(cx, 2 + lakeHeight(w.id, cx, cy), -cy), 6000, {
      cls: "water", priority: 3,
      onClick: () => {
        const place = places.find((item) => item.name === w.name && item.kind === "water");
        if (place) selectPlace(place);
      },
    });
  }

  for (const g of data.gates) {
    const asset = GLB_GATES[g.name];
    const glb = asset ? await loadGateGLB(asset, g) : null;
    scene.add(glb ?? buildGate(g));
    const lb = gateLabel(g);
    labels.add(lb.text, lb.pos, 6000, { cls: "gate", onClick: () => {
      flyTo(camera, controls, new THREE.Vector3(g.x, 0, -g.y), 320);
    } });
  }

  statsTreeCount = treeSys?.count ?? 0;
  labels.relabel(localName);
  refreshStatsHud(data.buildings.length, treeSys?.count ?? 0);
}

function refreshStatsHud(buildingCount: number, treeCountRef?: number): void {
  const tc = treeCountRef ?? statsTreeCount;
  if (getLang() === "en") {
    statsEl.textContent = `Buildings ${buildingCount} · Trees ${tc} · Plantings ${statsVegCount} (illustrative) · Data © OpenStreetMap contributors`;
    document.querySelector("#hud-count")!.textContent = `${places.length} places`;
    document.querySelector("#tour-count")!.textContent = `${tourStops.length} stops`;
  } else {
    statsEl.textContent = `楼栋 ${buildingCount} · 树木 ${tc} · 花木 ${statsVegCount}（示意） · 数据 © OpenStreetMap 贡献者`;
    document.querySelector("#hud-count")!.textContent = `地点 ${places.length} 处`;
    document.querySelector("#tour-count")!.textContent = `游览 ${tourStops.length} 站`;
  }
}
let statsTreeCount = 0;
let statsVegCount = 0;
let treeSys: TreeSystem | null = null;
let vegetation: VegetationSystem | null = null;
let traffic: TrafficSystem | null = null;
let trafficCtl: TrafficControls = { walkers: true, vehicles: true, playing: true };
let tourRoutes: TourRoute[] = [];
let activeRoute: TourRoute | null = null;

function rebuildTourStops(): void {
  if (!activeRoute) return;
  tourStops = activeRoute.stops.map((st) => {
    const p = places.find((pl) => pl.name === st.name);
    if (p) return p;
    // 园标签站：合成坐标站点（不进详情卡，解说走巡游条）
    return {
      name: st.name, kind: "building" as const,
      target: new THREE.Vector3(st.x ?? 0, 0, -(st.y ?? 0)), distance: 240,
      group: "游览", num: "·",
    };
  });
  document.querySelector("#tour-count")!.textContent = String(tourStops.length);
}
let walkBuildings: Building[] = [];
let rerankLandmarks: ((center: THREE.Vector3) => void) | null = null;
let walkRouteState: { points: [number, number][]; endName: string } | null = null;

// ---- 行走导航（M19）：路线就绪后“步行前往”，漫游中 HUD 引导/偏航重算/到达提示 ----
function walkRoute(): void {
  const r = routeNavigator?.result;
  if (!r?.points.length || !walking || !walkWorld) return;
  const pts = r.points;
  walkRouteState = { points: pts, endName: routeNavigator!.end?.label ?? "终点" };
  try {
    if (walking.enter(pts[0], pts[Math.min(2, pts.length - 1)])) return;
    // 起点被碰撞世界拒绝：沿路线向前找第一个可行走点
    const spawn = walkWorld.findSpawn(pts[0], pts.slice(1, 24));
    if (spawn) {
      const idx = Math.max(0, pts.findIndex((p) => Math.hypot(p[0] - spawn[0], p[1] - spawn[1]) < 1));
      if (walking.enter(spawn, pts[Math.min(idx + 2, pts.length - 1)])) return;
    }
  } catch (err) {
    console.warn("walk enter failed", err);
  }
  walkRouteState = null;
  showToast(t("walkStartFail"));
}
document.querySelector("#nav-walk")!.addEventListener("click", walkRoute);

function nearestOnRoute(px: number, py: number): { seg: number; dist: number } {
  const pts = walkRouteState!.points;
  let best = { seg: 0, dist: Infinity };
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    const len2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((px - pts[i][0]) * dx + (py - pts[i][1]) * dy) / len2));
    const d = Math.hypot(px - (pts[i][0] + dx * t), py - (pts[i][1] + dy * t));
    if (d < best.dist) best = { seg: i, dist: d };
  }
  return best;
}

let walkHudFrame = 0;
function updateWalkHud(): void {
  const navEl = document.querySelector<HTMLElement>("#walk-nav");
  const nearEl = document.querySelector<HTMLElement>("#walk-nearby");
  if (!walking?.active) { if (navEl) navEl.textContent = ""; if (nearEl) nearEl.textContent = ""; walkHudFrame = 0; return; }
  walkHudFrame++;
  // 导航引导（每 12 帧）
  if (walkRouteState && navEl && walkHudFrame % 12 === 0) {
    const px = camera.position.x, py = -camera.position.z;
    const { seg, dist } = nearestOnRoute(px, py);
    const pts = walkRouteState.points;
    if (dist > 22) {
      showToast(t("walkOffRoute"));
      if (routeNavigator?.end) {
        routeNavigator.setStart(px, py, "我的位置");
        const r2 = routeNavigator.result;
        if (r2) walkRouteState = { points: r2.points, endName: walkRouteState.endName };
      }
    } else {
      let remaining = 0;
      for (let i = seg + 1; i < pts.length; i++) remaining += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      remaining += Math.hypot(pts[seg + 1][0] - px, pts[seg + 1][1] - py);
      if (remaining < 12) {
        showToast(`${t("walkArrive")} ${localName(walkRouteState.endName)}`);
        walkRouteState = null;
        navEl.textContent = "";
      } else {
        // 下一步转向：找最近拐点与朝向差
        let hint = t("walkAhead");
        for (let i = seg + 1; i < Math.min(seg + 6, pts.length - 1); i++) {
          const d1x = pts[i][0] - pts[i - 1][0], d1y = pts[i][1] - pts[i - 1][1];
          const d2x = pts[i + 1][0] - pts[i][0], d2y = pts[i + 1][1] - pts[i][1];
          const cross = d1x * d2y - d1y * d2x;
          if (Math.abs(cross) > 0.4 * Math.hypot(d2x, d2y) * Math.hypot(d1x, d1y)) {
            hint = cross > 0 ? t("walkLeft") : t("walkRight");
            break;
          }
        }
        navEl.textContent = `📍 ${localName(walkRouteState.endName)} ${Math.round(remaining)}m · ${hint}`;
      }
    }
  }
  // 近距楼名（每 24 帧）
  if (nearEl && walkHudFrame % 24 === 0) {
    const px = camera.position.x, py = -camera.position.z;
    let best: { name: string; d: number } | null = null;
    for (const b of walkBuildings) {
      const p = b.polygon;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of p) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const d = Math.hypot((x0 + x1) / 2 - px, (y0 + y1) / 2 - py);
      if (d < 48 && (!best || d < best.d)) best = { name: b.name, d };
    }
    nearEl.textContent = best ? ` · ${localName(best.name)} ${Math.round(best.d)}m` : "";
  }
}

// ---- 四季（季相只改植被实例色，与光影预设正交）----
function applySeason(s: Season): void {
  treeSys?.applySeason(s);
  vegetation?.applySeason(s);
  for (const b of document.querySelectorAll<HTMLButtonElement>("#season-seg .tb")) {
    b.classList.toggle("on", b.dataset.s === s);
  }
}
document.querySelector("#season-seg")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".tb");
  if (!btn || !btn.dataset.s) return;
  applySeason(btn.dataset.s as Season);
});

(async () => {
  await Promise.resolve(); // 微任务边界：避开模块求值期 TDZ（disposeCampus 触碰后段 let）
  if (campus.id === "all") { await loadOverviewCampus(); return; }
  await loadScene();
  document.body.classList.remove("overview-mode");
})().then(() => {
  renderLayers();
  renderLighting();
  const view=parseSharedView(location.hash);
  if(view) {
    applyLighting(view.preset as PresetName);
    const place=places.find(p=>p.name===view.place);
    if(place){if(place.mesh)picker?.select(place.mesh);openDetail(place);}
    hud.classList.toggle('collapsed',view.collapsed);
    document.querySelector('#hud-fold')!.setAttribute('aria-expanded',String(!view.collapsed));
    camera.position.fromArray(view.position);controls.target.fromArray(view.target);
    if(view.offset.length===2&&view.viewport[0]===innerWidth&&view.viewport[1]===innerHeight)
      camera.setViewOffset(innerWidth,innerHeight,view.offset[0]*innerWidth,view.offset[1]*innerHeight,innerWidth,innerHeight);
    else {
      const rect=mapRect(),offset=camera.position.clone().sub(controls.target);
      let subject=campusPoints;
      if(place?.mesh||place?.extent) {
        const box=place.mesh?boundsOf(place.mesh):new THREE.Box3(
          place.target.clone().add(new THREE.Vector3(-place.extent!.width/2,0,-place.extent!.length/2)),
          place.target.clone().add(new THREE.Vector3(place.extent!.width/2,5,place.extent!.length/2)));
        subject=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])subject.push(new THREE.Vector3(x,y,z));
      }
      const dir=offset.clone().normalize(),depths=subject.map(p=>p.clone().sub(controls.target).dot(dir));
      const scale=sharedDistanceScale(view,{width:innerWidth,height:innerHeight},{width:rect.right-rect.left,height:rect.bottom-rect.top},[Math.min(...depths),Math.max(...depths)]);
      offset.setLength(THREE.MathUtils.clamp(offset.length()*scale,12,8500));camera.position.copy(controls.target).add(offset);
      composeRect(rect);
    }
    controls.update();
  } else homeView();
  shadowDirty=true;
  document.querySelector<HTMLElement>('#boot')!.hidden=true;
  initOnboarding({t,getLang}, !(inCorridorPreview() || inVenuesPreview() || inHeritagePreview() || inBatchPreview()));
}).catch((e: unknown) => {
  statsEl.textContent = "加载出错：" + (e instanceof Error ? e.message : String(e));
  statsEl.classList.add("err");
  document.querySelector<HTMLElement>('#boot')!.hidden=false;
  document.querySelector('#boot-title')!.textContent='校园数据加载失败';
  document.querySelector('#boot-note')!.textContent='请检查网络，然后重新加载。';
  document.querySelector<HTMLElement>('.boot-spinner')!.hidden=true;
  document.querySelector<HTMLButtonElement>('#boot-retry')!.hidden=false;
});

// ---- 标签页 ----
const tabPages: Record<string, string> = {
  places: "tab-places", layers: "tab-layers", lighting: "tab-lighting",
};
for (const btn of document.querySelectorAll<HTMLButtonElement>(".hud-tab")) {
  btn.addEventListener("click", () => {
    closeDetail();
    for (const b of document.querySelectorAll(".hud-tab")) b.classList.toggle("on", b === btn);
    const key = btn.dataset.tab!;
    for (const [k, id] of Object.entries(tabPages)) {
      document.querySelector("#" + id)!.classList.toggle("on", k === key);
    }
  });
}

// ---- 图层 ----
interface LayerDef { name: Pair; desc: Pair; get: () => boolean; set: (v: boolean) => void }
const LAYER_DEFS: LayerDef[] = [
  { name: { zh: "地点名称", en: "Place labels" }, desc: { zh: "在地图上显示地点名称", en: "Show place names on the map" }, get: () => labels.enabled, set: (v) => { labels.enabled = v; } },
  { name: { zh: "校园边界", en: "Campus boundary" }, desc: { zh: "白色细线标示大致范围", en: "Thin white outline of the grounds" }, get: () => boundaryLines[0]?.visible ?? false, set: (v) => { for (const l of boundaryLines) l.visible = v; } },
  { name: { zh: "校园建筑", en: "Buildings" }, desc: { zh: "边界内的主要建筑", en: "Main buildings inside the boundary" }, get: () => buildingsRef?.visible ?? true, set: (v) => { if (buildingsRef) buildingsRef.visible = v; } },
  { name: { zh: "树木", en: "Trees" }, desc: { zh: "树木、绿篱与花境", en: "Trees, hedges & flower beds" }, get: () => gTrees.visible, set: (v) => { gTrees.visible = v; } },
  { name: { zh: "行人", en: "Pedestrians" }, desc: { zh: "沿路网漫步的人流", en: "Walkers on paths & roads" }, get: () => trafficCtl.walkers, set: (v) => { trafficCtl.walkers = v; traffic?.setControls(trafficCtl); } },
  { name: { zh: "车辆", en: "Vehicles" }, desc: { zh: "观光车与校车", en: "Tour carts & campus coach" }, get: () => trafficCtl.vehicles, set: (v) => { trafficCtl.vehicles = v; traffic?.setControls(trafficCtl); } },
  { name: { zh: "动态", en: "Animated" }, desc: { zh: "暂停或恢复行人车辆动画", en: "Pause or resume the animation" }, get: () => trafficCtl.playing, set: (v) => { trafficCtl.playing = v; traffic?.setControls(trafficCtl); } },
  { name: { zh: "道路与桥梁", en: "Roads & bridges" }, desc: { zh: "车行道与步行道", en: "Vehicle roads and walkways" }, get: () => gRoads.visible, set: (v) => { gRoads.visible = v; } },
  { name: { zh: "湖塘水面", en: "Lakes & ponds" }, desc: { zh: "缙湖、云湖等水面", en: "Jin Lake, Cloud Lake and more" }, get: () => gWater.visible, set: (v) => { gWater.visible = v; } },
  { name: { zh: "运动场地", en: "Sports grounds" }, desc: { zh: "田径跑道与室外球场", en: "Track and outdoor courts" }, get: () => gSports.visible, set: (v) => { gSports.visible = v; } },
  { name: { zh: "周边环境", en: "Surroundings" }, desc: { zh: "校界约200米内的简化建筑、道路与地表", en: "Simplified buildings and ground near campus" }, get: () => gContext.visible, set: (v) => { gContext.visible = v; } },
];

function renderLayers(): void {
  const list = document.querySelector("#layers-list")!;
  list.innerHTML = "";
  for (const def of LAYER_DEFS) {
    const row = document.createElement("div");
    row.className = "layer-row";
    const id = "layer-" + def.name.zh;
    row.innerHTML =
      `<span class="lt"><strong id="layer-title-${id}">${tr(def.name)}</strong>` +
      `<small id="layer-desc-${id}">${tr(def.desc)}</small></span>` +
      `<span class="sw"><input type="checkbox" id="${id}" ${def.get() ? "checked" : ""} /><i></i></span>`;
    (row.querySelector("input") as HTMLInputElement).addEventListener("change", (e) => {
      def.set((e.target as HTMLInputElement).checked);
      shadowDirty=true;
    });
    list.appendChild(row);
  }
}

// ---- 画质（自动/高/低）----
type Quality = "auto" | "high" | "low";
let quality: Quality = "auto";
let autoDowngraded = false; // auto 档运行时降到低配（与静态低配判断独立）

function resolveHighQuality(): boolean {
  if (quality === "low") return false;
  if (quality === "high") return true;
  if (autoDowngraded) return false; // auto 运行时已降档
  // 自动：移动端（粗指针）或内存 <=4GB 视为低配
  const nav = window.navigator as (typeof window.navigator) & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const lowMem = nav.deviceMemory !== undefined && nav.deviceMemory <= 4;
  return !(coarse || lowMem);
}

function applyQuality(): void {
  const high = resolveHighQuality();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 2 : 1));
  renderer.shadowMap.enabled = high;
  shadowDirty=true;
  for (const b of document.querySelectorAll<HTMLButtonElement>("#quality-seg .tb")) {
    b.classList.toggle("on", b.dataset.q === quality);
  }
}

document.querySelector("#quality-seg")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".tb");
  if (!btn || !btn.dataset.q) return;
  quality = btn.dataset.q as Quality;
  autoDowngraded = false; // 手动接管后重置自动降档
  applyQuality();
});
applyQuality();

// ---- 自适应画质（auto 档：帧统计快降慢升+冷却，gxu quality 思路）----
let fpsAcc = 0, fpsFrames = 0, lowSince = 0, highSince = 0, cooldownUntil = 0;
const AUTO_LOW_FPS = 45, AUTO_HIGH_FPS = 55;

function tickAdaptiveQuality(now: number, frameMs: number): void {
  if (quality !== "auto" || frameMs <= 0) return;
  // 60fps 帧帽下的真实帧间隔：跳帧时 frameMs>16.7 说明渲染吃紧
  fpsAcc += frameMs; fpsFrames++;
  if (fpsFrames < 45) return;
  const avgFps = 1000 / (fpsAcc / fpsFrames);
  fpsAcc = 0; fpsFrames = 0;
  if (now < cooldownUntil) return;
  if (!autoDowngraded && avgFps < AUTO_LOW_FPS) {
    if (!lowSince) lowSince = now;
    else if (now - lowSince > 2000) { // 快降：持续 2s 低于 45fps
      autoDowngraded = true; lowSince = 0; cooldownUntil = now + 30000;
      applyQuality();
    }
  } else if (autoDowngraded && avgFps > AUTO_HIGH_FPS) {
    if (!highSince) highSince = now;
    else if (now - highSince > 10000) { // 慢升：持续 10s 高于 55fps
      autoDowngraded = false; highSince = 0; cooldownUntil = now + 30000;
      applyQuality();
    }
  } else {
    lowSince = 0; highSince = 0;
  }
}

// ---- 光影 ----
const LIGHTING_DEFS: { key: PresetName; name: Pair; sub: Pair }[] = [
  { key: "morning", name: { zh: "晨光", en: "Morning" }, sub: { zh: "树影初长", en: "Long soft shadows" } },
  { key: "day", name: { zh: "日间", en: "Day" }, sub: { zh: "校园清朗", en: "Clear daylight" } },
  { key: "dusk", name: { zh: "黄昏", en: "Dusk" }, sub: { zh: "余晖入窗", en: "Glow at the windows" } },
  { key: "night", name: { zh: "夜景", en: "Night" }, sub: { zh: "灯火渐明", en: "Lights coming on" } },
];
let currentPreset: PresetName = "day";
let sunDirection: [number,number,number] = [600,900,350];
function applyLighting(key: PresetName): void {
  currentPreset = key;
  picker?.clearSelection();
  dayNight?.apply(key);
  traffic?.setPhase(key === "night" ? "night" : key === "dusk" ? "dusk" : "day");
  shadowDirty=true;
  sunDirection = sun.position.toArray() as [number,number,number];
  for (const c of document.querySelectorAll<HTMLButtonElement>("#lighting-list .lt-card")) {
    c.classList.toggle("on", c.dataset.key === key);
  }
}
function renderLighting(): void {
  const list = document.querySelector("#lighting-list")!;
  list.innerHTML = "";
  for (const def of LIGHTING_DEFS) {
    const card = document.createElement("button");
    card.type = "button";
    card.dataset.key = def.key;
    card.className = "lt-card" + (def.key === currentPreset ? " on" : "");
    card.innerHTML = `<strong>${tr(def.name)}</strong><small>${tr(def.sub)}</small>`;
    card.addEventListener("click", () => applyLighting(def.key));
    list.appendChild(card);
  }
}

// ---- 巡游 ----
const TOUR_DWELL = 4200;
const tour = { on: false, paused: false, index: 0, timer: 0 as unknown as ReturnType<typeof setTimeout> };
let tourStops: PlaceEntry[] = [];

function tourBarText(): void {
  const it = tourStops[tour.index];
  const stop = it && activeRoute ? activeRoute.stops[tour.index] : undefined;
  document.querySelector("#tour-state")!.textContent = tour.paused ? t("tourPaused") : t("tourState");
  document.querySelector("#tour-pos")!.textContent =
    `${String(tour.index + 1).padStart(2, "0")} / ${tourStops.length}`;
  document.querySelector("#tour-name")!.textContent = it ? localName(it.name) : "";
  document.querySelector("#tour-desc")!.textContent =
    (getLang() === "en" ? stop?.noteEn : stop?.note) ?? "";
  document.querySelector("#tour-pause")!.textContent = tour.paused ? t("tourResume") : t("tourPause");
}

function tourGoto(index: number): void {
  if (!tourStops.length || !activeRoute) return;
  tour.index = ((index % tourStops.length) + tourStops.length) % tourStops.length;
  const it = tourStops[tour.index];
  const st = activeRoute.stops[tour.index];
  if (st.x === undefined) {
    // 地名站：详情卡 + 选中
    if (it.mesh) picker?.select(it.mesh); else picker?.clearSelection();
    openDetail(it);
  } else {
    // 园标签站：只飞不解说卡（解说在巡游条）
    picker?.clearSelection();
    closeDetailOnly();
  }
  const target = it?.target.clone() ?? new THREE.Vector3(st.x ?? 0, 0, -(st.y ?? 0));
  const dist = it?.distance ?? 240;
  flyAlong(camera, controls, target, dist, { durationMs: 2400, direction: new THREE.Vector3(.35, 1.2, 1) });
  tourBarText();
  startTourTimer();
}

function startTourTimer(): void {
  clearTimeout(tour.timer);
  if (tour.paused || !tour.on) return;
  const fill = document.querySelector("#tour-timer-fill") as HTMLElement;
  fill.style.transition = "none";
  fill.style.width = "0";
  void fill.offsetWidth;
  fill.style.transition = `width ${TOUR_DWELL}ms linear`;
  fill.style.width = "100%";
  tour.timer = setTimeout(() => tourGoto(tour.index + 1), TOUR_DWELL);
}

function setTour(on: boolean): void {
  tour.on = on;
  document.querySelector("#tour-bar")!.classList.toggle("on", on);
  if (on) {
    if (navMode) setNavMode(false);
    tour.paused = false;
    tourGoto(tour.index);
  } else {
    clearTimeout(tour.timer);
    closeDetail();
    panel?.setActive(null);
  }
}

document.querySelector("#tour-start")!.addEventListener("click", () => {
  // 打开路线选择器（三条主题线）
  document.querySelector<HTMLElement>("#tour-setup")!.hidden = false;
});
document.querySelectorAll<HTMLButtonElement>("#tour-setup .tour-route-card").forEach((card) => {
  card.addEventListener("click", () => {
    const route = tourRoutes.find((r) => r.id === card.dataset.route);
    if (!route) return;
    activeRoute = route;
    rebuildTourStops();
    if (route.season) applySeason(route.season);
    document.querySelector<HTMLElement>("#tour-setup")!.hidden = true;
    if (walking?.active) walking.exit();
    tour.index = 0;
    setTour(true);
  });
});
document.querySelector("#tour-setup-close")!.addEventListener("click", () => {
  document.querySelector<HTMLElement>("#tour-setup")!.hidden = true;
});
document.querySelector("#tour-pause")!.addEventListener("click", () => {
  tour.paused = !tour.paused;
  tourBarText();
  if (!tour.paused) startTourTimer();
  else clearTimeout(tour.timer);
});
document.querySelector("#tour-prev")!.addEventListener("click", () => tourGoto(tour.index - 1));
document.querySelector("#tour-next")!.addEventListener("click", () => tourGoto(tour.index + 1));
document.querySelector("#tour-exit")!.addEventListener("click", () => setTour(false));

// ---- 详情返回 / 前往 ----
document.querySelector("#pd-back")!.addEventListener("click", () => {
  closeDetail();
  picker?.clearSelection();
});
let flyTargetBuilding: THREE.Mesh | null = null;
document.querySelector("#pd-fly")!.addEventListener("click", () => {
  if (flyTargetBuilding) focusBuilding(flyTargetBuilding);
  else if (selectedPlace) focusPlace(selectedPlace);
});
document.querySelector('#pd-nav')!.addEventListener('click',()=>{
  const place=selectedPlace;if(!place)return;setNavMode(true);routeNavigator?.setPlace('end',place.name,place.target.x,place.target.z);
});

// ---- 导航 ----
const navBtn = document.querySelector<HTMLButtonElement>("#tb-nav")!;
document.querySelector('#tb-walk')!.addEventListener('click',()=>{
  if(mobileLayout.matches){showToast(t('walkDesktopOnly'));return;}
  const setup=document.querySelector<HTMLElement>('#walk-setup')!,select=document.querySelector<HTMLSelectElement>('#walk-spawn')!;
  if(selectedPlace&&[...select.options].some(o=>o.value===selectedPlace!.name))select.value=selectedPlace.name;
  setup.hidden=false;
});
document.querySelector('#walk-cancel')!.addEventListener('click',()=>{document.querySelector<HTMLElement>('#walk-setup')!.hidden=true;});
document.querySelector('#walk-start')!.addEventListener('click',()=>{
  if(mobileLayout.matches){document.querySelector<HTMLElement>('#walk-setup')!.hidden=true;showToast(t('walkDesktopOnly'));return;}
  if(!walking||!walkWorld||!routeNavigator||!sceneData)return;
  const name=document.querySelector<HTMLSelectElement>('#walk-spawn')!.value,place=places.find(p=>p.name===name);if(!place)return;
  const entry=walkSpawns.find(p=>p.name===name);
  const target: [number, number] = [place.target.x, -place.target.z];
  const nearby = routeNavigator.router.snap(...target, 100);
  const preferred = entry?.point as [number,number] | undefined;
  const spawn=walkWorld.findSpawn(preferred ?? (nearby ? routeNavigator.router.point(nearby) : target), sceneData.graph.nodes);
  if(!spawn){showToast('附近没有安全步行点，请选择其他地点。');return;}
  cancelFly();if(tour.on)setTour(false);if(navMode)setNavMode(false);walkViewport=[innerWidth,innerHeight];
  walking.enter(spawn, (entry?.lookAt as [number,number] | undefined) ?? target);
});
document.querySelector('#walk-exit')!.addEventListener('click',()=>walking?.exit());
function focusRoute():void {
  const route=routeNavigator?.result;if(!route)return;
  const points=route.points.map(([x,y])=>new THREE.Vector3(x,groundHeight(x,y)+.3,-y)),rect=mapRect(),direction=new THREE.Vector3(.28,1.45,1);
  const fit=framePoints(points,camera.fov,{width:innerWidth,height:innerHeight},rect,direction);composeRect(rect);flyTo(camera,controls,fit.target,Math.max(120,fit.distance),900,direction);
}
function setNavMode(v: boolean): void {
  if(v)walking?.exit();
  navMode = v;
  document.body.classList.toggle('nav-mode',v);
  navBtn.classList.toggle("on", v);
  document.querySelector("#nav-panel")!.classList.toggle("open", v);
  routeNavigator?.setActive(v);
  if (v) {
    if (tour.on) setTour(false);
    closeDetail();
    picker?.clearSelection();
  }
  navBtn.blur();
}
navBtn.addEventListener("click", () => setNavMode(!navMode));
document.querySelector("#nav-clear")!.addEventListener("click", () => routeNavigator?.clearRoute());
document.querySelector("#nav-exit")!.addEventListener("click", () => setNavMode(false));

// ---- 折叠 ----
document.querySelector<HTMLButtonElement>("#hud-fold")!.addEventListener("click", () => {
  document.querySelector("#hud")!.classList.toggle("collapsed");
  document.querySelector('#hud-fold')!.setAttribute('aria-expanded',String(!hud.classList.contains('collapsed')));
  if (!document.querySelector("#hud")!.classList.contains("detail-mode")) homeView();
});
mobileLayout.addEventListener('change',()=>{
  if(mobileLayout.matches){walking?.exit();document.querySelector<HTMLElement>('#walk-setup')!.hidden=true;}
  if(!hud.classList.contains('detail-mode')){hud.classList.toggle('collapsed',mobileLayout.matches);homeView();}
  document.querySelector('#hud-fold')!.setAttribute('aria-expanded',String(!hud.classList.contains('collapsed')));
});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-shortcut]'))button.addEventListener('click',()=>{
  const it=places.find(p=>p.name===button.dataset.shortcut);if(it)selectPlace(it);
});
document.querySelector('#tl-more')!.addEventListener('click',()=>{
  const open=document.querySelector('#tools')!.classList.toggle('open');
  document.querySelector('#tl-more')!.setAttribute('aria-expanded',String(open));
});

// ---- 右侧控件 ----
document.querySelector("#tl-zin")!.addEventListener("click", () => {
  const off = camera.position.clone().sub(controls.target);
  const len = THREE.MathUtils.clamp(off.length() * 0.72, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(off.setLength(len));
});
document.querySelector("#tl-zout")!.addEventListener("click", () => {
  const off = camera.position.clone().sub(controls.target);
  const len = THREE.MathUtils.clamp(off.length() * 1.38, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(off.setLength(len));
});
document.querySelector("#tl-compass")!.addEventListener("click", () => {
  const off = camera.position.clone().sub(controls.target);
  const horiz = Math.hypot(off.x, off.z);
  camera.position.set(controls.target.x, controls.target.y + off.y, controls.target.z + horiz);
});
document.querySelector("#tl-home")!.addEventListener("click", () => {
  walking?.exit();
  if(navMode)setNavMode(false);
  setTour(false);
  picker?.clearSelection();
  if(mobileLayout.matches){hud.classList.add('collapsed');document.querySelector('#hud-fold')!.setAttribute('aria-expanded','false');}
  homeView();
});
document.querySelector("#tl-fs")!.addEventListener("click", () => {
  if (!document.fullscreenEnabled) return;
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
});

// ---- 分享视角 / 导出图片 ----
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string): void {
  const t = document.querySelector("#toast")!;
  t.textContent = msg;
  t.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

document.querySelector("#tl-share")!.addEventListener("click", () => {
  const rect=mapRect();
  const hash=formatSharedView({position:camera.position.toArray(),target:controls.target.toArray(),
    collapsed:hud.classList.contains('collapsed'),offset:[(camera.view?.offsetX??0)/innerWidth,(camera.view?.offsetY??0)/innerHeight],
    viewport:[innerWidth,innerHeight],frame:[rect.right-rect.left,rect.bottom-rect.top],preset:currentPreset,...(selectedPlace?{place:selectedPlace.name}:{})});
  const url = location.origin + location.pathname + hash + (getLang() === "en" ? (hash.includes("?") ? "&" : "?") + "lang=en" : "");
  history.replaceState(null,'',url);
  (window.navigator.clipboard?.writeText(url)??Promise.reject()).then(
    () => showToast(t("toastCopied") + (getLang() === "en" ? " — share this view" : "，可分享当前视角")),
    () => showToast(getLang() === "en" ? "Copy failed — copy the address bar" : "复制失败，请手动复制地址栏"),
  );
});

document.querySelector("#tl-export")!.addEventListener("click", () => {
  renderer.render(scene, camera);
  const src = renderer.domElement;
  const w = src.width;
  const h = src.height;
  const bar = Math.max(26, Math.round(h * 0.045));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h + bar;
  const g = canvas.getContext("2d")!;
  g.drawImage(src, 0, 0);
  g.fillStyle = "rgba(15, 22, 32, 0.88)";
  g.fillRect(0, h, w, bar);
  g.fillStyle = "#fff";
  g.font = `${Math.round(bar * 0.52)}px system-ui, "Microsoft YaHei", sans-serif`;
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillText("© OpenStreetMap 贡献者", bar * 0.7, h + bar / 2);
  g.textAlign = "right";
  g.fillText(`${document.title} · zhipengGui`, w - bar * 0.7, h + bar / 2);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `${campus.id}-campus-3d.png`;
  a.click();
  showToast(t("toastExported"));
});

// ---- 关于面板 ----
const aboutCard = document.querySelector<HTMLElement>("#about-card")!;
document.querySelector("#tl-about")!.addEventListener("click", () => {
  aboutCard.hidden = !aboutCard.hidden;
});
document.querySelector("#about-close")!.addEventListener("click", () => {
  aboutCard.hidden = true;
});

// ---- 语言切换（中/英） ----
document.querySelector("#tl-lang")!.addEventListener("click", () => {
  setLang(getLang() === "zh" ? "en" : "zh");
});
onLangChange(() => {
  renderCampusTitles();
  navPanel?.rebuild();
  renderPlacesPanel();
  renderLayers();
  renderLighting();
  labels.relabel(localName);
  if (selectedPlace) openDetail(selectedPlace);
  else if (placeDetailOpen()) closeDetailOnly();
  refreshStatsHud(sceneData?.buildings.length ?? 0);
  document.querySelectorAll<HTMLSelectElement>("#walk-spawn option").forEach((o) => {
    o.textContent = localName(o.value);
  });
  navStatusEl.textContent = navStatusEl.textContent || "";
});
applyStaticI18n();
renderCampusTitles();

function placeDetailOpen(): boolean {
  return document.querySelector("#hud")!.classList.contains("detail-mode");
}
function closeDetailOnly(): void {
  document.querySelector("#hud")!.classList.remove("detail-mode");
  document.querySelector("#place-detail")!.classList.remove("open");
}

function renderPlacesPanel(): void {
  panel = initPlacesPanel(document.querySelector("#places")!, places, selectPlace);
  if (selectedPlace) panel.setActive(selectedPlace.name);
}

// ---- 键盘快捷键 ----
// 摇杆与升降钮（触屏）
(function initFlyTouch(){
  const stick=document.querySelector<HTMLElement>('#fly-stick');
  const knob=document.querySelector<HTMLElement>('#fly-knob');
  if(!stick||!knob)return;
  let pid=-1,cx=0,cy=0,R=44;
  const setKnob=(dx:number,dy:number)=>{knob.style.transform=`translate(${dx}px,${dy}px)`};
  stick.addEventListener('touchstart',(e:TouchEvent)=>{e.preventDefault();const t=e.changedTouches[0];pid=t.identifier;const r=stick.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;},{passive:false});
  stick.addEventListener('touchmove',(e)=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier!==pid)continue;
      let dx=t.clientX-cx,dy=t.clientY-cy;
      const len=Math.hypot(dx,dy);
      if(len>R){dx=dx/len*R;dy=dy/len*R;}
      setKnob(dx,dy);
      freeCam!.mobileInput.x=dx/R;freeCam!.mobileInput.y=-dy/R;
    }
  },{passive:false});
  const end=(e:TouchEvent)=>{for(const t of e.changedTouches){if(t.identifier!==pid)continue;pid=-1;setKnob(0,0);freeCam!.mobileInput.x=0;freeCam!.mobileInput.y=0;}};
  stick.addEventListener('touchend',end);stick.addEventListener('touchcancel',end);
  for(const [id,dir] of [['#fly-up','up'],['#fly-down','down']] as const){
    const btn=document.querySelector<HTMLElement>(id);
    if(!btn)continue;
    const on=(e:TouchEvent)=>{e.preventDefault();freeCam!.mobileInput[dir]=true;};
    const off=():void=>{freeCam!.mobileInput[dir]=false;};
    btn.addEventListener('touchstart',on,{passive:false});
    btn.addEventListener('touchend',off);btn.addEventListener('touchcancel',off);
  }
  // 右半屏拖动=视角（freecam-mode 下 OrbitControls 已禁用，PointerLock 在触屏上不可用）
  let lookId=-1,lx=0,ly=0;
  renderer.domElement.addEventListener('touchstart',(e)=>{if(!freeCam?.active)return;const t=e.changedTouches[0];if(t.clientX<innerWidth*0.4)return;lookId=t.identifier;lx=t.clientX;ly=t.clientY;},{passive:true});
  renderer.domElement.addEventListener('touchmove',(e)=>{
    if(!freeCam?.active)return;
    for(const t of e.changedTouches){
      if(t.identifier!==lookId)continue;
      const yaw=-(t.clientX-lx)*0.0045,pitch=-(t.clientY-ly)*0.0045;
      const cam=camera;
      const euler=new THREE.Euler().setFromQuaternion(cam.quaternion,'YXZ');
      euler.y+=yaw;euler.x=Math.max(-1.45,Math.min(1.45,euler.x+pitch));
      cam.quaternion.setFromEuler(euler);
      lx=t.clientX;ly=t.clientY;
    }
  },{passive:true});
  const lookEnd=(e:TouchEvent)=>{for(const t of e.changedTouches)if(t.identifier===lookId)lookId=-1;};
  renderer.domElement.addEventListener('touchend',lookEnd);renderer.domElement.addEventListener('touchcancel',lookEnd);
})();

// ---- 校区总览（批 2，campusId=all） ----
let overviewBuild: OverviewBuild | null = null;
const OVERVIEW_CAMPUSES = ["huxi", "shapingba", "liangjiang", "zhigu"];

async function loadOverviewCampus(): Promise<void> {
  disposeCampus();
  campus = CAMPUSES.all;
  overviewBuild?.dispose();
  overviewBuild = null;
  // 最小天空/光照
  dayNight = new DayNight(scene, hemi, sun, new THREE.Group());
  dayNight.apply("day");
  overviewBuild = await buildOverview(scene, OVERVIEW_CAMPUSES.map((id) => CAMPUSES[id]), (text, pos, opts) => {
    labels.add(text, pos, 2600, { cls: opts.cls, priority: 5, onClick: opts.onClick });
  });
  camera.position.set(0, 300, 330);
  controls.target.set(0, 0, 0);
  controls.update();
  // 总览专属 HUD：隐藏校区面板，清残留统计（地点列表/游览计数等为校区语义）
  document.body.classList.add("overview-mode");
  statsEl.textContent = "";
  document.querySelector("#hud-count")!.textContent = "";
  document.querySelector("#tour-count")!.textContent = "";
  renderCampusTitles();
}

// ---- 多校区：清理与切换（批 1c） ----
function resetSceneSkeleton(): void {
  scene = new THREE.Scene();
  scene.add(hemi, sun);
  labels = new LabelLayer(app);
  scene.add(labels.root);
  gGreen = new THREE.Group(); gSports = new THREE.Group(); gWater = new THREE.Group();
  gRoads = new THREE.Group(); gTrees = new THREE.Group();
  gTraffic = new THREE.Group(); gTraffic.name = "g-traffic"; gContext = new THREE.Group();
  scene.add(gGreen, gSports, gWater, gRoads, gTrees, gTraffic, gContext);
}

function disposeCampus(): void {
  closeDetail();
  selectedPlace = null; flyTargetBuilding = null;
  picker = null; navPanel = null; routeNavigator = null;
  treeSys = null; vegetation = null; traffic = null;
  walkRouteState = null; rerankLandmarks = null; followTarget = null;
  tourRoutes = []; activeRoute = null;
  places.length = 0; byName.clear(); tourStops.length = 0;
  campusPoints.length = 0; detailAssets.length = 0; walkBuildings = [];
  statsTreeCount = 0; statsVegCount = 0;
  sceneData = null; boundaryLines.length = 0; buildingsRef = null; dayNight = null;
  activeTerrain = null; terrainGround = null; terrainAttribution = "";
  // three.js 官方卸载规范：几何/材质（数组）/贴图/InstancedMesh 实例缓冲
  scene.traverse((o) => {
    const g = o as THREE.Mesh & { geometry?: THREE.BufferGeometry };
    if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
    g.geometry?.dispose(); // 不限 isMesh：Line/Points 同样持有几何
    const mat = (o as THREE.Mesh).material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats as (THREE.Material & { map?: THREE.Texture; normalMap?: THREE.Texture; emissiveMap?: THREE.Texture })[]) {
        m.map?.dispose(); m.normalMap?.dispose(); m.emissiveMap?.dispose();
        m.dispose();
      }
    }
  });
  (scene.background as THREE.Texture | null)?.dispose?.();
  scene.environment = null; // 天空环境贴图引用解除（skyGradient 若为缓存则复用不泄漏）
  labels.dispose();
  resetSceneSkeleton();
}

let switching = false;
async function switchCampus(id: string): Promise<void> {
  const cfg = CAMPUSES[id];
  if (switching || !cfg || !cfg.available || cfg.id === campus.id) return;
  switching = true;
  freeCam?.exit(); walking?.exit();
  if (tour.on) setTour(false);
  if (navMode) setNavMode(false);
  if (followTarget) exitFollow();
  if (flagMode) setFlagMode(false);
  cancelFly();
  const boot = document.querySelector<HTMLElement>("#boot")!;
  document.querySelector("#boot-title")!.textContent = `正在前往 ${cfg.nameZh}…`;
  document.querySelector<HTMLElement>(".boot-spinner")!.hidden = false;
  document.querySelector<HTMLButtonElement>("#boot-retry")!.hidden = true;
  document.querySelector("#boot-note")!.textContent = "";
  boot.hidden = false;
  await new Promise((r) => setTimeout(r, 60)); // 先绘制遮罩
  try {
    if (id === "all") {
      await loadOverviewCampus();
      updateCampusUrl();
      boot.hidden = true;
      switching = false;
      return;
    }
    document.body.classList.remove("overview-mode");
    disposeCampus();
    overviewBuild?.dispose(); overviewBuild = null;
    campus = cfg;
    await loadScene();
    renderLayers(); renderLighting();
    homeView();
    updateCampusUrl();
  } catch (e) {
    console.error("switchCampus failed", e);
    if (campus.id !== "huxi") {
      disposeCampus();
      campus = CAMPUSES.huxi;
      await loadScene();
      renderLayers(); renderLighting(); homeView();
      updateCampusUrl();
    }
    showToast("校区加载失败，已返回虎溪");
  }
  boot.hidden = true;
  switching = false;
}

// 校区切换器（工具栏）
(function initCampusSwitcher() {
  const btn = document.createElement("button");
  btn.id = "tl-campus"; btn.type = "button";
  btn.title = "切换校区"; btn.textContent = "校";
  const menu = document.createElement("div");
  menu.id = "campus-menu"; menu.hidden = true;
  const allItem = document.createElement("button");
  allItem.type = "button";
  allItem.textContent = "🗺 校区总览";
  allItem.addEventListener("click", () => { menu.hidden = true; void switchCampus("all"); });
  menu.appendChild(allItem);
  for (const cfg of Object.values(CAMPUSES)) {
    if (cfg.id === "all") continue;
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = cfg.id === "shapingba" && batchMode === "batch4" ? "沙坪坝 A 区" : cfg.nameZh;
    item.disabled = !cfg.available;
    item.title = cfg.available ? "" : "建设中，敬请期待";
    item.addEventListener("click", () => { menu.hidden = true; void switchCampus(cfg.id); });
    menu.appendChild(item);
  }
  document.querySelector("#tools")!.before(menu);
  const fs = document.querySelector("#tl-fs");
  fs!.after(btn);
  btn.addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target as Node)) menu.hidden = true; });
})();

function escapeAll(): void {
  if(walking?.active){walking.exit();return;}
  if(freeCam?.active){freeCam.exit();return;}
  if(!document.querySelector<HTMLElement>('#walk-setup')!.hidden){document.querySelector<HTMLElement>('#walk-setup')!.hidden=true;return;}
  if(!document.querySelector<HTMLElement>('#tour-setup')!.hidden){document.querySelector<HTMLElement>('#tour-setup')!.hidden=true;return;}
  if(!document.querySelector<HTMLElement>('#flag-dialog')!.hidden){document.querySelector<HTMLElement>('#flag-dialog')!.hidden=true;setFlagMode(false);return;}
  if (followTarget) { exitFollow(); return; }
  if (flagMode) { setFlagMode(false); return; }
  if(document.querySelector('#tools')!.classList.contains('open')){document.querySelector('#tl-more')!.dispatchEvent(new Event('click'));}
  else if (navMode) setNavMode(false);
  else if (tour.on) setTour(false);
  else closeDetail();
}
window.addEventListener("keydown", (e) => {
  const tgt = e.target as HTMLElement;
  if (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA"||tgt.tagName==='SELECT') return;
  if(walking?.active){if(e.key==='Escape')walking.exit();else if(e.key.toLowerCase()==='v')enterFreeCam();return;}
  const k = e.key.toLowerCase();
  if (k === "h") document.querySelector<HTMLButtonElement>("#tl-home")!.click();
  else if (k === "v") enterFreeCam();
  else if (e.key === "0") void switchCampus("all");
  else if (k === "n") document.querySelector<HTMLButtonElement>("#tl-compass")!.click();
  else if (k === "1") applyLighting("morning");
  else if (k === "2") applyLighting("day");
  else if (k === "3") applyLighting("dusk");
  else if (k === "4") applyLighting("night");
  else if (k === "5") applySeason("spring");
  else if (k === "6") applySeason("summer");
  else if (k === "7") applySeason("autumn");
  else if (k === "8") applySeason("winter");
  else if (e.key === "Escape") escapeAll();
  else if (k === "?") showToast(t("keysHelp"));
});

// ---- 跟随视角：点击行人/观光车/校车跟拍，任何视角操作或 Esc 退出 ----
let followTarget: { mesh: THREE.InstancedMesh; id: number } | null = null;
const followRay = new THREE.Raycaster();
const FOLLOW_OFF = new THREE.Vector3(16, 11, 16);

function exitFollow(): void { followTarget = null; }

renderer.domElement.addEventListener("click", (e) => {
  if (followTarget) return; // 跟随中点击=继续跟随（由 controls 交互退出）
  if (walking?.active || navMode || flagMode || tour.on) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  followRay.setFromCamera(ndc, camera);
  const hits = followRay.intersectObjects([gTraffic], true);
  for (const h of hits) {
    const mesh = h.object as THREE.InstancedMesh;
    if (!mesh.isInstancedMesh || h.instanceId === undefined || h.instanceId >= mesh.count) continue;
    followTarget = { mesh, id: h.instanceId };
    picker?.clearSelection();
    showToast(t("followHint"));
    return;
  }
});
controls.addEventListener("start", exitFollow);

function updateFollow(): void {
  if (!followTarget) return;
  if (followTarget.id >= followTarget.mesh.count) { exitFollow(); return; }
  const arr = followTarget.mesh.instanceMatrix.array;
  const o = followTarget.id * 16;
  if (!Number.isFinite(arr[o + 12]) || arr[o + 13] < -10) { exitFollow(); return; } // 隐藏位不跟随
  const pos = new THREE.Vector3(arr[o + 12], Math.max(0, arr[o + 13]), arr[o + 14]);
  camera.position.lerp(pos.clone().add(FOLLOW_OFF), 0.05);
  controls.target.lerp(pos.clone().setY(1.2), 0.08);
}

// ---- 纠错入口：点选地图位置，预填 GitHub Issue ----
let flagMode = false;
let lastFlag: { x: number; y: number; lat: number; lon: number; near: string } | null = null;

function setFlagMode(v: boolean): void {
  flagMode = v;
  picker?.setEnabled(!v);
  document.querySelector("#tl-flag")!.classList.toggle("on", v);
  document.body.classList.toggle("flag-mode", v);
  if (v) showToast(t("flagHint"));
}
document.querySelector("#tl-flag")!.addEventListener("click", () => setFlagMode(!flagMode));

function flagIssueBody(): string {
  const f = lastFlag!;
  return [
    "**位置**",
    `地图坐标 x=${f.x.toFixed(0)}, y=${f.y.toFixed(0)}`,
    `经纬度（推算）：${f.lat.toFixed(6)}, ${f.lon.toFixed(6)}`,
    `附近：${f.near}`,
    "",
    "**问题说明**",
    document.querySelector<HTMLTextAreaElement>("#flag-desc")!.value || "（请在此补充说明）",
    "",
    "> 来自网页地图的纠错入口",
  ].join("\n");
}

renderer.domElement.addEventListener("click", (e) => {
  if (!flagMode) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  followRay.setFromCamera(ndc, camera);
  const hit = pickGround(followRay);
  if (!hit) return;
  const x = hit.x, y = -hit.z;
  const sceneDataMeta = sceneData?.meta;
  const lon0 = sceneDataMeta?.origin[0] ?? 106.295;
  const lat0 = sceneDataMeta?.origin[1] ?? 29.595;
  const lat = lat0 + y / 111320;
  const lon = lon0 + x / (111320 * Math.cos((lat0 * Math.PI) / 180));
  let near = "无命名建筑";
  let best = Infinity;
  for (const b of walkBuildings) {
    const p = b.polygon;
    const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
    const cy = p.reduce((s, q) => s + q[1], 0) / p.length;
    const d = Math.hypot(cx - x, cy - y);
    if (d < best) { best = d; near = b.name; }
  }
  lastFlag = { x, y, lat, lon, near };
  document.querySelector("#flag-info")!.textContent = `${t("flagNear")}: ${near} · ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  document.querySelector<HTMLElement>("#flag-dialog")!.hidden = false;
});
document.querySelector("#flag-cancel")!.addEventListener("click", () => {
  document.querySelector<HTMLElement>("#flag-dialog")!.hidden = true;
  setFlagMode(false);
});
document.querySelector("#flag-copy")!.addEventListener("click", () => {
  const body = flagIssueBody();
  (window.navigator.clipboard?.writeText(body) ?? Promise.reject()).then(
    () => showToast(t("flagCopied")),
    () => showToast(t("flagCopyFail")),
  );
});
document.querySelector("#flag-issue")!.addEventListener("click", () => {
  const body = flagIssueBody();
  const title = encodeURIComponent(`地图纠错：${lastFlag?.near ?? "未命名位置"}`);
  const url = `https://github.com/zhipengGui/cqu-campus-3d/issues/new?title=${title}&body=${encodeURIComponent(body)}`;
  window.open(url, "_blank");
  document.querySelector<HTMLElement>("#flag-dialog")!.hidden = true;
  setFlagMode(false);
});

// ---- 渲染循环（60fps 帽）----
let lastFrame = 0;
let lastWalkTime=0;
let lastTickMs = 0;
const lastShadowTarget=new THREE.Vector3(Infinity,Infinity,Infinity);
let lastShadowSize=-1;
renderer.setAnimationLoop((t) => {
  const nowMs = performance.now();
  const dtSec = lastTickMs ? Math.min(0.05, (nowMs - lastTickMs) / 1000) : 0.016; // 帧间隔须在覆盖前取
  tickAdaptiveQuality(nowMs, lastTickMs ? nowMs - lastTickMs : 0);
  lastTickMs = nowMs;
  const nextFrame=advanceFrame(lastFrame,t);if(nextFrame===null)return;
  lastFrame=nextFrame;
  // 水面波纹缓慢流动
  const ripple = waterMaterial.normalMap;
  if (ripple) {
    ripple.offset.x = (t * 0.000012) % 1;
    ripple.offset.y = (t * 0.000007) % 1;
  }
  const elapsed=lastWalkTime?(t-lastWalkTime)/1000:0;lastWalkTime=t;
  if(walking?.active)walking.update(elapsed);
  else if(freeCam?.active){freeCam.update(elapsed);}
  else controls.update();
  updateDetailAssets();
  if (scene.fog instanceof THREE.Fog) {
    const distance = camera.position.distanceTo(controls.target);
    scene.fog.near = Math.max(2100, distance * 1.3);
    scene.fog.far = Math.max(5200, distance * 2.2);
  }
  const shadowSize = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * .85, 160, 1700);
  if(shadowDirty||lastShadowTarget.distanceToSquared(controls.target)>.01||Math.abs(shadowSize-lastShadowSize)>.5) {
    sun.position.copy(controls.target).add(new THREE.Vector3(...sunDirection));
    sun.target.position.copy(controls.target);
    Object.assign(sun.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize });
    sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
    lastShadowTarget.copy(controls.target);lastShadowSize=shadowSize;shadowDirty=false;
  }
  labels.update(camera, controls.target);
  treeSys?.updateLod(camera.position);
  rerankLandmarks?.(controls.target);
  traffic?.update(dtSec);
  updateFollow();
  updateWalkHud();
  renderer.render(scene, camera);
  labels.render(scene, camera);
});

// 调试入口（控制台用）
Object.assign(window, { __huxi: { renderer, scene, camera, controls, detailAssets,get navigation(){return routeNavigator;},get walking(){return walking;},get terrain(){return activeTerrain;},get freeCam(){return freeCam;},get vegetation(){return vegetation;},get treeSys(){return treeSys;},get follow(){return followTarget;},followAt(mi:number,ii:number){const g=scene.getObjectByName('g-traffic');if(!g)return;let i=0;let target:THREE.InstancedMesh|undefined;g.traverse(o=>{if((o as THREE.InstancedMesh).isInstancedMesh){if(i===mi)target=o as THREE.InstancedMesh;i++;}});if(target)followTarget={mesh:target,id:ii};},get trafficCtl(){return trafficCtl;},switchCampus:(id:string)=>{void switchCampus(id);},get memInfo(){return {...renderer.info.memory};},reload(){return (async()=>{switching=true;disposeCampus();campus=CAMPUSES.huxi;await loadScene();renderLayers();renderLighting();homeView();switching=false;})();} } });

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-building-view]")) {
  button.addEventListener("click", () => focusBuilding(flyTargetBuilding, button.dataset.buildingView));
}
