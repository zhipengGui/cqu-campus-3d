import * as THREE from "three";
import type { PresetName } from "./dayNight";

/** 程序化天空（gxu 同款思路）：256×128 等距柱状渐变，兼作 scene.background 与
 *  environment（反射/IBL）。四光影预设各一张，缓存复用；地平线暖雾收边。 */

interface SkyPreset {
  top: string;
  horizon: string;
  ground: string;
  sunTint: string;
  sunU: number; // 太阳水平位置 0..1（贴图 u），无太阳给 -1
  envInt: number;
}

const SKY: Record<PresetName, SkyPreset> = {
  morning: { top: "#9db8d9", horizon: "#e3e9ef", ground: "#79836c", sunTint: "#f0dcb8", sunU: 0.22, envInt: .5 },
  day: { top: "#82aad6", horizon: "#e0e4dc", ground: "#b8b09a", sunTint: "#fff6e4", sunU: 0.62, envInt: .62 },
  dusk: { top: "#5c5f82", horizon: "#f0c39c", ground: "#6b5a66", sunTint: "#ff9a5c", sunU: 0.82, envInt: .5 },
  night: { top: "#0a1220", horizon: "#15223b", ground: "#11151d", sunTint: "", sunU: -1, envInt: .12 },
};

const cache = new Map<PresetName, THREE.Texture>();

function drawSky(p: SkyPreset): HTMLCanvasElement {
  const W = 256, H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  // 天顶 → 地平线（地平线在 45% 高度）
  const sky = g.createLinearGradient(0, 0, 0, H * 0.46);
  sky.addColorStop(0, p.top);
  sky.addColorStop(1, p.horizon);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H * 0.46);
  // 地平线暖雾窄带 + 地面
  const belt = g.createLinearGradient(0, H * 0.46, 0, H * 0.54);
  belt.addColorStop(0, p.horizon);
  belt.addColorStop(1, p.ground);
  g.fillStyle = belt;
  g.fillRect(0, H * 0.46, W, H * 0.08);
  g.fillStyle = p.ground;
  g.fillRect(0, H * 0.54, W, H * 0.46);
  // 太阳侧暖染
  if (p.sunU >= 0) {
    const sun = g.createRadialGradient(p.sunU * W, H * 0.38, 4, p.sunU * W, H * 0.38, W * 0.34);
    sun.addColorStop(0, p.sunTint);
    sun.addColorStop(1, "rgba(255,255,255,0)");
    g.globalAlpha = 0.55;
    g.fillStyle = sun;
    g.fillRect(0, 0, W, H * 0.6);
    g.globalAlpha = 1;
  }
  return c;
}

export function skyTexture(name: PresetName): THREE.Texture {
  let tex = cache.get(name);
  if (!tex) {
    tex = new THREE.CanvasTexture(drawSky(SKY[name]));
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.set(name, tex);
  }
  return tex;
}

/** 当前预设的环境反射强度与地平线雾色（dayNight 切换时取用）。 */
export function skyMeta(name: PresetName): { envInt: number; horizon: string } {
  const p = SKY[name];
  return { envInt: p.envInt, horizon: p.horizon };
}
