import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Position } from '../core/models/Position.js';
import { createPlaza } from './PlazaEnvironment.js';

const surface = 0.29;
// Cada tipo de jugada tiene su color y su forma, para que no dependa solo del color.
export const markerColors = { move: 0x8d9a58, capture: 0xc89c65, castling: 0x6fb7e0, promotion: 0xe8c547, enPassant: 0xe0604a, cursor: 0xe1b968 };
const markerShapes = {
  dot: () => new THREE.CircleGeometry(.12, 32),
  ring: () => new THREE.RingGeometry(.37, .43, 48),
  square: () => new THREE.RingGeometry(.4, .5, 4).rotateZ(Math.PI / 4),
  smallSquare: () => new THREE.RingGeometry(.15, .21, 4).rotateZ(Math.PI / 4),
  diamond: () => new THREE.RingGeometry(.24, .33, 4)
};

// Turned profiles give each piece a continuous, rounded silhouette.
const profiles = {
  PAWN: [[0,0],[.24,0],[.27,.05],[.27,.10],[.22,.15],[.19,.18],[.16,.22],[.12,.35],[.11,.46],[.16,.48],[.17,.53],[.12,.57]],
  ROOK: [[0,0],[.29,0],[.31,.06],[.30,.12],[.25,.18],[.23,.22],[.19,.31],[.18,.67],[.23,.72],[.25,.77],[.25,.85],[0,.85]],
  KNIGHT: [[0,0],[.28,0],[.30,.06],[.28,.13],[.22,.19],[.20,.24],[.22,.29],[0,.29]],
  BISHOP: [[0,0],[.28,0],[.30,.06],[.28,.13],[.23,.18],[.21,.23],[.16,.30],[.12,.62],[.18,.66],[.20,.70],[.18,.75],[.11,.78],[0,.78]],
  QUEEN: [[0,0],[.31,0],[.32,.07],[.30,.14],[.25,.19],[.23,.24],[.17,.33],[.12,.71],[.19,.76],[.22,.81],[.20,.86],[.14,.90],[.22,1.05],[0,1.05]],
  KING: [[0,0],[.32,0],[.33,.07],[.30,.14],[.25,.19],[.23,.24],[.17,.34],[.13,.78],[.20,.82],[.23,.87],[.20,.92],[.14,.96],[.16,1.05],[0,1.05]],
};

