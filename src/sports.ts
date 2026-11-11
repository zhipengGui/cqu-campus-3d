import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {Area} from './types';
import {inCampus} from './campusClip.ts';

type Pt=[number,number];
type Buckets=Record<string,THREE.BufferGeometry[]>;
const FLOOR=.15, PAINT=.19;
const COLORS:Record<string,number>={
  mark:0xf5f3e7,courtGreen:0x347e69,courtKey:0xbd6447,apron:0x527d70,
  turf:0x438658,stripe:0x4b925f,tennis:0x407d91,badminton:0x537f83,
  siqunTrack:0x4c638e,siqunTrackAlt:0x465d87,
  siqunNewTrack:0x398dbd,siqunNewTrackAlt:0x3688b6,
  sand:0xd9c38f,pool:0x438fae,lane:0x285e7a,track:0xba563f,trackAlt:0xb7543e,walk:0xbdbca9,
  frame:0x246752,metal:0x879593,orange:0xe5762c,glass:0xa7c7c6,net:0xb5c8c2,
  huxiBlue:0x398fae,courtBlue:0x3d87a2,lanGray:0x647278,membrane:0xf1eee4,
};
const SUPPORTED=new Set(['basketball','soccer','tennis','badminton','volleyball','beachvolleyball','table_tennis']);
// User confirmed on 2026-10-16: running track surrounds the football pitch next to the gym.
// Centre/orientation follow OSM pitch 1057532743; eight 1.22m lanes and oval dimensions are estimates.
const VERIFIED_TRACK={pitchId:1057532743,width:98,length:180};

export function detailedSport(a:Area):boolean {
  return a.kind==='pool'||(a.kind==='pitch'&&SUPPORTED.has(a.sport??''))||
    (a.kind==='track'&&(a.sport==='running'||a.sport==='athletics'));
}

/** Minimum oriented box, using mapped edges as candidates; local x is width. */
export function sportsFrame(ring:Pt[]) {
  let best:{cx:number;cy:number;width:number;length:number;angle:number}|undefined,bestArea=Infinity;
  for(let i=0;i<ring.length;i++) {
    const next=ring[(i+1)%ring.length],dx=next[0]-ring[i][0],dy=next[1]-ring[i][1],len=Math.hypot(dx,dy);
    if(len<.01)continue;
    const c=dx/len,s=dy/len,us=ring.map(p=>p[0]*c+p[1]*s),vs=ring.map(p=>-p[0]*s+p[1]*c);
    const u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs),a=(u1-u0)*(v1-v0);
    if(a>=bestArea-1e-5)continue;
    bestArea=a;const u=(u0+u1)/2,v=(v0+v1)/2;
    const width=Math.min(u1-u0,v1-v0),length=Math.max(u1-u0,v1-v0);
    const angle=Math.atan2(s,c)+(u1-u0>v1-v0?Math.PI/2:0);
    best={cx:u*c-v*s,cy:u*s+v*c,width,length,angle};
  }
  return best;
}

