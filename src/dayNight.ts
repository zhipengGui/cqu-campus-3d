import * as THREE from "three";
import { WINDOW_GLOW, dormWindowLitMaterial } from "./facades";
import { skyTexture, skyMeta } from "./skyGradient";

/** 昼/昏/夜三档光照预设。 */

export type PresetName = "morning" | "day" | "dusk" | "night";

interface Preset {
  bg: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  hemiInt: number;
  sunColor: number;
  sunInt: number;
  sunPos: [number, number, number];
  shadows: boolean;
  emissive: number; // 楼栋自发光（夜间让白模在暗景中可读）
}

const PRESETS: Record<PresetName, Preset> = {
  morning: {
    bg: 0xe6eef7, fogNear: 2000, fogFar: 4800,
    hemiSky: 0xccdef5, hemiGround: 0x79836c, hemiInt: 0.9,
    sunColor: 0xe9f2ff, sunInt: 1.35, sunPos: [-950, 520, 550],
    shadows: true, emissive: 0x000000,
  },
  day: {
    bg: 0xd6d8c8, fogNear: 2200, fogFar: 5200,
    hemiSky: 0xcfe5ff, hemiGround: 0xb8b09a, hemiInt: .95,
    sunColor: 0xfff2dd, sunInt: 1.8, sunPos: [600, 900, 350],
    shadows: true, emissive: 0x000000,
  },
  dusk: {
    bg: 0xf0c39c, fogNear: 1800, fogFar: 4600,
    hemiSky: 0xffc9a3, hemiGround: 0x6b5a66, hemiInt: 0.55,
    sunColor: 0xff9a5c, sunInt: 1.5, sunPos: [-1300, 300, 700],
    shadows: true, emissive: 0x0d0703,
  },
  night: {
    bg: 0x0d1626, fogNear: 1600, fogFar: 4200,
    hemiSky: 0x24344d, hemiGround: 0x11151d, hemiInt: 0.26,
    sunColor: 0x9db8d9, sunInt: 0.28, sunPos: [-700, 800, -500],
    shadows: false, emissive: 0x0a1424,
  },
};

let baseEmissive = 0x000000;
let windowGlowOn = false;
export function currentBaseEmissive(): number {
  return baseEmissive;
}

/** Apply the current lighting to all materials, retaining whole-building selection. */
export function applyBuildingEmissive(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pickRoot = (mesh.userData.pickRoot as THREE.Object3D | undefined) ?? mesh;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const mat = material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        // 有窗灯贴片的材质在夜景用暖白窗光（选中高亮仍优先），其余维持整楼底光。
        const glow = windowGlowOn && mat.emissiveMap ? WINDOW_GLOW : baseEmissive;
        mat.emissive.setHex(pickRoot.userData.highlightColor ?? glow);
      }
    }
  });
}

export class DayNight {
  constructor(
    private scene: THREE.Scene,
    private hemi: THREE.HemisphereLight,
    private sun: THREE.DirectionalLight,
    private buildings: THREE.Group,
  ) {}

  apply(name: PresetName): void {
    const p = PRESETS[name];
    const meta = skyMeta(name);
    this.scene.background = skyTexture(name);
    this.scene.environment = skyTexture(name);
    this.scene.environmentIntensity = meta.envInt;
    this.scene.fog = new THREE.Fog(new THREE.Color(meta.horizon).getHex(), p.fogNear, p.fogFar);
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemiInt;
    this.sun.color.setHex(p.sunColor);
    this.sun.intensity = p.sunInt;
    this.sun.position.set(...p.sunPos);
    this.sun.castShadow = p.shadows;
    baseEmissive = p.emissive;
    windowGlowOn = name === "night";
    dormWindowLitMaterial.emissive.setHex(windowGlowOn ? WINDOW_GLOW : 0x000000);
    applyBuildingEmissive(this.buildings);
    document.body.classList.toggle("night", name === "night");
  }
}
