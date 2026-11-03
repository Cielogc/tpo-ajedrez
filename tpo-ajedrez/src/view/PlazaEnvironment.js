import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createMateSet } from './MateSet.js';

const groundY=-5.2;

// Texturas locales y repetibles: la plaza no depende de imágenes externas.
function surfaceTexture(kind) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');
  let seed=kind==='grass'?37:81;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  ctx.fillStyle=kind==='grass'?'#81905b':'#d9dbd5';ctx.fillRect(0,0,512,512);
  for(let i=0;i<26000;i++){
    const x=random()*512,y=random()*512;
    ctx.fillStyle=kind==='grass'
      ?['#b0ae75','#637b45','#8a9253','#c0b283','#526c3f'][i%5]
      :`rgba(${i%2?'65,72,68':'255,255,245'},${random()*.13})`;
    ctx.fillRect(x,y,kind==='grass'?1+random()*2:1,kind==='grass'?2+random()*6:1+random()*2);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  return texture;
}

function concreteTextures(anisotropy) {
  const size=1024;
  let seed=193;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const canvases=Array.from({length:3},()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;return canvas;
  });
  const [color,height,roughness]=canvases.map(canvas=>canvas.getContext('2d'));
  const grain=new Float32Array(size*size);
  // Several scales of mineral variation avoid the flat, painted-white appearance.
  for(const [cells,strength] of [[8,32],[32,16],[128,7],[512,5]]){
    const samples=Float32Array.from({length:cells*cells},()=>random()-.5);
    for(let y=0;y<size;y++){
      const gy=y*cells/size,iy=Math.floor(gy),fy=gy-iy,sy=fy*fy*(3-2*fy);
      for(let x=0;x<size;x++){
        const gx=x*cells/size,ix=Math.floor(gx),fx=gx-ix,sx=fx*fx*(3-2*fx);
        const a=samples[iy*cells+ix],b=samples[iy*cells+(ix+1)%cells];
        const c=samples[((iy+1)%cells)*cells+ix],d=samples[((iy+1)%cells)*cells+(ix+1)%cells];
        grain[y*size+x]+=((a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy)*strength;
      }
    }
  }
  const maps=[color,height,roughness].map(ctx=>ctx.createImageData(size,size));
  for(let i=0;i<grain.length;i++){
    const n=grain[i]+(random()-.5)*11;
    const offset=i*4;
    maps[0].data[offset]=184+n;maps[0].data[offset+1]=185+n;maps[0].data[offset+2]=176+n;
    for(let channel=0;channel<3;channel++){
      maps[1].data[offset+channel]=145+n*1.8;
      maps[2].data[offset+channel]=232+n*.5;
    }
    for(const map of maps)map.data[offset+3]=255;
  }
  [color,height,roughness].forEach((ctx,i)=>ctx.putImageData(maps[i],0,0));
  // Soft weather stains, fine aggregate and recessed pores share the same UVs.
  for(let i=0;i<70;i++){
    const x=random()*size,y=random()*size,radius=25+random()*100;
    const stain=color.createRadialGradient(x,y,0,x,y,radius);
    stain.addColorStop(0,i%3?'rgba(89,89,70,.12)':'rgba(235,231,210,.16)');
    stain.addColorStop(1,'rgba(150,148,128,0)');
    color.fillStyle=stain;color.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  for(let i=0;i<12500;i++){
    const x=random()*size,y=random()*size,pore=i%4===0;
    const radius=i%40===0?2.5+random()*2:pore?.45+random()*1.8:.35+random()*1.15;
    const stretch=.6+random()*.7,angle=random()*Math.PI;
    color.fillStyle=pore?'rgba(71,77,68,.36)':i%2?'rgba(237,234,215,.38)':'rgba(104,111,96,.25)';
    height.fillStyle=pore?'#444444':'#b0b0b0';roughness.fillStyle=pore?'#ffffff':'#dddddd';
    for(const ctx of [color,height,roughness]){
      ctx.beginPath();ctx.ellipse(x,y,radius,radius*stretch,angle,0,Math.PI*2);ctx.fill();
    }
    if(pore){
      color.fillStyle='rgba(246,242,223,.28)';
      color.beginPath();color.ellipse(x+.5,y+.8,radius,radius*.3,angle,0,Math.PI);color.fill();
    }
  }
  const [map,bumpMap,roughnessMap]=canvases.map(canvas=>{
    const texture=new THREE.CanvasTexture(canvas);
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;return texture;
  });
  // Relief and roughness are linear data, only the visible color uses sRGB.
  map.colorSpace=THREE.SRGBColorSpace;
  return {map,bumpMap,roughnessMap};
}

function checkerTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    ctx.fillStyle=(r+c)%2?'#273b48':'#edf0e9';ctx.fillRect(c*32,r*32,32,32);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function createPlaza(scene,renderer) {
  const plaza=new THREE.Group();plaza.name='Plaza de barrio';scene.add(plaza);
  const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const concreteMap=surfaceTexture('concrete');concreteMap.anisotropy=anisotropy;
  const concrete=new THREE.MeshStandardMaterial({...concreteTextures(anisotropy),bumpScale:.075,roughness:1,metalness:0});
  const pavement=new THREE.MeshStandardMaterial({map:concreteMap,color:0xa8aaa1,roughness:1});
  const grassMap=surfaceTexture('grass');grassMap.repeat.set(48,48);grassMap.anisotropy=concreteMap.anisotropy;
  const grass=new THREE.MeshStandardMaterial({map:grassMap,roughness:1});
  const metal=new THREE.MeshStandardMaterial({color:0x707d7b,metalness:.35,roughness:.65});
  const yellow=new THREE.MeshStandardMaterial({color:0xf2bb22,roughness:.48,metalness:.15});
  const red=new THREE.MeshStandardMaterial({color:0xc44b35,roughness:.6});
  const blue=new THREE.MeshStandardMaterial({color:0x377d9e,roughness:.55});
  const dark=new THREE.MeshStandardMaterial({color:0x3b4845,roughness:.9});
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const roundedGeometry=new RoundedBoxGeometry(1,1,1,2,.035);
  function concreteUVs(geometry,size) {
    const mapped=geometry.clone(),{position,normal,uv}=mapped.attributes;
    for(let i=0;i<position.count;i++){
      const x=position.getX(i)*size[0],y=position.getY(i)*size[1],z=position.getZ(i)*size[2];
      const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
      // Keep pores the same size on the broad top and the thin vertical edges.
      const [u,v]=ny>=nx&&ny>=nz?[x,z]:nx>=nz?[z,y]:[x,y];
      uv.setXY(i,u/11.8+.5,v/11.8+.5);
    }
    return mapped;
  }
  function block(parent,material,size,position,rounded=false) {
    const geometry=rounded?roundedGeometry:boxGeometry;
    const object=new THREE.Mesh(material===concrete?concreteUVs(geometry,size):geometry,material);
    object.scale.set(...size);object.position.set(...position);
    object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
  }
  function bar(parent,material,from,to,radius=.1) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),direction=b.clone().sub(a);
    const object=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,direction.length(),8),material);
    object.position.copy(a).add(b).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    object.castShadow=true;parent.add(object);return object;
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(260,260),grass);
  ground.rotation.x=-Math.PI/2;ground.position.y=groundY;ground.receiveShadow=true;plaza.add(ground);
  // A concrete apron and crossing footpaths, like the public tables in the reference.
  block(plaza,pavement,[18,.12,23],[0,groundY+.03,0]);
  for(const z of [-15,15])block(plaza,pavement,[140,.1,3.8],[0,groundY+.015,z]);
  block(plaza,pavement,[4,.1,140],[-14,groundY+.02,0]);
  const seamMaterial=new THREE.MeshStandardMaterial({color:0x848d82,roughness:1});
  for(const z of [-9,-3,3,9])block(plaza,seamMaterial,[18,.012,.025],[0,groundY+.098,z]);
  block(plaza,seamMaterial,[.025,.012,23],[0,groundY+.098,0]);

  const table=new THREE.Group();table.name='Mesa de hormigón';
  // The top stays at y=.245 so the playable squares are flush with the concrete.
  block(table,concrete,[11.8,.78,11.8],[0,-.145,0],true);
  block(table,concrete,[2.1,4.45,2.1],[0,-2.75,0],true);
  block(table,concrete,[3.8,.3,3.8],[0,groundY+.21,0],true);
  const benchProfile=new THREE.Shape();
  benchProfile.moveTo(-1.05,0);benchProfile.lineTo(1.05,0);
  benchProfile.lineTo(.65,.45);benchProfile.bezierCurveTo(.35,1.1,.4,1.8,.85,2.6);
  benchProfile.lineTo(-.85,2.6);benchProfile.bezierCurveTo(-.4,1.8,-.35,1.1,-.65,.45);benchProfile.closePath();
  const benchSupport=new THREE.ExtrudeGeometry(benchProfile,{depth:.7,bevelEnabled:true,bevelSize:.08,bevelThickness:.06,bevelSegments:2,steps:1});
  for(const z of [-7.4,7.4]){
    block(table,concrete,[10.6,.52,2.2],[0,-2.25,z],true);
    for(const x of [-3.6,3.6]){
      const support=new THREE.Mesh(benchSupport,concrete);support.rotation.y=Math.PI/2;
      support.position.set(x-.35,groundY+.15,z);support.castShadow=true;support.receiveShadow=true;table.add(support);
    }
  }
  plaza.add(table);
  const distantBoardMaterial=new THREE.MeshStandardMaterial({map:checkerTexture(),roughness:.68});
  for(const [x,z,angle] of [[-26,-21,0],[-26,-43,0],[25,26,Math.PI/2],[25,49,Math.PI/2]]){
    const other=table.clone();other.position.set(x,0,z);other.rotation.y=angle;plaza.add(other);
    const board=new THREE.Mesh(new THREE.PlaneGeometry(7.6,7.6),distantBoardMaterial);
    board.rotation.x=-Math.PI/2;board.position.y=.252;other.add(board);
    block(plaza,pavement,[16,.1,21],[x,groundY+.025,z]);
  }
  plaza.add(createMateSet());

  // Low-cost tree crowns share geometry; no continuous render loop is needed.
  const bark=new THREE.MeshStandardMaterial({color:0x706953,roughness:1});
  const foliage=[0x54744b,0x65804c,0x789157].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
  const crownGeometry=new THREE.IcosahedronGeometry(1,2);
  function tree(x,z,height,index) {
    const tree=new THREE.Group();tree.position.set(x,groundY,z);
    bar(tree,bark,[0,0,0],[.2,height*.68,0],.24+height*.012);
    for(let i=0;i<7;i++){
      const angle=i*2.4+index;
      const crown=new THREE.Mesh(crownGeometry,foliage[(i+index)%3]);
      const spread=height*.16;
      crown.position.set(Math.sin(angle)*spread,height*(.62+(i%3)*.09),Math.cos(angle)*spread);
      crown.scale.set(height*.22,height*(.19+(i%2)*.04),height*.21);
      crown.rotation.set(i*.5,index,i*.3);crown.castShadow=true;crown.receiveShadow=true;tree.add(crown);
    }
    plaza.add(tree);
  }
  [[-20,8,16],[18,-19,18],[-22,32,21],[36,-10,24],[-43,-8,25],[40,15,21],[-7,-42,20],[10,43,24]].forEach(([x,z,h],i)=>tree(x,z,h,i));
  for(let i=0;i<20;i++){
    const angle=i*Math.PI*2/20;
    tree(Math.sin(angle)*(65+i%3*7),Math.cos(angle)*(65+i%4*6),19+i%5*2,i);
  }

  function playground(x,z,rotation) {
    const group=new THREE.Group();group.position.set(x,groundY,z);group.rotation.y=rotation;plaza.add(group);
    // Yellow A-frame swings with chains and two rubber seats.
    for(const side of [-1,1]){
      bar(group,yellow,[side*4.5,0,-2.8],[side*4.5,9,0],.17);
      bar(group,yellow,[side*4.5,0,2.8],[side*4.5,9,0],.17);
      bar(group,red,[side*4.5,3,-1.85],[side*4.5,3,1.85],.10);
    }
    bar(group,yellow,[-4.8,9,0],[4.8,9,0],.19);
    for(const x of [-2.2,2.2]){
      for(const side of [-.8,.8])bar(group,metal,[x+side,8.9,0],[x+side,2.3,0],.035);
      block(group,dark,[2,.18,.9],[x,2.2,0],true);
    }
    // A red tower, blue ladder, and the broad yellow slide from the photo.
    for(const x of [8,11])for(const z of [-1.5,1.5])bar(group,red,[x,0,z],[x,8,z],.13);
    block(group,blue,[3.5,.22,3.5],[9.5,6,0]);
    for(const z of [-1.5,1.5]){
      bar(group,yellow,[8,8,z],[11,8,z],.1);
      bar(group,blue,[6,0,z],[8,6,z],.11);
    }
    for(let i=1;i<7;i++)bar(group,blue,[6+i/3,i,-1.5],[6+i/3,i,1.5],.095);
    const slide=block(group,yellow,[2.8,.15,9.3],[9.5,3.1,5.2]);slide.rotation.x=.66;
    for(const x of [8.05,10.95])bar(group,yellow,[x,6.3,1.5],[x,.5,9],.18);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(2.9,1.6,4),red);roof.position.set(9.5,9,0);roof.rotation.y=Math.PI/4;group.add(roof);
  }
  playground(19,-32,-.25);playground(-28,32,Math.PI+.3);

  for(const [x,z] of [[-12,-32],[13,31],[40,-42],[-39,45]]){
    bar(plaza,metal,[x,groundY,z],[x,18,z],.13);
    bar(plaza,metal,[x,18,z],[x+2,18,z],.10);
    block(plaza,metal,[2.2,.3,.8],[x+1.8,17.9,z],true);
  }
  // A quiet neighborhood beyond the trees, on both sides of the playing table.
  const facades=[0xd4c6ac,0xc4cec9,0xc79d85].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
  const roofMaterial=new THREE.MeshStandardMaterial({color:0x9b7662,roughness:1});
  for(const z of [-91,91])for(let i=0;i<9;i++){
    const x=(i-4)*18,height=4+i%3;
    block(plaza,facades[i%3],[14,height,9],[x,groundY+height/2,z]);
    block(plaza,roofMaterial,[14.5,.4,9.6],[x,groundY+height,z]);
    for(const offset of [-3,3])block(plaza,blue,[1.8,1.9,9.1],[x+offset,groundY+2.5,z]);
  }
  return plaza;
}