function mesh(geometry, material, x=0, y=0, z=0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x,y,z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function makePiece(type, material, dark) {
  const group = new THREE.Group();
  const gold=new THREE.MeshStandardMaterial({color:0xd7a647,metalness:.68,roughness:.28});
  const antiqueGold=new THREE.MeshStandardMaterial({color:0x92652d,metalness:.5,roughness:.4});
  const enamel=new THREE.MeshStandardMaterial({color:dark?0x7e302e:0x276456,metalness:.22,roughness:.2});
  const carving=new THREE.MeshStandardMaterial({color:dark?0x484539:0xb4a187,roughness:.48});
  const darkDetail=new THREE.MeshStandardMaterial({color:0x171912,roughness:.34});
  const ring=(radius,y,thickness=.014,finish=gold)=>{
    const band=mesh(new THREE.TorusGeometry(radius,thickness,8,40),finish,0,y);
    band.rotation.x=Math.PI/2;group.add(band);return band;
  };
  const relief=(points,radius,finish)=>{
    const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
    const line=mesh(new THREE.TubeGeometry(curve,16,radius,6,false),finish);
    group.add(line);return line;
  };
  const oval=(x,y,z,sx,sy,sz,finish=material)=>{
    const detail=mesh(new THREE.SphereGeometry(1,20,14),finish,x,y,z);
    detail.scale.set(sx,sy,sz);group.add(detail);return detail;
  };
  group.add(mesh(new THREE.LatheGeometry(profiles[type].map(([r,y])=>new THREE.Vector2(r,y)),40), material));
  // Raised metal inlays follow the turned base, so they remain visible from every side.
  ring(profiles[type][3][0],.105,.012);
  ring(profiles[type][1][0]+.005,.025,.009,antiqueGold);
  const ball = (r,x,y,z=0)=>mesh(new THREE.SphereGeometry(r,24,16),material,x,y,z);
  if (type === 'PAWN') {group.add(ball(.18,0,.69));ring(.155,.515,.013);}
  if (type === 'ROOK') {
    ring(.247,.765,.018);ring(.19,.36,.01,antiqueGold);
    for(let i=0;i<6;i++) {
      const angle=i*Math.PI/3;
      const tooth=mesh(new THREE.BoxGeometry(.14,.17,.15),material,Math.sin(angle)*.19,.90,Math.cos(angle)*.19);
      tooth.rotation.y=angle;group.add(tooth);
      const cap=mesh(new THREE.BoxGeometry(.145,.025,.155),gold,Math.sin(angle)*.19,.99,Math.cos(angle)*.19);
      cap.rotation.y=angle;group.add(cap);
    }
  }
  if (type === 'BISHOP') {
    // Two separated lobes form a real diagonal opening in the bishop's mitre.
    const outline=new THREE.Shape();
    outline.moveTo(-.14,0);outline.quadraticCurveTo(-.27,.19,-.04,.42);
    outline.quadraticCurveTo(.06,.33,.10,.25);outline.lineTo(-.07,.10);
    outline.lineTo(-.02,.05);outline.lineTo(.15,.20);
    outline.quadraticCurveTo(.25,.06,.13,0);outline.closePath();
    const head=mesh(new THREE.ExtrudeGeometry(outline,{depth:.15,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035}),material,0,.77,-.075);
    group.add(head,ball(.055,-.04,1.22));
    ring(.19,.70,.018);
    relief([[-.13,.80,.12],[-.17,.93,.12],[-.12,1.06,.12],[-.04,1.18,.10]],.012,gold);
    relief([[-.13,.80,-.12],[-.17,.93,-.12],[-.12,1.06,-.12],[-.04,1.18,-.10]],.012,gold);
    oval(-.04,1.22,0,.057,.057,.057,gold);
  }
  if (type === 'QUEEN') {
    // An open crown with alternating high and low points and inset colored stones.
    group.add(mesh(new THREE.CylinderGeometry(.23,.16,.14,40,1,true),gold,0,.98));
    ring(.226,1.05,.023);ring(.18,.92,.015);
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      const height=i%2?.12:.20;
      const point=mesh(new THREE.ConeGeometry(.055,height,8),gold,Math.sin(a)*.215,1.06+height/2,Math.cos(a)*.215);
      group.add(point);
      oval(Math.sin(a)*.215,1.06+height,Math.cos(a)*.215,.035,.035,.035,gold);
      oval(Math.sin(a)*.215,.995,Math.cos(a)*.215,.033,.045,.033,enamel);
    }
    oval(0,1.12,0,.11,.10,.11,enamel);
    ring(.208,.80,.014);
  }
  if (type === 'KING') {
    group.add(mesh(new THREE.CylinderGeometry(.185,.17,.10,40),gold,0,1.025));
    ring(.186,1.075,.02);ring(.174,.978,.015);ring(.221,.87,.014);
    oval(0,1.12,0,.12,.13,.12,enamel);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      oval(Math.sin(a)*.184,1.027,Math.cos(a)*.184,.035,.035,.035,enamel);
      relief([[Math.sin(a)*.17,1.08,Math.cos(a)*.17],[Math.sin(a)*.12,1.20,Math.cos(a)*.12],[0,1.25,0]],.016,gold);
    }
    group.add(mesh(new THREE.BoxGeometry(.075,.29,.075),gold,0,1.35));
    group.add(mesh(new THREE.BoxGeometry(.26,.075,.075),gold,0,1.38));
    oval(0,1.38,.045,.031,.031,.015,enamel);
    oval(0,1.38,-.045,.031,.031,.015,enamel);
  }
  if (type === 'KNIGHT') {
    const shape=new THREE.Shape();
    shape.moveTo(-.23,0);shape.bezierCurveTo(-.29,.28,-.21,.61,-.09,.79);
    shape.lineTo(-.08,.95);shape.lineTo(.02,.88);shape.lineTo(.09,.93);
    shape.lineTo(.14,.78);shape.lineTo(.32,.61);shape.lineTo(.35,.48);
    shape.lineTo(.22,.43);shape.lineTo(.09,.49);shape.lineTo(.02,.37);
    shape.quadraticCurveTo(.25,.19,.23,0);shape.closePath();
    const head=mesh(new THREE.ExtrudeGeometry(shape,{depth:.26,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.055,bevelThickness:.055}),material,0,.29,-.13);
    group.add(head);
    ring(.213,.255,.017);
    // Rounded cheeks and muzzle break up the flat sides of the carved silhouette.
    oval(.225,.84,0,.16,.105,.19);
    for(const side of [-1,1]){
      oval(-.015,.84,side*.145,.13,.19,.09);
      oval(.08,1.005,side*.185,.068,.056,.035,carving);
      oval(.093,1.009,side*.213,.037,.034,.022,gold);
      oval(.10,1.009,side*.231,.019,.024,.012,darkDetail);
      oval(.107,1.021,side*.239,.008,.008,.006,material);
      oval(.295,.867,side*.155,.028,.019,.016,darkDetail);
      const ear=mesh(new THREE.ConeGeometry(.06,.20,12),material,-.045,1.20,side*.095);
      ear.rotation.z=-.18;group.add(ear);
      oval(-.025,1.21,side*.126,.022,.06,.012,carving);
      // A sculpted bridle with a brass cheek ring, noseband and reins on both sides.
      relief([[-.065,1.13,side*.17],[.015,1.01,side*.21],[.055,.89,side*.237],[.09,.79,side*.215]],.018,antiqueGold);
      relief([[.26,.91,side*.13],[.24,.86,side*.19],[.22,.77,side*.17]],.018,gold);
      relief([[.22,.81,side*.20],[.10,.79,side*.225],[-.04,.64,side*.18],[-.09,.43,side*.15]],.012,gold);
      const buckle=mesh(new THREE.TorusGeometry(.045,.012,8,20),gold,.075,.815,side*.236);
      group.add(buckle);
      relief([[.25,.782,side*.17],[.30,.786,side*.145],[.34,.80,side*.10]],.008,darkDetail);
      // Individual curved locks give the mane visible ridges rather than a painted stripe.
      for(let i=0;i<7;i++){
        const y=.49+i*.085;
        const x=-.24+Math.max(0,i-2)*.025;
        relief([[x+.035,y+.08,side*.11],[x-.045,y+.025,side*.16],[x-.055,y-.045,side*.10]],.026,carving);
      }
    }
    relief([[-.25,.46,0],[-.30,.69,0],[-.23,.93,0],[-.11,1.13,0]],.04,carving);
    group.rotation.y=dark?-Math.PI/4:Math.PI/4;
  }
  return group;
}

