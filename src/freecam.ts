import * as THREE from "three";
import type {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import type {FlyWorld} from "./walkCollision";
import type {RoadPoint} from "./routing";
import {SharedPointerLock, type LockOwner} from "./pointerLock";
import { cancelFly } from "./flyTo";

/** 自由视角（FreeCam）：第一人称的"飞行预设"——WASD 平移 + Space/C 升降
 *  + Shift 加速 + 滚轮调速。带建筑高度碰撞（可飞越楼顶）与模型范围边界。
 *  指针锁定走共享 SharedPointerLock（owner 制）。 */

export interface FlyBounds {
  x0: number; x1: number; y0: number; y1: number; // 地图米坐标
  yMin: number; yMax: number; // 飞行高度区间
}

export interface FreeCamEvents {
  onSpeed?(speed: number): void;
  onEdge?(): void;
  onExit?(message?: string): void;
}

export class FreeCam implements LockOwner {
  active=false;
  lockDegraded=false;
  speed=30; // m/s
  private keys=new Set<string>();
  private camera:THREE.PerspectiveCamera;
  private orbit:OrbitControls;
  private world:FlyWorld;
  private lock:SharedPointerLock;
  private events:FreeCamEvents;
  private snapshot:{position:THREE.Vector3;quaternion:THREE.Quaternion;target:THREE.Vector3;fov:number;view:THREE.PerspectiveCamera['view']}|null=null;
  private edgeToastAt=0;
  /** 移动端注入：摇杆归一化向量（屏幕系：x 右 / y 上）与升降开关 */
  mobileInput:{x:number;y:number;up:boolean;down:boolean}={x:0,y:0,up:false,down:false};

  readonly bounds:FlyBounds;
  constructor(camera:THREE.PerspectiveCamera,orbit:OrbitControls,world:FlyWorld,lock:SharedPointerLock,bounds:FlyBounds,events:FreeCamEvents={}) {
    this.camera=camera;this.orbit=orbit;this.world=world;this.lock=lock;this.bounds=bounds;this.events=events;
    document.addEventListener('keydown',e=>{
      if(!this.active)return;
      if(['KeyW','KeyA','KeyS','KeyD','Space','KeyC','ControlLeft','ControlRight','ShiftLeft','ShiftRight'].includes(e.code)){
        if(e.code==='Space')e.preventDefault(); // 防页面滚动/回触按钮
        this.keys.add(e.code);e.preventDefault();
      }
    });
    document.addEventListener('keyup',e=>this.keys.delete(e.code));
  }

  lockGranted():void {/* enter 已假定成功路径 */}
  lockLost():void { if(this.active) this.exit(); }  // 用户按 Esc 解锁 = 退出飞行
  lockFailed():void { this.lockDegraded=true; }       // 降级：拖动视角（main 已兜底）

  enter():boolean {
    if(this.active)return false;
    cancelFly(); // 中断进行中的 flyTo/巡游运镜，防止其覆盖飞行位置
    const c=this.camera,o=this.orbit;
    this.snapshot={position:c.position.clone(),quaternion:c.quaternion.clone(),target:o.target.clone(),fov:c.fov,view:c.view?{...c.view}:null};
    const damping=o.enableDamping;o.enableDamping=false;o.update();o.enableDamping=damping;o.enabled=false;
    this.active=true;this.lockDegraded=false;this.keys.clear();c.clearViewOffset();
    // 起点一次性钳入边界（如从 home 高远景进入），避免首帧移动时跳变
    const B=this.bounds;
    c.position.x=Math.max(B.x0+2,Math.min(B.x1-2,c.position.x));
    c.position.z=Math.max(-B.y1+2,Math.min(-B.y0-2,c.position.z));
    const floor=this.world.heightAt?.(c.position.x,-c.position.z)??0;
    c.position.y=Math.max(B.yMin+floor,Math.min(B.yMax,c.position.y));
    this.lock.request(this);
    return true;
  }

  exit(message?:string):void {
    if(!this.active||!this.snapshot)return;
    this.active=false;this.keys.clear();
    this.mobileInput={x:0,y:0,up:false,down:false};
    this.lock.release(this);
    const s=this.snapshot;this.snapshot=null;
    const c=this.camera;
    c.position.copy(s.position);c.quaternion.copy(s.quaternion);this.orbit.target.copy(s.target);
    c.fov=s.fov;
    if(s.view){const v=s.view;c.setViewOffset(v.fullWidth??innerWidth,v.fullHeight??innerHeight,v.offsetX/v.fullWidth*innerWidth,v.offsetY/v.fullHeight*innerWidth,v.fullWidth??innerWidth,v.fullHeight??innerHeight);}
    else c.clearViewOffset();
    c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();
    this.orbit.enabled=true;this.orbit.update();
    this.events.onExit?.(message);
  }

  /** 滚轮调速：上滚加速 */
  wheel(dy:number):void {
    if(!this.active)return;
    this.speed=Math.max(8,Math.min(120,this.speed*(dy<0?1.15:1/1.15)));
    this.events.onSpeed?.(this.speed);
  }

  update(dt:number):void {
    if(!this.active)return;
    const c=this.camera;
    const fwd=c.getWorldDirection(new THREE.Vector3());fwd.y=0;
    if(fwd.lengthSq()<1e-6)fwd.set(0,0,-1);
    fwd.normalize();
    const right=new THREE.Vector3().crossVectors(fwd,c.up).normalize();
    const k=this.keys;
    // Ctrl 与 WASD 同按时忽略 Ctrl（防 Ctrl+W 关标签）
    const ctrl=(k.has('ControlLeft')||k.has('ControlRight'))&&!['KeyW','KeyA','KeyS','KeyD'].some(x=>k.has(x));
    let mvx=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0)+this.mobileInput.x;
    let mvz=(k.has('KeyW')?1:0)-(k.has('KeyS')?1:0)+this.mobileInput.y;
    let mvy=(k.has('Space')?1:0)-(k.has('KeyC')||ctrl?1:0)+(this.mobileInput.up?1:0)-(this.mobileInput.down?1:0);
    const len=Math.hypot(mvx,mvz,mvy);
    if(len>1e-4){
      const boost=k.has('ShiftLeft')||k.has('ShiftRight')?2.5:1;
      const dist=this.speed*boost*dt;
      const step=new THREE.Vector3()
        .addScaledVector(fwd,mvz/Math.max(1,len))
        .addScaledVector(right,mvx/Math.max(1,len))
        .add(new THREE.Vector3(0,mvy/Math.max(1,len),0))
        .multiplyScalar(dist);
      // 水平碰撞（按当前飞行高度判定建筑顶）
      const pos:RoadPoint=[c.position.x,-c.position.z];
      const moved=this.world.moveFly(pos,[step.x,-step.z],c.position.y);
      // moved 是地图 y 系位移，世界 z=-y：Δz = -Δy
      let nx=c.position.x+moved[0],ny=c.position.y+step.y,nz=c.position.z-moved[1];
      // 高度与边界
      const B=this.bounds;
      ny=Math.min(B.yMax,ny);
      const beyond=nx<B.x0||nx>B.x1||nz<-B.y1||nz>-B.y0;
      if(beyond){
        nx=Math.max(B.x0+1,Math.min(B.x1-1,nx));
        nz=Math.max(-B.y1+1,Math.min(-B.y0-1,nz));
        const now=performance.now();
        if(now-this.edgeToastAt>2500){this.edgeToastAt=now;this.events.onEdge?.();}
      }
      const floor=this.world.heightAt?.(nx,-nz)??0;
      c.position.set(nx,Math.max(B.yMin+floor,ny),nz);
    }
    // OrbitControls 兼容：把 target 放在视线前方（部分依赖 target 的逻辑用）
    this.orbit.target.copy(c.position).addScaledVector(c.getWorldDirection(new THREE.Vector3()),10);
  }
}
