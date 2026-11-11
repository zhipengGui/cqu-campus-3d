import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {Building} from './types';
import {dormRoofParts} from './sceneBuilder';
import {dormRoofKindOf,dormRoofMaterial} from './facades';
import type {GroundHeight} from './terrain';

type Point=[number,number];
export interface LivingEntry {
  name:string;entry:Point;road:Point;normal:Point;width:number;base:number;roadHeight:number;length:number;threshold:number;estimated:boolean;
}
export interface LivingData {entries:Record<string,LivingEntry>}
/** Navigation-only coverage for existing displayed housing outside the older campus ring. */
export function livingWalkBounds(data:LivingData):Point[][] {
  return Object.values(data.entries).map(e=>{
    const w=e.width+2,x0=Math.min(e.entry[0],e.road[0])-w,x1=Math.max(e.entry[0],e.road[0])+w,
      y0=Math.min(e.entry[1],e.road[1])-w,y1=Math.max(e.entry[1],e.road[1])+w;
    return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  });
}
type Bucket=Record<string,THREE.BufferGeometry[]>;

function box(b:Bucket,key:string,x:number,y:number,z:number,w:number,d:number,h:number,angle=0):void {
  const g=new THREE.BoxGeometry(w,h,d);g.rotateY(angle);g.translate(x,z,-y);(b[key]??=[]).push(g);
}
function surface(b:Bucket,key:string,points:number[]):void {
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.computeVertexNormals();(b[key]??=[]).push(g);
}
function finish(parent:THREE.Group,b:Bucket,colors:Record<string,number>):void {
  for(const [key,parts]of Object.entries(b)) {
    if(!parts.length)continue;
    const g=mergeGeometries(parts);for(const p of parts)p.dispose();if(!g)continue;
    const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:colors[key]??0xb6b0a2}));
    m.name='housing-'+key;m.castShadow=true;m.receiveShadow=true;parent.add(m);
  }
}

/** Retain each mapped outline and existing roof direction; inferred facade dimensions are estimates. */
export function buildHuxiDorm(building:Building,entry:LivingEntry,base:number):THREE.Group {
  const root=new THREE.Group();root.position.y=base;root.name='m4-'+building.name;
  const structure:Bucket={},detail:Bucket={};
  let ring=building.polygon;
  const area=ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1]},0);
  if(area<0)ring=[...ring].reverse();
  const floors=Math.max(1,Math.round(building.height/3.3)),fh=building.height/floors;
  for(let edge=0;edge<ring.length;edge++) {
    const a=ring[edge],c=ring[(edge+1)%ring.length],dx=c[0]-a[0],dy=c[1]-a[1],length=Math.hypot(dx,dy);if(length<.2)continue;
    const ux=dx/length,uy=dy/length,nx=uy,ny=-ux,yaw=Math.atan2(dy,dx),n=Math.max(1,Math.round(length/3.6)),bay=length/n;
    const at=(parts:Bucket,key:string,t:number,out:number,z:number,w:number,d:number,h:number)=>box(parts,key,a[0]+ux*t+nx*out,a[1]+uy*t+ny*out,z,w,d,h,yaw);
    at(structure,'plinth',length/2,0,.20,length,.5,.4);
    for(let floor=0;floor<floors;floor++) {
      const z=floor*fh;
      at(structure,'wall',length/2,0,z+.67,length,.40,1.05);
      at(structure,'wall',length/2,0,z+fh-.35,length,.40,.7);
      for(let col=0;col<n;col++) {
        const t=(col+.5)*bay,ww=Math.min(1.9,bay*.64);
        at(structure,'wall',col*bay,0,z+fh/2,bay-ww,.45,fh);
        at(structure,'glass',t,-.30,z+1.95,ww,.08,1.55);
        for(const side of [-1,1])at(detail,'frame',t+side*ww/2,-.04,z+1.95,.06,.34,1.66);
        at(detail,'frame',t,-.06,z+1.95,.055,.28,1.58);
        for(const h of [1.14,2.76])at(detail,'frame',t,0,z+h,ww+.14,.30,.07);
        if(floor>0 && col%2===1 && length>26) {
          at(detail,'slab',t,.55,z+.04,Math.min(2.65,bay-.1),1.15,.14);
          at(detail,'rail',t,1.1,z+.95,Math.min(2.6,bay-.2),.055,.07);
          for(let bar=-2;bar<=2;bar++)at(detail,'rail',t+bar*.48,1.1,z+.5,.035,.045,.92);
          for(const side of [-1,1])at(detail,'rail',t+side*Math.min(1.3,(bay-.2)/2),.55,z+.95,.045,1.15,.06);
        }
        if(floor>0 && col%3===0) {
          at(detail,'ac',t+ww*.45,.27,z+1.0,.65,.45,.43);
          at(detail,'rail',t+ww*.45,.51,z+1.0,.59,.03,.025);
        }
      }
    }
    at(structure,'wall',length,0,building.height/2,Math.min(.6,bay*.3),.45,building.height);
    if(length>16)for(const t of [.7,length-.7])at(detail,'rail',t,.27,building.height/2,.065,.065,building.height);
  }
  const colors={wall:building.name.startsWith('荷园')?0xc4bda5:building.name.startsWith('菊园')?0xbfb09d:0xd9cdb8,
    plinth:0x9e9b90,glass:0x405d67,frame:0xe6e3d8,slab:0xcec7b7,rail:0x7e8b87,ac:0xb9bbb0,door:0x35545e};
  // One selected entrance per mapped building, instead of doors on every long wall.
  const [ex,ey]=entry.entry,[nx,ny]=entry.normal,yaw=Math.atan2(-nx,ny);
  box(structure,'door',ex+nx*.31,ey+ny*.31,1.42,2.2,.16,2.5,yaw);
  box(detail,'slab',ex+nx*.55,ey+ny*.55,3.05,3.8,2.0,.24,yaw);
  for(const side of [-1,1])box(detail,'frame',ex+ny*side*1.55+nx*.5,ey-nx*side*1.55+ny*.5,1.45,.14,.14,2.9);
  finish(root,structure,colors);
  const fine=new THREE.Group();fine.name='housing-detail';finish(fine,detail,colors);root.add(fine);
  const roof=dormRoofParts(building.polygon,building.height);
  if(roof) {
    for(const geometry of roof.roofs){const mesh=new THREE.Mesh(geometry,dormRoofMaterial(dormRoofKindOf(building.name)));mesh.name='housing-roof';mesh.castShadow=true;root.add(mesh);}
    for(const geometry of roof.gables){const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:colors.wall,side:THREE.DoubleSide}));root.add(mesh);}
  }
  root.userData.housingDetail=fine;
  root.userData.housingCenter=new THREE.Vector3((Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2,base,-(Math.min(...ring.map(p=>p[1]))+Math.max(...ring.map(p=>p[1])))/2);
  root.userData.batch4Entry=new THREE.Vector3(ex,3.0,-ey);
  root.userData.batch4Front=[nx,-ny];
  root.userData.m4ApproachDistance=entry.length;
  return root;
}