function bucket():Buckets{return Object.fromEntries(Object.keys(COLORS).map(k=>[k,[]]));}
function polygon(b:Buckets,key:string,pts:Pt[],y=FLOOR,holes:Pt[][]=[]):void {
  const shape=new THREE.Shape(pts.map(p=>new THREE.Vector2(...p)));
  shape.holes=holes.map(ring=>new THREE.Path(ring.map(p=>new THREE.Vector2(...p))));
  const g=new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI/2);g.translate(0,y,0);b[key].push(g);
}
function rect(b:Buckets,key:string,x0:number,v0:number,x1:number,v1:number,y=FLOOR):void {
  polygon(b,key,[[x0,v0],[x1,v0],[x1,v1],[x0,v1]],y);
}
function line(b:Buckets,a:Pt,c:Pt,w=.075,y=PAINT,key='mark'):void {
  const dx=c[0]-a[0],dy=c[1]-a[1],l=Math.hypot(dx,dy);if(l<1e-6)return;
  const x=-dy/l*w/2,v=dx/l*w/2;
  polygon(b,key,[[a[0]+x,a[1]+v],[c[0]+x,c[1]+v],[c[0]-x,c[1]-v],[a[0]-x,a[1]-v]],y);
}
function outline(b:Buckets,x0:number,v0:number,x1:number,v1:number,w=.075):void {
  const p:Pt[]=[[x0,v0],[x1,v0],[x1,v1],[x0,v1]];
  p.forEach((a,i)=>line(b,a,p[(i+1)%4],w));
}
function arc(b:Buckets,x:number,v:number,r:number,start=0,end=Math.PI*2,w=.075):void {
  const n=Math.max(8,Math.ceil((end-start)*r*2));
  for(let i=0;i<n;i++) {
    const a=start+(end-start)*i/n,c=start+(end-start)*(i+1)/n;
    line(b,[x+r*Math.cos(a),v+r*Math.sin(a)],[x+r*Math.cos(c),v+r*Math.sin(c)],w);
  }
}
function box(b:Buckets,key:string,x:number,y:number,v:number,w:number,h:number,d:number):void {
  const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,-v);b[key].push(g);
}
function beam(b:Buckets,key:string,a:[number,number,number],c:[number,number,number],r:number,sides=6):void {
  const p=new THREE.Vector3(a[0],a[2],-a[1]),q=new THREE.Vector3(c[0],c[2],-c[1]),d=q.clone().sub(p),l=d.length();
  if(l<1e-6)return;
  const g=new THREE.CylinderGeometry(r,r,l,sides);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));
  g.translate(...p.add(q).multiplyScalar(.5).toArray());b[key].push(g);
}
function net(b:Buckets,width:number,top:number,bottom:number):void {
  top+=FLOOR;bottom+=FLOOR;
  for(const x of [-width/2,width/2])beam(b,'metal',[x,0,FLOOR],[x,0,top+.12],.045);
  beam(b,'mark',[-width/2,0,top],[width/2,0,top],.025);
  for(let i=0;i<=Math.ceil(width/.45);i++) {
    const x=-width/2+width*i/Math.ceil(width/.45);beam(b,'net',[x,0,bottom],[x,0,top],.009,3);
  }
  for(let y=bottom;y<top;y+=.20)beam(b,'net',[-width/2,0,y],[width/2,0,y],.009,3);
}

