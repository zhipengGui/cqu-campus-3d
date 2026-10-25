import type {SceneData} from './types';
import type {RoadPoint} from './routing';
import {inCampus,distanceToBoundary} from './campusClip.ts';

type Region={ring:RoadPoint[];holes:RoadPoint[][]};
type Segment={a:RoadPoint;b:RoadPoint;width:number};
type Cell={blocks:Set<Region>;paving:Set<Region>;roads:Set<Segment>};

/** 自由视角使用的碰撞能力面（WalkWorld 实现之） */
export interface FlyWorld { moveFly(position:RoadPoint,delta:RoadPoint,alt:number):RoadPoint };
function segmentDistance(p:RoadPoint,a:RoadPoint,b:RoadPoint):number {
  const x=b[0]-a[0],y=b[1]-a[1],l=x*x+y*y,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/l)):0;
  return Math.hypot(p[0]-a[0]-x*t,p[1]-a[1]-y*t);
}
function inside(p:RoadPoint,r:Region):boolean {return inCampus(p,r.ring)&&!r.holes.some(h=>inCampus(p,h));}
function edgeDistance(p:RoadPoint,r:Region):number {return Math.min(distanceToBoundary(p,r.ring),...r.holes.map(h=>distanceToBoundary(p,h)));}

/** Flat outdoor walking only: mapped roads/paving, with building, water and campus barriers. */
export class WalkWorld {
  private cells=new Map<string,Cell>();
  private boundary:RoadPoint[]|undefined;
  /** 自由视角用：带顶高的建筑/水面块（x,y 米坐标 → [{ring,holes,topY}]） */
  private flyCells=new Map<string,{ring:RoadPoint[];holes:RoadPoint[][];topY:number}[]>();
  constructor(data:Pick<SceneData,'boundary'|'buildings'|'roads'|'paving'|'water'>){
    this.boundary=data.boundary?.pts;
    for(const b of data.buildings.filter(b=>b.inside) as (SceneData['buildings'][number])[]){
      this.index({ring:b.polygon,holes:b.holes},'blocks');
      this.indexFly(b.polygon,b.holes,(b as {height?:number}).height??10);
    }
    for(const a of data.water)for(const ring of a.outers){
      this.index({ring,holes:a.inners},'blocks');
      this.indexFly(ring,a.inners,0.2); // 水面几乎不挡飞行（仅贴水判定）
    }
    for(const a of data.paving)for(const ring of a.outers)this.index({ring,holes:a.inners},'paving');
    for(const road of data.roads)for(let i=1;i<road.pts.length;i++){
      const segment={a:road.pts[i-1],b:road.pts[i],width:road.width};this.put([segment.a,segment.b],road.width/2,cell=>cell.roads.add(segment));
    }
  }
  private indexFly(ring:RoadPoint[],holes:RoadPoint[][],topY:number):void {
    if(ring.length<3)return;
    const block={ring,holes,topY};
    const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
    for(let x=Math.floor((Math.min(...xs)-1)/32);x<=Math.floor((Math.max(...xs)+1)/32);x++)
      for(let y=Math.floor((Math.min(...ys)-1)/32);y<=Math.floor((Math.max(...ys)+1)/32);y++){
        const key=x+','+y;
        let arr=this.flyCells.get(key);if(!arr){arr=[];this.flyCells.set(key,arr);}
        arr.push(block);
      }
  }
  /** 飞行碰撞：仅当相机高度低于块顶+2m 时该块才阻挡；逐轴滑动容许贴墙滑行 */
  private flyBlocked(p:RoadPoint,alt:number):boolean {
    for(let x=Math.floor((p[0]-0.8)/32);x<=Math.floor((p[0]+0.8)/32);x++)
      for(let y=Math.floor((p[1]-0.8)/32);y<=Math.floor((p[1]+0.8)/32);y++){
        const arr=this.flyCells.get(x+','+y);if(!arr)continue;
        for(const b of arr){
          if(alt>=b.topY+2)continue;
          if(inside(p,{ring:b.ring,holes:b.holes})||edgeDistance(p,{ring:b.ring,holes:b.holes})<0.8)return true;
        }
      }
    return false;
  }
  /** 自由视角移动：xy 平面带建筑碰撞（按 alt 高度），返回实际位移 [dx,dy] */
  moveFly(position:RoadPoint,delta:RoadPoint,alt:number):RoadPoint {
    let moved:RoadPoint=[0,0];
    if(!delta.every(Number.isFinite))return moved;
    const steps=Math.max(1,Math.ceil(Math.hypot(...delta)/1.2));
    const dx=delta[0]/steps,dy=delta[1]/steps;
    let px=position[0],py=position[1];
    for(let i=0;i<steps;i++){
      const fx=px+dx,fy=py+dy;
      if(!this.flyBlocked([fx,fy],alt)){px=fx;py=fy;continue;}
      if(!this.flyBlocked([fx,py],alt))px=fx; // 贴墙滑行
      else if(!this.flyBlocked([px,fy],alt))py=fy;
    }
    return [px-position[0],py-position[1]];
  }
  private index(region:Region,field:'blocks'|'paving'):void {if(region.ring.length>=3)this.put(region.ring,0,cell=>cell[field].add(region));}
  private put(points:RoadPoint[],padding:number,add:(cell:Cell)=>void):void {
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    for(let x=Math.floor((Math.min(...xs)-padding)/32);x<=Math.floor((Math.max(...xs)+padding)/32);x++)for(let y=Math.floor((Math.min(...ys)-padding)/32);y<=Math.floor((Math.max(...ys)+padding)/32);y++){
      const key=x+','+y;let cell=this.cells.get(key);if(!cell){cell={blocks:new Set(),paving:new Set(),roads:new Set()};this.cells.set(key,cell);}add(cell);
    }
  }
  isFree(p:RoadPoint,radius=.3):boolean {
    if(!p.every(Number.isFinite)||!Number.isFinite(radius)||radius<=0)return false;
    if(this.boundary&&(!inCampus(p,this.boundary)||distanceToBoundary(p,this.boundary)<radius))return false;
    const blocks=new Set<Region>(),paving=new Set<Region>(),roads=new Set<Segment>();
    for(let x=Math.floor((p[0]-radius)/32);x<=Math.floor((p[0]+radius)/32);x++)for(let y=Math.floor((p[1]-radius)/32);y<=Math.floor((p[1]+radius)/32);y++){
      const cell=this.cells.get(x+','+y);if(cell){for(const a of cell.blocks)blocks.add(a);for(const a of cell.paving)paving.add(a);for(const a of cell.roads)roads.add(a);}
    }
    for(const area of blocks)if(inside(p,area)||edgeDistance(p,area)<radius-1e-8)return false;
    for(const s of roads)if(segmentDistance(p,s.a,s.b)<=s.width/2-radius+1e-8)return true;
    for(const area of paving)if(inside(p,area)&&edgeDistance(p,area)>=radius-1e-8)return true;
    return false;
  }
  move(position:RoadPoint,delta:RoadPoint,radius=.3):RoadPoint {
    let p:RoadPoint=[...position];if(!this.isFree(p,radius)||!delta.every(Number.isFinite))return p;
    const steps=Math.max(1,Math.ceil(Math.hypot(...delta)/(radius*.5))),dx=delta[0]/steps,dy=delta[1]/steps;
    for(let i=0;i<steps;i++){
      const full:RoadPoint=[p[0]+dx,p[1]+dy];if(this.isFree(full,radius)){p=full;continue;}
      const x:RoadPoint=[p[0]+dx,p[1]];if(this.isFree(x,radius))p=x;
      const y:RoadPoint=[p[0],p[1]+dy];if(this.isFree(y,radius))p=y;
    }return p;
  }
  findSpawn(preferred:RoadPoint,candidates:RoadPoint[]):RoadPoint|null {
    const points=[preferred,...candidates.filter(p=>Math.hypot(p[0]-preferred[0],p[1]-preferred[1])<=100)];
    points.sort((a,b)=>Math.hypot(a[0]-preferred[0],a[1]-preferred[1])-Math.hypot(b[0]-preferred[0],b[1]-preferred[1]));
    const point=points.find(p=>this.isFree(p));return point?[...point]:null;
  }
}
