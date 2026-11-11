import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {buildLivingApproaches,livingWalkBounds,type LivingData} from './huxiLiving';
import type {GroundHeight,MapPoint} from './terrain';

export interface NewAreaData extends LivingData {landscape:MapPoint[];landscapeConnector:MapPoint[];}
export function newAreaWalkBounds(data:NewAreaData):MapPoint[][] {
  const bounds=livingWalkBounds(data),points=[...data.landscape,...data.landscapeConnector];
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  bounds.push([[Math.min(...xs)-7,Math.min(...ys)-7],[Math.max(...xs)+7,Math.min(...ys)-7],
    [Math.max(...xs)+7,Math.max(...ys)+7],[Math.min(...xs)-7,Math.max(...ys)+7]]);
  return bounds;
}
/** Photo-inspired furniture and planting in an explicitly estimated southwestern layout. */
export function buildHuxiNewArea(parent:THREE.Group,data:NewAreaData,ground:GroundHeight):void {
  buildLivingApproaches(parent,data,ground);
  const parts:Record<string,THREE.BufferGeometry[]>={};
  const colors:Record<string,number>={stone:0xc5c8bd,timber:0x896e50,metal:0x566360,plant:0x647c42,paving:0xa5aaa0};
  const box=(part:string,x:number,y:number,z:number,w:number,d:number,h:number,angle=0)=>{
    const g=new THREE.BoxGeometry(w,h,d);g.rotateY(-angle);g.translate(x,z,-y);(parts[part]??=[]).push(g);
  };
  const [cx,cy]=[-518,-463];
  // Local paving sits above the retained grass overlay; canonical area stays in scene.paving for walking.
  const plaza=new THREE.CircleGeometry(15,48);plaza.rotateX(-Math.PI/2);plaza.translate(cx,ground(cx,cy)+.07,-cy);parts.paving=[plaza];
  for(let i=0;i<42;i++) {
    const a=-.2+i*Math.PI*1.2/42,x=cx+Math.cos(a)*12,y=cy+Math.sin(a)*12;
    box('stone',x,y,ground(x,y)+.36,.95,.48,.65,a+Math.PI/2);
  }
  for(const [x,y,angle] of [[-502,-449,.7],[-534,-480,-.7],[-527,-436,.3],[-500,-490,.5]]) {
    box('timber',x,y,ground(x,y)+.58,3.6,.65,.13,angle);
    for(const s of [-1,1])box('metal',x+s*1.3*Math.cos(angle),y+s*1.3*Math.sin(angle),ground(x,y)+.3,.15,.5,.58,angle);
  }
  for(let i=0;i<data.landscape.length-1;i+=8) {
    const [x,y]=data.landscape[i];
    box('metal',x-3,y,ground(x-3,y)+2.3,.09,.09,4.6);
    box('stone',x-3,y,ground(x-3,y)+4.6,.6,.3,.12);
    if(i%2===0) {
      const g=new THREE.SphereGeometry(3,7,5);g.scale(1,.45,1);g.translate(x-7,ground(x-7,y+3)+1,-y-3);(parts.plant??=[]).push(g);
    }
  }
  const group=new THREE.Group();group.name='m5-southwest-landscape';
  for(const [part,geometries] of Object.entries(parts)) {
    const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;
    const mesh=new THREE.Mesh(merged,new THREE.MeshLambertMaterial({color:colors[part]}));mesh.castShadow=part!=='paving';mesh.receiveShadow=true;group.add(mesh);
  }
  parent.add(group);
}