function basketball(b:Buckets,court='courtGreen',key='courtKey'):void {
  // Disjoint colour regions avoid coplanar overlapping surfaces.
  for(const p of [[-7.5,-14,-2.45,14],[2.45,-14,7.5,14],[-2.45,-8.2,2.45,8.2]])rect(b,court,p[0],p[1],p[2],p[3]);
  rect(b,key,-2.45,-14,2.45,-8.2);rect(b,key,-2.45,8.2,2.45,14);
  outline(b,-7.5,-14,7.5,14);line(b,[-7.5,0],[7.5,0]);arc(b,0,0,1.8);
  for(const s of [-1,1]) {
    const end=s*14,free=s*8.2,rim=s*12.425,start=s<0?0:Math.PI;
    outline(b,-2.45,end,2.45,free);arc(b,0,free,1.8,start,start+Math.PI);
    for(let i=0;i<6;i++)arc(b,0,free,1.8,start+Math.PI+i*Math.PI/6,start+Math.PI+(i+.5)*Math.PI/6);
    const dy=Math.sqrt(6.75**2-6.6**2),a=Math.atan2(dy,6.6);
    for(const x of [-6.6,6.6])line(b,[x,end],[x,rim-s*dy]);
    arc(b,0,rim,6.75,s<0?a:Math.PI+a,s<0?Math.PI-a:2*Math.PI-a);
    arc(b,0,rim,1.25,start,start+Math.PI);
    const post=s*14.55,board=s*12.815;
    box(b,'metal',0,FLOOR+.06,post,.74,.12,.52);
    beam(b,'frame',[0,post,FLOOR],[0,post,FLOOR+2.68],.10);
    beam(b,'frame',[0,post,FLOOR+2.58],[0,s*13.35,FLOOR+3.43],.055);
    beam(b,'frame',[0,s*13.35,FLOOR+3.43],[0,board,FLOOR+3.43],.055);
    box(b,'glass',0,FLOOR+3.425,board,1.8,1.05,.035);
    for(const x of [-.875,.875])box(b,'mark',x,FLOOR+3.425,board-s*.025,.05,1.05,.035);
    for(const h of [2.925,3.925])box(b,'mark',0,FLOOR+h,board-s*.025,1.8,.05,.035);
    for(const x of [-.28,.28])box(b,'mark',x,FLOOR+3.23,board-s*.045,.035,.45,.025);
    for(const h of [3.02,3.45])box(b,'mark',0,FLOOR+h,board-s*.045,.60,.035,.025);
    const ring=new THREE.TorusGeometry(.225,.014,6,20);ring.rotateX(Math.PI/2);ring.translate(0,FLOOR+3.041,-rim);b.orange.push(ring);
    for(let level=0;level<2;level++)for(let i=0;i<12;i++)for(const sign of [-1,1]) {
      const a=i*Math.PI/6,c=a+sign*Math.PI/12,r0=.225-level*.045,r1=r0-.045;
      beam(b,'net',[r0*Math.cos(a),rim+r0*Math.sin(a),FLOOR+3.041-level*.2],
        [r1*Math.cos(c),rim+r1*Math.sin(c),FLOOR+2.841-level*.2],.005,3);
    }
  }
}
function football(b:Buckets,width:number,length:number):void {
  const hw=width/2,hl=length/2,big=length>=80,goalW=big?7.32:3,goalH=big?2.44:2,goalY=hl+.08;
  for(let i=0;i<12;i++)rect(b,i%2?'turf':'stripe',-hw,-hl+i*length/12,hw,-hl+(i+1)*length/12);
  outline(b,-hw,-hl,hw,hl,.11);line(b,[-hw,0],[hw,0],.11);arc(b,0,0,big?9.15:3,0,2*Math.PI,.11);
  for(const s of [-1,1]) {
    const depth=big?16.5:6,w=big?40.32:Math.min(width*.70,14),end=s*hl;
    outline(b,-w/2,end,w/2,end-s*depth,.11);
    if(big){outline(b,-9.16,end,9.16,end-s*5.5,.11);const a=Math.asin(5.5/9.15);arc(b,0,end-s*11,9.15,s<0?a:Math.PI+a,s<0?Math.PI-a:2*Math.PI-a,.11);}
    for(const x of [-goalW/2,goalW/2]) {
      beam(b,'mark',[x,s*goalY,FLOOR],[x,s*goalY,goalH+FLOOR],.045);
      beam(b,'metal',[x,s*goalY,goalH+FLOOR],[x,s*(goalY+1.2),FLOOR],.035);
    }
    beam(b,'mark',[-goalW/2,s*goalY,goalH+FLOOR],[goalW/2,s*goalY,goalH+FLOOR],.045);
    for(let i=0;i<=10;i++) {const x=-goalW/2+goalW*i/10;beam(b,'net',[x,s*goalY,goalH+FLOOR],[x,s*(goalY+1.2),FLOOR],.006,3);}
  }
}
function racket(b:Buckets,sport:string):void {
  const tennis=sport==='tennis',bad=sport==='badminton',w=tennis?10.97:bad?6.1:9,l=tennis?23.77:bad?13.4:18;
  rect(b,tennis?'courtGreen':bad?'badminton':'courtKey',-w/2,-l/2,w/2,l/2);
  outline(b,-w/2,-l/2,w/2,l/2);
  if(tennis) {
    for(const x of [-4.115,4.115])line(b,[x,-l/2],[x,l/2]);
    for(const v of [-6.4,6.4])line(b,[-4.115,v],[4.115,v]);line(b,[0,-6.4],[0,6.4]);
  } else if(bad) {
    for(const x of [-2.59,2.59])line(b,[x,-6.7],[x,6.7]);
    for(const v of [-5.94,-1.98,1.98,5.94])line(b,[-3.05,v],[3.05,v]);
    line(b,[0,-6.7],[0,-1.98]);line(b,[0,1.98],[0,6.7]);
  } else for(const v of [-3,3])line(b,[-4.5,v],[4.5,v]);
  net(b,w+.8,tennis?1.08:bad?1.62:2.50,tennis?.12:bad?.85:1.50);
}
function oval(r:number,half:number):Pt[] {
  return [1,-1].flatMap(s=>Array.from({length:49},(_,i)=>{
    const a=(s>0?0:Math.PI)+i*Math.PI/48;return [r*Math.cos(a),s*half+r*Math.sin(a)] as Pt;
  }));
}
/** Include the confirmed running lanes when placing trees; OSM input stays untouched. */
export function sportsSiteAreas(areas:Area[]):Area[] {
  const pitch=areas.find(a=>a.id===VERIFIED_TRACK.pitchId),f=pitch&&sportsFrame(pitch.outers[0]);
  if(!pitch||!f)return [];
  const c=Math.cos(f.angle),s=Math.sin(f.angle),r=VERIFIED_TRACK.width/2,half=VERIFIED_TRACK.length/2-r;
  const ring=oval(r+1.3,half).map(([x,v])=>[f.cx+x*c-v*s,f.cy+x*s+v*c] as Pt);
  return [{id:'confirmed-main-track',name:'田径场',kind:'track',sport:'running',outers:[ring],inners:[]}];
}
function track(b:Buckets,width:number,length:number,pitchWidth?:number,pitchLength?:number,siqun=false,refined=false,huxi=false):void {
  const outer=width/2-1,inner=outer-8*1.22,half=Math.max(0,length/2-outer);
  if(inner<10)return;
  polygon(b,huxi?'huxiBlue':'apron',oval(outer+(huxi?4.5:1.3),half),FLOOR-.025,huxi?[oval(outer,half)]:[]);
  for(let lane=0;lane<8;lane++) {
    const p=oval(inner+lane*1.22,half),q=oval(inner+(lane+1)*1.22,half);
    const color = refined ? (lane%2?'siqunNewTrackAlt':'siqunNewTrack')
      : siqun ? (lane%2?'siqunTrackAlt':'siqunTrack') : (lane%2?'trackAlt':'track');
    for(let i=0;i<p.length;i++)polygon(b,color,[p[i],q[i],q[(i+1)%p.length],p[(i+1)%p.length]]);
  }
  const pw=pitchWidth??Math.min(64,inner*1.8),pl=pitchLength??Math.min(100,half*2+inner*.55);
  const pitch:Pt[]=[[-pw/2,-pl/2],[pw/2,-pl/2],[pw/2,pl/2],[-pw/2,pl/2]];
  polygon(b,huxi?'huxiBlue':'turf',oval(inner,half),FLOOR-.01,huxi?[pitch]:[]);
  for(let lane=0;lane<=8;lane++){const p=oval(inner+lane*1.22,half);p.forEach((a,i)=>line(b,a,p[(i+1)%p.length],.075));}
  if(refined) for(const side of [-1,1]) {
    line(b,[side*inner,-half+5],[side*outer,-half+5],.105);
    line(b,[side*inner,-half+4.5],[side*outer,-half+4.5],.068);
  }
  football(b,pw,pl);
  if(huxi) {
    for(const side of [-1,1])line(b,[side*inner,-half+4],[side*outer,-half+4],.11);
    // Low west-side spectator platform and the small tensile canopy visible in CQU's aerial.
    // Platform heights and membrane dimensions are display estimates.
    for(let row=0;row<3;row++)box(b,'walk',-outer-4-row*.85,.22+row*.16,0,.9,.28+row*.32,34);
    for(let cell=0;cell<6;cell++) {
      const v=-13.75+cell*5.5,x=-outer-6.0;
      const corners:Pt[]=[[x-4.6,v-2.75],[x+4.6,v-2.75],[x+4.6,v+2.75],[x-4.6,v+2.75]];
      const peak:[number,number,number]=[x,v,6.0];
      for(let i=0;i<4;i++) {
        const a=corners[i],c=corners[(i+1)%4];
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.Float32BufferAttribute([a[0],4.3,-a[1],c[0],4.3,-c[1],peak[0],peak[2],-peak[1]],3));
        g.computeVertexNormals();b.membrane.push(g);
        beam(b,'metal',[a[0],a[1],4.3],[c[0],c[1],4.3],.035);
      }
    }
    for(let bay=0;bay<=6;bay++)for(const x of [-outer-10.6,-outer-1.4])beam(b,'metal',[x,-16.5+bay*5.5,.1],[x,-16.5+bay*5.5,4.5],.08);
    for(const x of [-outer-7,outer+7])for(const v of [-half-22,half+22]) {
      beam(b,'metal',[x,v,0],[x,v,22],.16);
      box(b,'metal',x,22,v,3.6,.18,.24);
      for(let i=0;i<4;i++)box(b,'mark',x-1.35+i*.9,22.1,v,.55,.42,.26);
    }
  }
}