export class ChessScene {
  constructor(container,onSelect) {
    this.container=container;this.onSelect=onSelect;this.flipped=false;this.topView=false;
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
    this.renderer.domElement.setAttribute('aria-label','Tablero 3D. Seleccioná una pieza y una casilla de destino. Usá las flechas y Enter para jugar con teclado.');
    this.renderer.domElement.tabIndex=0;container.prepend(this.renderer.domElement);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#9cc9e3');
    this.scene.fog=new THREE.Fog('#b4ced7',65,180);
    this.camera=new THREE.PerspectiveCamera(43,1,.1,260);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enablePan=false;this.controls.minDistance=10;this.controls.maxDistance=24;
    this.controls.minPolarAngle=.04;this.controls.maxPolarAngle=Math.PI*.37;
    this.controls.target.set(0,0,0);this.controls.addEventListener('change',()=>this.draw());
    this.scene.add(new THREE.HemisphereLight(0xd7edff,0x7d8054,2.1));
    const sun=new THREE.DirectionalLight(0xfff0d4,2.6);sun.position.set(-22,38,-15);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:.1,far:100});
    sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0xd9e5f1,1.2);fill.position.set(5,6,-4);this.scene.add(fill);
    this.plaza=createPlaza(this.scene,this.renderer);
    this.squares=[];
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
      const tile=mesh(new THREE.BoxGeometry(1,.04,1),new THREE.MeshStandardMaterial({color:(r+c)%2?0x253947:0xeff1e9,roughness:.7}),c-3.5,.27,r-3.5);
      tile.userData={row:r,col:c};tile.castShadow=false;this.squares.push(tile);this.scene.add(tile);
    }
    this.addCoordinates();
    this.pieces=new THREE.Group();this.markers=new THREE.Group();this.effects=new THREE.Group();
    this.scene.add(this.pieces,this.markers,this.effects);
    this.pieceModels=new Map();
    this.motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
    this.animation=null;
    this.animationFrame=null;
    this.cameraAnimation=null;
    this.cameraFrame=null;
    const ivory=new THREE.MeshStandardMaterial({color:0xf3ead4,roughness:.26,metalness:.08});
    const ebony=new THREE.MeshStandardMaterial({color:0x262923,roughness:.23,metalness:.14});
    this.templates={};
    for(const type of Object.keys(profiles)) {
      this.templates[`${type}-WHITE`]=makePiece(type,ivory,false);
      this.templates[`${type}-BLACK`]=makePiece(type,ebony,true);
    }
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    let press=null;
    this.renderer.domElement.addEventListener('pointerdown',e=>{press={x:e.clientX,y:e.clientY,id:e.pointerId};});
    this.renderer.domElement.addEventListener('pointercancel',()=>{press=null;});
    this.renderer.domElement.addEventListener('pointerup',e=>{
      if(!press || press.id!==e.pointerId || Math.hypot(e.clientX-press.x,e.clientY-press.y)>6){press=null;return;}
      press=null;
      const rect=this.renderer.domElement.getBoundingClientRect();
      this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      this.raycaster.setFromCamera(this.pointer,this.camera);
      const hit=this.raycaster.intersectObjects([...this.pieces.children,...this.squares],true)[0];
      if(hit){let target=hit.object;while(target && target.userData.row===undefined)target=target.parent;if(target)this.onSelect(target.userData.row,target.userData.col);}
    });
    this.keyboardPosition={row:6,col:4};
    this.renderer.domElement.addEventListener('keydown',event=>this.onKey(event));
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
    this.resize();
  }

  addCoordinates() {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
    const ctx=canvas.getContext('2d');ctx.font='500 18px sans-serif';ctx.fillStyle='#55645f';ctx.textAlign='center';ctx.textBaseline='middle';
    const margin=1024*.45/8.9,cell=1024/8.9;
    for(let i=0;i<8;i++){
      const p=margin+cell*(i+.5);
      ctx.fillText('abcdefgh'[i],p,1002);ctx.fillText('abcdefgh'[i],p,22);
      ctx.fillText(String(8-i),21,p);ctx.fillText(String(8-i),1003,p);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const labels=new THREE.Mesh(new THREE.PlaneGeometry(8.9,8.9),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    labels.rotation.x=-Math.PI/2;labels.position.y=.251;this.scene.add(labels);
  }

  resize() {
    const {width,height}=this.container.getBoundingClientRect();
    if(!width || !height)return;
    this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false);this.resetCamera();
  }

  resetCamera({animate=false}={}) {
    const aspect=this.camera.aspect;
    const distance=this.topView?Math.max(15,12/aspect):Math.max(18.5,14/aspect);
    const direction=this.flipped?-1:1;
    this.controls.maxDistance=Math.max(24,distance*1.3);
    this.controls.target.set(0,0,0);
    const position=new THREE.Vector3(0,this.topView?distance:distance*.78,this.topView?.01*direction:distance*.90*direction);
    this.moveCamera(position,animate);
  }
  setOrientation(flipped) {
    if(this.flipped===flipped)return;
    this.flipped=flipped;
    // Keep the player's zoom and elevation while orbiting to the other side.
    const orbit=new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    orbit.theta=flipped?Math.PI:0;
    this.moveCamera(new THREE.Vector3().setFromSpherical(orbit).add(this.controls.target),true);
  }
  flip(){this.setOrientation(!this.flipped);}
  toggleView(){this.topView=!this.topView;this.resetCamera({animate:true});return this.topView;}

  moveCamera(position,animate) {
    if(this.cameraFrame!==null)cancelAnimationFrame(this.cameraFrame);
    this.cameraFrame=null;this.cameraAnimation=null;
    this.controls.enableRotate=!this.topView;
    if(!animate||this.motionPreference.matches){
      this.camera.position.copy(position);this.controls.enabled=true;this.controls.update();this.draw();return;
    }
    const from=new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const to=new THREE.Spherical().setFromVector3(position.clone().sub(this.controls.target));
    // Follow an arc around the board, including in the overhead view.
    to.theta=from.theta+Math.atan2(Math.sin(to.theta-from.theta),Math.cos(to.theta-from.theta));
    this.cameraAnimation={from,to,position:position.clone(),start:null};
    this.controls.enabled=false;
    this.cameraFrame=requestAnimationFrame(time=>this.animateCamera(time));
  }

  animateCamera(time) {
    const animation=this.cameraAnimation;
    if(!animation)return;
    // Finish the move and its effects before handing the board to the next player.
    if(this.animation){this.cameraFrame=requestAnimationFrame(next=>this.animateCamera(next));return;}
    animation.start??=time;
    const progress=this.motionPreference.matches?1:Math.min(1,(time-animation.start)/850);
    const eased=progress*progress*(3-2*progress);
    const {from,to}=animation;
    const orbit=new THREE.Spherical(
      THREE.MathUtils.lerp(from.radius,to.radius,eased),
      THREE.MathUtils.lerp(from.phi,to.phi,eased),
      THREE.MathUtils.lerp(from.theta,to.theta,eased)
    );
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(orbit));
    if(progress===1){
      this.camera.position.copy(animation.position);
      this.cameraAnimation=null;this.cameraFrame=null;this.controls.enabled=true;
    }else this.cameraFrame=requestAnimationFrame(next=>this.animateCamera(next));
    this.controls.update();this.draw();
  }
  draw(){this.renderer.render(this.scene,this.camera);}

  get isAnimating(){return this.animation!==null||this.cameraAnimation!==null;}

  finishAnimation() {
    if(this.animationFrame!==null)cancelAnimationFrame(this.animationFrame);
    this.animationFrame=null;
    if(!this.animation)return;
    const {moving,capture,landings}=this.animation;
    for(const {model,to,promotion} of moving){
      model.position.copy(to);model.scale.setScalar(1);
      if(promotion){promotion.visible=true;promotion.scale.setScalar(1);}
    }
    if(capture){
      // Piece geometries belong to the templates. Only effect resources are disposable.
      for(const material of capture.materials)material.dispose();
      capture.particleGeometry.dispose();capture.particleMaterial.dispose();
      capture.ring.geometry.dispose();capture.ring.material.dispose();
    }
    for(const ring of landings){ring.geometry.dispose();ring.material.dispose();}
    this.effects.clear();
    this.animation=null;
    this.renderer.shadowMap.needsUpdate=true;
  }

  createCaptureEffect(model,position) {
    const materials=[];
    model.traverse(child=>{
      if(!child.isMesh)return;
      child.material=child.material.clone();
      child.material.transparent=true;
      child.material.depthWrite=false;
      materials.push(child.material);
    });
    this.effects.add(model);
    const ring=new THREE.Mesh(
      new THREE.RingGeometry(.35,.41,64),
      new THREE.MeshBasicMaterial({color:0xf4d69a,transparent:true,opacity:0,depthWrite:false})
    );
    ring.rotation.x=-Math.PI/2;ring.position.copy(position);ring.position.y=surface+.035;
    this.effects.add(ring);
    const particleGeometry=new THREE.IcosahedronGeometry(.045,0);
    const particleMaterial=new THREE.MeshBasicMaterial({color:0xe6c787,transparent:true,opacity:0,depthWrite:false});
    const particles=[];
    for(let i=0;i<20;i++){
      const particle=new THREE.Mesh(particleGeometry,particleMaterial);
      const angle=i*Math.PI*2/20;
      const speed=.65+(i%4)*.17;
      const velocity=new THREE.Vector3(Math.cos(angle)*speed,1.1+(i%3)*.35,Math.sin(angle)*speed);
      particle.position.copy(position);particle.position.y+=.35;
      this.effects.add(particle);particles.push({particle,velocity});
    }
    return {model,materials,ring,particles,particleGeometry,particleMaterial,position:position.clone(),rotation:model.rotation.clone()};
  }

  syncPieces(game) {
    const last=game.history.at(-1);
    // Selecting squares and changing the keyboard cursor must not restart an animation.
    if(this.renderedBoard===game.board && this.renderedLast===last)return;
    this.finishAnimation();
    const forwardMove=this.renderedBoard===game.board && game.history.length===this.renderedHistoryLength+1;
    const animate=!this.motionPreference.matches;
    const capturedModel=forwardMove && last?.capturedPiece && this.pieceModels.get(last.capturedPiece);
    const currentPieces=new Set(),moving=[];
    for(let row=0;row<8;row++)for(let col=0;col<8;col++){
      const piece=game.board.getPieceAt(new Position(row,col));
      if(!piece)continue;
      currentPieces.add(piece);
      const to=new THREE.Vector3(col-3.5,surface+.005,row-3.5);
      let model=this.pieceModels.get(piece);
      if(!model){
        model=this.templates[`${piece.type}-${piece.color}`].clone();
        model.position.copy(to);this.pieceModels.set(piece,model);this.pieces.add(model);
        if(animate&&forwardMove&&piece===last?.promotedPiece){
          const pawn=this.pieceModels.get(last.movedPiece);
          if(pawn){
            model.visible=false;
            moving.push({model:pawn,from:pawn.position.clone(),to,promotion:model});
          }
        }
      }else if(!model.position.equals(to)){
        if(animate)moving.push({model,from:model.position.clone(),to,knight:piece.type==='KNIGHT'});
        else model.position.copy(to);
      }
      model.userData={row,col};
    }
    for(const [piece,model] of this.pieceModels){
      if(!currentPieces.has(piece)){this.pieces.remove(model);this.pieceModels.delete(piece);}
    }
    this.renderedBoard=game.board;this.renderedLast=last;this.renderedHistoryLength=game.history.length;
    if(!moving.length)return;
    for(const move of moving)if(move.promotion)this.effects.add(move.model);
    const capture=capturedModel?this.createCaptureEffect(capturedModel,capturedModel.position):null;
    const landings=moving.map(({to,promotion})=>{
      const ring=new THREE.Mesh(new THREE.RingGeometry(.29,.34,48),new THREE.MeshBasicMaterial({color:promotion?0xe8c547:0xc6cf9e,transparent:true,opacity:0,depthWrite:false}));
      ring.rotation.x=-Math.PI/2;ring.position.copy(to);ring.position.y=surface+.045;
      this.effects.add(ring);return ring;
    });
    const duration=moving.some(move=>move.promotion)?660:moving.some(move=>move.knight)?580:440;
    this.animation={moving,capture,landings,duration,start:performance.now()};
    this.animationFrame=requestAnimationFrame(time=>this.animateMove(time));
  }

  animateMove(time) {
    const animation=this.animation;
    if(!animation)return;
    if(this.motionPreference.matches){this.finishAnimation();this.draw();return;}
    const {moving,capture,landings,duration,start}=animation;
    const elapsed=time-start;
    const progress=Math.min(1,elapsed/duration);
    const eased=progress*progress*(3-2*progress);
    for(const {model,from,to,knight,promotion} of moving){
      model.position.lerpVectors(from,to,eased);
      // Knights leap over pieces; the others lift just above the board.
      model.position.y+=Math.sin(Math.PI*progress)*(knight?1.05:.16);
      if(promotion){
        const reveal=Math.min(1,Math.max(0,(elapsed-duration*.75)/300));
        model.scale.setScalar(Math.max(.001,1-reveal));
        promotion.visible=reveal>0;
        promotion.scale.setScalar(Math.max(.001,reveal+Math.sin(Math.PI*reveal)*.16));
      }
    }
    const landing=Math.min(1,Math.max(0,(elapsed-duration*.75)/360));
    for(const ring of landings){
      ring.scale.setScalar(1+landing*1.8);
      ring.material.opacity=Math.sin(Math.PI*landing)*.65;
    }
    const impact=duration*.76;
    if(capture && elapsed>=impact){
      const t=Math.min(1,(elapsed-impact)/480);
      const fade=1-t;
      capture.model.scale.setScalar(Math.max(.001,1-t*t));
      capture.model.position.y=capture.position.y+t*.3;
      capture.model.rotation.z=capture.rotation.z+t*.35;
      for(const material of capture.materials)material.opacity=fade;
      capture.model.visible=t<1;
      capture.ring.scale.setScalar(1+t*2.7);
      capture.ring.material.opacity=Math.sin(Math.PI*t)*.7;
      capture.particleMaterial.opacity=fade*.9;
      for(const {particle,velocity} of capture.particles){
        particle.position.copy(capture.position).addScaledVector(velocity,t);
        particle.position.y+=.35-.9*t*t;
        particle.rotation.set(t*5,t*3,t*2);
        particle.scale.setScalar(1-t*.7);
      }
    }
    this.renderer.shadowMap.needsUpdate=true;
    if(elapsed>=Math.max(duration*.75+360,capture?impact+480:0))this.finishAnimation();
    else this.animationFrame=requestAnimationFrame(next=>this.animateMove(next));
    this.draw();
  }

  marker(row,col,color,shape) {
    const marker=new THREE.Mesh(markerShapes[shape](),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false}));
    // Un poco más alta cada marca, para que dos en la misma casilla no parpadeen.
    marker.rotation.x=-Math.PI/2;marker.position.set(col-3.5,surface+.025+this.markers.children.length*.001,row-3.5);this.markers.add(marker);
  }

  update(game,selected,moves) {
    this.syncPieces(game);
    for(const marker of [...this.markers.children]){marker.geometry.dispose();marker.material.dispose();this.markers.remove(marker);}
    const last=game.history.at(-1);
    // La última jugada incluye la torre del enroque y el peón comido al paso.
    const lastSquares=last?[last.from,last.to,last.rookFrom,last.rookTo,last.capturePosition].filter(Boolean):[];
    const turn=game.getCurrentTurn();
    const checkedKing=game.board.isKingInCheck(turn)&&game.board.findKingPosition(turn);
    for(const tile of this.squares) {
      const {row,col}=tile.userData,dark=(row+col)%2;
      let color=dark?0x253947:0xeff1e9;
      if(lastSquares.some(pos=>pos.row===row&&pos.col===col)) color=dark?0x717859:0xc2c49b;
      if(checkedKing&&checkedKing.row===row&&checkedKing.col===col)color=dark?0x8a3b2c:0xe29a86;
      if(selected?.row===row&&selected?.col===col)color=0xa3b275;
      tile.material.color.setHex(color);
    }
    for(const move of moves){
      const {row,col}=move.to;
      if(move.castling){
        this.marker(row,col,markerColors.castling,'square');
        this.marker(move.rookFrom.row,move.rookFrom.col,markerColors.castling,'ring');
        this.marker(move.rookTo.row,move.rookTo.col,markerColors.castling,'smallSquare');
        continue;
      }
      if(move.promotion)this.marker(row,col,markerColors.promotion,'diamond');
      if(move.capture)this.marker(row,col,markerColors.capture,'ring');
      else if(!move.promotion)this.marker(row,col,markerColors.move,'dot');
      if(move.enPassant)this.marker(move.capturePosition.row,move.capturePosition.col,markerColors.enPassant,'ring');
    }
    if(this.keyboardActive)this.marker(this.keyboardPosition.row,this.keyboardPosition.col,markerColors.cursor,'ring');
    this.renderer.shadowMap.needsUpdate=true;this.draw();
  }

  onKey(event) {
    if(this.isAnimating){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' '].includes(event.key))event.preventDefault();return;}
    const steps={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
    if(steps[event.key]){
      event.preventDefault();this.keyboardActive=true;
      const [r,c]=steps[event.key],sign=this.flipped?-1:1;
      this.keyboardPosition.row=Math.max(0,Math.min(7,this.keyboardPosition.row+r*sign));
      this.keyboardPosition.col=Math.max(0,Math.min(7,this.keyboardPosition.col+c*sign));
      this.container.dispatchEvent(new CustomEvent('keyboard-position',{detail:this.keyboardPosition}));
    }else if(event.key==='Enter'||event.key===' '){event.preventDefault();this.onSelect(this.keyboardPosition.row,this.keyboardPosition.col);}
  }
}