/** Small approach slabs follow the sampled terrain; no rigid wedge floats over the DEM. */
export function buildLivingApproaches(parent:THREE.Group,data:LivingData,ground:GroundHeight):void {
  const parts:Bucket={};
  for(const e of Object.values(data.entries)) {
    const [ex,ey]=e.entry,[qx,qy]=e.road,dx=qx-ex,dy=qy-ey,l=e.length,nx=dy/l,ny=-dx/l;
    const n=Math.ceil(l/1.5),w=e.width/2;
    const p=(t:number,s:number):number[]=>{
      const x=ex+dx*t+nx*w*s,y=ey+dy*t+ny*w*s;
      return [x,ground(x,y)+.15,-y];
    };
    for(let i=0;i<n;i++) {
      const a=p(i/n,-1),b=p(i/n,1),c=p((i+1)/n,1),d=p((i+1)/n,-1);
      surface(parts,'approach',[...a,...b,...c,...a,...c,...d]);
    }
    // Short rails at the threshold keep distant connections visually quiet.
    if(Math.abs(e.base-e.roadHeight)>.15)for(const side of [-1,1]) {
      const railLength=Math.min(7,l);
      for(let i=0;i<=railLength;i+=1.4) {
        const x=ex+dx*i/l+nx*w*side,y=ey+dy*i/l+ny*w*side;
        box(parts,'approachRail',x,y,ground(x,y)+.63,.045,.045,1.0);
      }
      for(let i=0;i<railLength;i+=1.4) {
        const j=Math.min(railLength,i+1.4),ax=ex+dx*i/l+nx*w*side,ay=ey+dy*i/l+ny*w*side,
          bx=ex+dx*j/l+nx*w*side,by=ey+dy*j/l+ny*w*side;
        const a=new THREE.Vector3(ax,ground(ax,ay)+1.13,-ay),b=new THREE.Vector3(bx,ground(bx,by)+1.13,-by),v=b.clone().sub(a);
        const g=new THREE.BoxGeometry(.045,v.length(),.045);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));
        g.translate(...a.add(b).multiplyScalar(.5).toArray());(parts.approachRail??=[]).push(g);
      }
    }
  }
  const group=new THREE.Group();group.name='m4-living-approaches';finish(group,parts,{approach:0xb9b6a5,approachRail:0x7d8985});
  // Existing footways supply the physical path. Offset only the visual paving to avoid coplanarity.
  group.traverse(o=>{if((o as THREE.Mesh).isMesh){const m=(o as THREE.Mesh).material as THREE.Material;m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;}});
  parent.add(group);
}