function tableTennis(b:Buckets,x=0,v=0):void {
  const h=FLOOR+.76;
  box(b,'courtBlue',x,h,v,2.74,.06,1.525);
  for(const s of [-1,1]) {
    beam(b,'mark',[x-1.35,v+s*.74,h+.035],[x+1.35,v+s*.74,h+.035],.012);
    beam(b,'mark',[x+s*1.35,v-.74,h+.035],[x+s*1.35,v+.74,h+.035],.012);
    for(const t of [-1,1])beam(b,'frame',[x+s*.9,v+t*.5,FLOOR],[x+s*.9,v+t*.5,h],.045);
  }
  beam(b,'mark',[x-1.35,v,h+.04],[x+1.35,v,h+.04],.012);
  box(b,'net',x,h+.10,v,.025,.15,1.7);
}

function fence(b:Buckets,width:number,length:number):void {
  const ring:Pt[]=[[-width/2,-length/2],[width/2,-length/2],[width/2,length/2],[-width/2,length/2]];
  ring.forEach((a,i)=>{
    const c=ring[(i+1)%4],len=Math.hypot(c[0]-a[0],c[1]-a[1]),n=Math.max(1,Math.ceil(len/2.5));
    for(let j=0;j<=n;j++) {
      if(i===0 && Math.abs(j/n-.5)<.035)continue;
      const p:Pt=[a[0]+(c[0]-a[0])*j/n,a[1]+(c[1]-a[1])*j/n];
      beam(b,'frame',[p[0],p[1],FLOOR],[p[0],p[1],3.0],.035);
    }
    for(const z of [1,2,3]) {
      if(i===0)for(const [lo,hi]of [[0,.46],[.54,1]])
        beam(b,'frame',[a[0]+(c[0]-a[0])*lo,a[1]+(c[1]-a[1])*lo,z],[a[0]+(c[0]-a[0])*hi,a[1]+(c[1]-a[1])*hi,z],.022);
      else beam(b,'frame',[a[0],a[1],z],[c[0],c[1],z],.022);
    }
  });
}

