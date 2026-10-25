import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

/** 全应用唯一的指针锁（owner 制）：步行漫游与自由视角共享同一个
 *  PointerLockControls。lock/unlock/error 事件只派发给当前 owner，
 *  从机制上杜绝"多实例守卫互相拆锁"（进入即被对方解锁秒退的根因）。
 *  设计认知：步行=约束更多的第一人称，飞行=约束更少的第一人称，
 *  两者共用输入与锁定底层，只是移动策略不同。 */

export interface LockOwner {
  /** 锁定成功（owner 请求后；owner 已在 request 时登记） */
  lockGranted(): void;
  /** 被动失锁（用户按 Esc 等）——owner 通常应退出自身模式 */
  lockLost(): void;
  /** 请求失败（无头环境/权限等）——owner 应降级（拖动视角），而非退出 */
  lockFailed(): void;
}

export class SharedPointerLock {
  readonly plc: PointerLockControls;
  private owner: LockOwner | null = null;
  private attempt = 0;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLElement) {
    this.plc = new PointerLockControls(camera, canvas);
    // 俯仰限制取两模式折中（飞行想看天看地，步行防过度仰俯）
    this.plc.minPolarAngle = 0.05;
    this.plc.maxPolarAngle = Math.PI - 0.05;
    // 唯一的 lock/unlock/error 处理点：只对当前 owner 生效
    this.plc.addEventListener("unlock", () => {
      if (this.owner) { const o = this.owner; this.owner = null; o.lockLost(); }
    });
    canvas.ownerDocument.addEventListener("pointerlockerror", () => {
      if (this.owner) this.owner.lockFailed(); // 保留 owner，走降级
    });
  }

  /** 请求锁定；owner 独占，后一个请求会顶掉前一个（模式切换场景） */
  request(owner: LockOwner): void {
    this.owner = owner;
    const attempt = ++this.attempt;
    try {
      const req = this.plc.domElement!.requestPointerLock() as Promise<void> | undefined;
      req?.catch(() => { if (this.attempt === attempt) owner.lockFailed(); });
    } catch { owner.lockFailed(); }
  }

  /** 主动释放（仅 owner 本身有效） */
  release(owner: LockOwner): void {
    if (this.owner !== owner) return;
    this.owner = null;
    if (this.plc.isLocked) this.plc.unlock();
  }

  get isLocked(): boolean { return this.plc.isLocked; }
}
