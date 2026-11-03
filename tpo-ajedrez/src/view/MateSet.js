import * as THREE from 'three';

function metalTextures() {
  const brushed=document.createElement('canvas');brushed.width=brushed.height=512;
  const ctx=brushed.getContext('2d');
  ctx.fillStyle='#bec5c4';ctx.fillRect(0,0,512,512);
  let seed=29;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<1500;i++){
    ctx.fillStyle=i%2?`rgba(255,255,255,${random()*.16})`:`rgba(52,65,66,${random()*.14})`;
    ctx.fillRect(random()*512,0,.3+random(),512);
  }
  const map=new THREE.CanvasTexture(brushed);map.colorSpace=THREE.SRGBColorSpace;
  const sky=document.createElement('canvas');sky.width=512;sky.height=256;
  const reflection=sky.getContext('2d');
  const gradient=reflection.createLinearGradient(0,0,0,256);
  for(const [stop,color] of [[0,'#a1cce7'],[.4,'#eef5f6'],[.52,'#b1bca1'],[.64,'#485e46'],[1,'#c1bca4']])gradient.addColorStop(stop,color);
  reflection.fillStyle=gradient;reflection.fillRect(0,0,512,256);
  // Broad light and tree reflections make the steel readable from either player.
  for(let i=0;i<12;i++){
    reflection.fillStyle=i%3?'rgba(28,45,33,.28)':'rgba(255,255,255,.65)';
    reflection.fillRect(i*47,86,12+i%4*7,85);
  }
  const envMap=new THREE.CanvasTexture(sky);envMap.colorSpace=THREE.SRGBColorSpace;
  envMap.mapping=THREE.EquirectangularReflectionMapping;
  return {map,envMap};
}