/** A single local frame per footprint, followed by material batching. */
export function buildSportsMarks(parent:THREE.Object3D,areas:Area[],siqunPreview=false,siqunRefined=false,huxiRefined=false):void {
  const all=bucket(),counts:Record<string,number>={};
  const confirmed=areas.filter(detailedSport).map(a=>sportsFrame(a.outers[0])).filter(f=>!!f);
  for(const a of areas.filter(a=>a.kind==='pitch'&&!a.sport)) {
    // Shared circulation within a mapped bank; no inferred court counts or running tracks.
    if(confirmed.filter(f=>inCampus([f.cx,f.cy],a.outers[0])).length>=2)
      for(const outer of a.outers)polygon(all,'walk',outer,.055);
    if(huxiRefined && [1057528491,472504372,472504374,472504360].includes(Number(a.id))) {
      const f=sportsFrame(a.outers[0]);if(!f)continue;
      const b=bucket();fence(b,f.width-.5,f.length-.5);
      const matrix=new THREE.Matrix4().makeRotationY(f.angle);matrix.setPosition(f.cx,0,-f.cy);
      for(const [key,geos]of Object.entries(b))for(const g of geos){g.applyMatrix4(matrix);all[key].push(g);}
    }
  }
  for(const a of areas) {
    if(!detailedSport(a)||!a.outers[0])continue;
    const f=sportsFrame(a.outers[0]);if(!f)continue;
    const b=bucket(),sport=a.kind==='pool'?'pool':a.kind==='track'?'track':a.sport!;
    const local=(p:Pt):Pt=>{const x=p[0]-f.cx,v=p[1]-f.cy,c=Math.cos(f.angle),s=Math.sin(f.angle);return [x*c+v*s,-x*s+v*c];};
    const pad=sport==='pool'?'pool':sport==='tennis'?'tennis':sport==='soccer'?'turf':sport==='beachvolleyball'?'sand':'apron';
    for(const outer of a.outers) {
      // The refined track already has disjoint apron, lane and pitch surfaces.
      if(huxiRefined && a.id===VERIFIED_TRACK.pitchId)continue;
      const shape=new THREE.Shape(outer.map(p=>new THREE.Vector2(...local(p))));
      for(const hole of a.inners)shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(...local(p)))));
      const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,FLOOR-.025,0);b[pad].push(g);
    }
    const pads=new Set(b[pad]);let scale=1;
    if(sport==='basketball'&&f.width<=18&&f.length<=34) {
      scale=Math.min(1,f.width/15,f.length/28);basketball(b,huxiRefined&&f.cy<0?'lanGray':'courtGreen',huxiRefined&&f.cy>0?'courtBlue':'courtKey');
    } else if(sport==='soccer') {
      if(siqunPreview && a.id===412480742) {
        track(b,98,195,f.width-2,f.length-3,true,siqunRefined);counts.track=(counts.track??0)+1;
      } else if(a.id===VERIFIED_TRACK.pitchId) {
        track(b,VERIFIED_TRACK.width,VERIFIED_TRACK.length,f.width-2,f.length-3,false,false,huxiRefined);counts.track=(counts.track??0)+1;
      } else football(b,Math.max(10,f.width-2),Math.max(16,f.length-3));
    }
    else if(sport==='table_tennis' && huxiRefined) {
      if(a.id===1057528507) {
        for(let row=0;row<10;row++)for(let col=0;col<5;col++)tableTennis(b,(col-2)*4.3,(row-4.5)*5.2);
        counts['table-tables']=(counts['table-tables']??0)+50;
      } else { tableTennis(b);counts['table-tables']=(counts['table-tables']??0)+1; }
    }
    else if(['tennis','badminton','volleyball','beachvolleyball'].includes(sport)) {
      const w=sport==='tennis'?10.97:sport==='badminton'?6.1:9,l=sport==='tennis'?23.77:sport==='badminton'?13.4:18;
      scale=Math.min(1,(f.width-.2)/w,(f.length-.2)/l);racket(b,sport);
    } else if(sport==='pool') {
      const lanes=Math.max(2,Math.floor(f.width/2.5));
      for(let i=1;i<lanes;i++)line(b,[-f.width/2+i*f.width/lanes,-f.length/2+.5],[-f.width/2+i*f.width/lanes,f.length/2-.5],.12,FLOOR+.005,'lane');
      outline(b,-f.width/2,-f.length/2,f.width/2,f.length/2,.16);
    } else if(sport==='track')track(b,f.width,f.length);
    const countKey=sport==='basketball'&&(f.width>18||f.length>34)?'basketball-bank':sport;
    counts[countKey]=(counts[countKey]??0)+1;
    const matrix=new THREE.Matrix4().makeRotationY(f.angle);matrix.setPosition(f.cx,0,-f.cy);
    for(const [key,geos] of Object.entries(b))for(const g of geos) {
      if(scale!==1&&!pads.has(g))g.scale(scale,1,scale);
      g.applyMatrix4(matrix);all[key].push(g);
    }
  }
  let triangles=0,calls=0;
  for(const [key,geos] of Object.entries(all)) {
    if(!geos.length)continue;
    const g=mergeGeometries(geos)!;for(const p of geos)p.dispose();
    const material=key==='mark'?new THREE.MeshBasicMaterial({color:COLORS[key],polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}):
      new THREE.MeshLambertMaterial({color:COLORS[key],side:key==='membrane'?THREE.DoubleSide:THREE.FrontSide,polygonOffset:key==='lane',polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    material.name=key;
    const mesh=new THREE.Mesh(g,material);mesh.name='sports-'+key;mesh.receiveShadow=key!=='mark';mesh.castShadow=false;
    parent.add(mesh);triangles+=(g.index?.count??g.attributes.position.count)/3;calls++;
  }
  parent.userData.sports={counts,triangles,drawCalls:calls};
}