// Decorative objects are outside the board and never enter its selection raycast.
export function createMateSet() {
  const set=new THREE.Group();set.name='Mate y termo';
  const {map,envMap}=metalTextures();
  const steel=new THREE.MeshStandardMaterial({map,envMap,envMapIntensity:.85,metalness:.85,roughness:.3});
  const silver=new THREE.MeshStandardMaterial({color:0xd1d5cf,envMap,envMapIntensity:.9,metalness:.88,roughness:.23});
  const engraving=new THREE.MeshStandardMaterial({color:0x788078,envMap,metalness:.65,roughness:.45});
  const plastic=new THREE.MeshStandardMaterial({color:0x202923,roughness:.65});
  const leather=new THREE.MeshStandardMaterial({color:0x20241b,roughness:.72});
  const lid=new THREE.MeshStandardMaterial({color:0x4e3927,roughness:.68});
  const spout=new THREE.MeshStandardMaterial({color:0x9d4c29,roughness:.5});
  function add(parent,geometry,material,x=0,y=0,z=0) {
    const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);
    object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
  }
  function lathe(parent,points,material) {
    return add(parent,new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),48),material);
  }
  function ring(parent,radius,y,thickness,material) {
    const object=add(parent,new THREE.TorusGeometry(radius,thickness,8,48),material,0,y);
    object.rotation.x=Math.PI/2;return object;
  }
  const thermos=new THREE.Group();thermos.name='Termo de acero';thermos.position.set(5.05,.245,-.9);set.add(thermos);
  lathe(thermos,[[0,0],[.46,0],[.51,.06],[.53,.16],[.53,2.30],[.50,2.40],[0,2.40]],steel);
  ring(thermos,.51,.09,.025,silver);ring(thermos,.53,.24,.014,engraving);
  lathe(thermos,[[0,2.35],[.54,2.35],[.55,2.42],[.54,2.64],[.46,2.72],[.44,2.79],[0,2.79]],plastic);
  ring(thermos,.46,2.72,.025,plastic);
  add(thermos,new THREE.CylinderGeometry(.43,.44,.23,48),lid,0,2.86);
  ring(thermos,.43,2.96,.018,lid);
  for(let i=0;i<48;i++){
    const angle=i*Math.PI/24;
    add(thermos,new THREE.CylinderGeometry(.008,.008,.14,4),plastic,Math.sin(angle)*.44,2.84,Math.cos(angle)*.44);
  }
  const pour=add(thermos,new THREE.CylinderGeometry(.065,.075,.34,12),spout,.16,3.04,0);pour.rotation.z=-.85;
  const handleCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(.50,2.52,0),new THREE.Vector3(.90,2.49,0),
    new THREE.Vector3(1.02,2.24,0),new THREE.Vector3(1.02,.82,0),new THREE.Vector3(.96,.59,0)
  ]);
  add(thermos,new THREE.TubeGeometry(handleCurve,32,.067,10,false),plastic);
  // An unbranded round badge, visible on the side facing the first player.
  add(thermos,new THREE.CircleGeometry(.23,32),plastic,0,1.55,.536);
  add(thermos,new THREE.TorusGeometry(.23,.009,6,32),engraving,0,1.55,.54);

  const mate=new THREE.Group();mate.name='Mate con bombilla';mate.position.set(5.03,.245,1.05);set.add(mate);
  lathe(mate,[[0,.035],[.32,.035],[.43,.09],[.51,.25],[.58,.54],[.57,.76],[.51,.94],[.52,1.06],[.45,1.06],[.44,.91]],leather);
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3;
    const foot=add(mate,new THREE.SphereGeometry(1,12,8),leather,Math.sin(a)*.31,.09,Math.cos(a)*.31);
    foot.scale.set(.14,.09,.17);
  }
  add(mate,new THREE.CylinderGeometry(.545,.535,.23,48,1,true),engraving,0,1.045);
  ring(mate,.543,1.16,.026,silver);ring(mate,.535,.93,.023,silver);
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    const ornament=add(mate,new THREE.TorusGeometry(.066,.012,6,16),silver,Math.sin(a)*.546,1.045,Math.cos(a)*.546);
    ornament.rotation.y=a;ornament.scale.y=1.15;
    const bead=add(mate,new THREE.SphereGeometry(.026,8,6),silver,Math.sin(a+.1)*.55,1.115,Math.cos(a+.1)*.55);
    bead.scale.y=.6;
  }
  const yerba=new THREE.MeshStandardMaterial({color:0x727141,roughness:1});
  const leaves=new THREE.MeshStandardMaterial({color:0x92905a,roughness:1});
  const darkLeaves=new THREE.MeshStandardMaterial({color:0x4b5830,roughness:1});
  const top=add(mate,new THREE.CircleGeometry(.49,40),yerba,0,1.105);top.rotation.x=-Math.PI/2;
  const leafGeometry=new THREE.BoxGeometry(.038,.012,.075);
  const lightLeafInstances=new THREE.InstancedMesh(leafGeometry,leaves,120);
  const darkLeafInstances=new THREE.InstancedMesh(leafGeometry,darkLeaves,60);
  lightLeafInstances.receiveShadow=darkLeafInstances.receiveShadow=true;
  mate.add(lightLeafInstances,darkLeafInstances);
  const leafTransform=new THREE.Object3D();let lightIndex=0,darkIndex=0;
  for(let i=0;i<180;i++){
    const angle=i*2.39996,radius=.46*Math.sqrt((i+.5)/180);
    leafTransform.position.set(Math.sin(angle)*radius,1.113+(i%5)*.004,Math.cos(angle)*radius);
    leafTransform.rotation.y=angle;leafTransform.updateMatrix();
    if(i%3)lightLeafInstances.setMatrixAt(lightIndex++,leafTransform.matrix);
    else darkLeafInstances.setMatrixAt(darkIndex++,leafTransform.matrix);
  }
  const strawCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(.17,1.06,-.12),new THREE.Vector3(.23,1.55,-.16),
    new THREE.Vector3(.38,1.94,-.18),new THREE.Vector3(.64,2.14,-.19)
  ]);
  add(mate,new THREE.TubeGeometry(strawCurve,28,.036,12,false),silver);
  const mouth=add(mate,new THREE.SphereGeometry(1,16,8),silver,.64,2.14,-.19);mouth.scale.set(.09,.025,.045);mouth.rotation.z=.55;
  for(const y of [1.47,1.51,1.55]){
    const band=add(mate,new THREE.TorusGeometry(.042,.009,6,16),engraving,.23,y,-.16);band.rotation.x=Math.PI/2;
  }
  return set;
}
