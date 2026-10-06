
import * as THREE from './node_modules/three/build/three.module.js';
const W=1920,H=1080, R=1, D2R=Math.PI/180;

// ---------- helpers ----------
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const easeIO=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
function K(keys){return t=>{ if(t<=keys[0][0])return keys[0][1]; for(let i=1;i<keys.length;i++){const [t1,v1]=keys[i];
  if(t<=t1){const [t0,v0]=keys[i-1];const e=easeIO((t-t0)/(t1-t0));return v0+(v1-v0)*e;}} return keys[keys.length-1][1];};}
const fade=(t,a,b,d=.7)=>Math.min(ease((t-a)/d),ease((b-t)/d));
const prog=(t,a,b)=>ease((t-a)/(b-a));
function ll(lat,lon,r=R){const phi=(lon+180)*D2R, th=lat*D2R;return new THREE.Vector3(-Math.cos(phi)*Math.cos(th)*r, Math.sin(th)*r, Math.sin(phi)*Math.cos(th)*r);}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

// ---------- renderer ----------
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H);renderer.setClearColor(0x02040c);
document.body.insertBefore(renderer.domElement,document.body.firstChild);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,W/H,.01,200);

// stars
{const r=rng(7),n=2600,p=new Float32Array(n*3),c=new Float32Array(n*3);
 for(let i=0;i<n;i++){const u=r()*2-1,a=r()*Math.PI*2,s=Math.sqrt(1-u*u);p.set([Math.cos(a)*s*80,u*80,Math.sin(a)*s*80],i*3);const b=.35+r()*.65;c.set([b,b,b*(.9+r()*.2)],i*3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));
 scene.add(new THREE.Points(g,new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true})));}

const earth=new THREE.Group();scene.add(earth);
const tex=await new THREE.TextureLoader().loadAsync('earth.jpg');tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
const U={map:{value:tex},lightDir:{value:new THREE.Vector3(1,0,0)},ambient:{value:.5},opacity:{value:1},
 hemiNS:{value:0},hemiEW:{value:0},zones:{value:0},zoneHi:{value:-99},zoneHiAmt:{value:0},zoneHi2Amt:{value:0},climate:{value:0}};
const earthMat=new THREE.ShaderMaterial({uniforms:U,transparent:true,
 vertexShader:`varying vec2 vUv;varying vec3 vL;varying vec3 vN;void main(){vUv=uv;vL=normalize(position);vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D map;uniform vec3 lightDir;uniform float ambient,opacity,hemiNS,hemiEW,zones,zoneHi,zoneHiAmt,zoneHi2Amt,climate;
 varying vec2 vUv;varying vec3 vL;varying vec3 vN;
 void main(){vec3 col=texture2D(map,vUv).rgb;
  float lat=degrees(asin(clamp(vL.y,-1.,1.)));float lon=degrees(atan(vL.z,-vL.x))-180.;if(lon<-180.)lon+=360.;
  if(hemiNS>0.){vec3 tc=lat>0.?vec3(.25,.55,1.):vec3(1.,.55,.2);col=mix(col,tc,hemiNS*.45);}
  if(hemiEW>0.){vec3 tc=lon>0.?vec3(.2,.9,.7):vec3(.95,.35,.75);col=mix(col,tc,hemiEW*.42);}
  if(climate>0.){float a=abs(lat);vec3 tc=a<23.5?vec3(1.,.35,.15):(a<66.5?vec3(.45,.9,.3):vec3(.4,.8,1.));col=mix(col,tc,climate*.42);}
  if(zones>0.){float z=floor((lon+7.5)/15.);float par=mod(z+24.,2.);
   vec3 zc=par<.5?vec3(.55,.35,1.):vec3(.15,.75,.95);float hi=abs(z-zoneHi)<.5||abs(abs(z)-12.)<.5&&abs(zoneHi)==12.?1.:0.;
   col=mix(col,zc,zones*.33);col=mix(col,vec3(1.,.82,.2),hi*zoneHiAmt*.5);col=mix(col,vec3(.25,.85,1.),(abs(z+1.)<.5?1.:0.)*zoneHi2Amt*.55);
   float e=abs(fract((lon+7.5)/15.)-.5);float edge=smoothstep(.485,.5,e);col=mix(col,vec3(1.),edge*zones*.8);}
  float d=dot(normalize(vN),normalize(lightDir));
  float b=ambient+(1.15-ambient)*smoothstep(-.12,.35,d);
  gl_FragColor=vec4(col*b,opacity);
  #include <colorspace_fragment>
 }`});
const globe=new THREE.Mesh(new THREE.SphereGeometry(R,160,96),earthMat);globe.renderOrder=-10;earth.add(globe);
// atmosphere
const atm=new THREE.Mesh(new THREE.SphereGeometry(R*1.07,96,64),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,
 uniforms:{s:{value:1}},vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform float s;varying vec3 vN;varying vec3 vV;void main(){float f=pow(clamp(1.-abs(dot(vN,vV))*1.0,0.,1.),.9);float i=pow(clamp(-dot(vN,vV)+.0,0.,1.),2.);gl_FragColor=vec4(.35,.65,1.,1.)*i*.9*s;}`}));
atm.renderOrder=10;scene.add(atm);

// ---------- curves & tubes ----------
class FnCurve extends THREE.Curve{constructor(f){super();this.f=f;}getPoint(u,o=new THREE.Vector3()){return o.copy(this.f(u));}}
const latCurve=(lat,r=1.004,l0=-180,l1=180)=>new FnCurve(u=>ll(lat,l0+(l1-l0)*u,r));
const lonCurve=(lon,r=1.004,a0=-90,a1=90)=>new FnCurve(u=>ll(a1+(a0-a1)*u,lon,r)); // north->south
function tube(curve,color,rad=.006,seg=256,parent=earth){
 const g=new THREE.TubeGeometry(curve,seg,rad,8,false);
 const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:true}));
 m.userData.seg=seg;parent.add(m);m.visible=false;return m;}
function setTube(m,op,p=1){m.visible=op>.003&&p>.002;m.material.opacity=clamp(op);
 const n=Math.floor(clamp(p)*m.userData.seg)*8*6;m.geometry.setDrawRange(0,p>=1?Infinity:n);}
// dynamic tube (rebuilt when key changes)
function dyn(color,rad=.006,parent=earth){const m=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0}));m.visible=false;m.userData.k='';parent.add(m);
 m.set=(key,curveFn,op,seg=96)=>{m.visible=op>.003;m.material.opacity=clamp(op);if(!m.visible)return;if(key!==m.userData.k){m.geometry.dispose();m.geometry=new THREE.TubeGeometry(curveFn(),seg,rad,8,false);m.userData.k=key;}};return m;}

// grid
const PARS=[-75,-60,-45,-30,-15,15,30,45,60,75].map(lat=>({lat,m:tube(latCurve(lat),0xd8ecff,.0042)}));
const MERS=[];for(let lon=-165;lon<=180;lon+=15){MERS.push({lon,m:tube(lonCurve(lon),0xd8ecff,.0042,160)});}
const equator=tube(latCurve(0,1.005),0xffd23f,.009);
const special=[[23.5,0xff6b6b],[-23.5,0xff6b6b],[66.5,0xb8d8ff],[-66.5,0xb8d8ff]].map(([lat,c])=>tube(latCurve(lat,1.005),c,.0075));
const greenwich=tube(lonCurve(0,1.006),0x4ade80,.0095,160);
const m180=tube(lonCurve(180,1.006),0xff4fd8,.0095,160);
const pinkA=tube(lonCurve(-60,1.006),0xff6fae,.0085,160), pinkB=tube(lonCurve(120,1.006),0xff6fae,.0085,160);
// axis
const axis=tube(new FnCurve(u=>new THREE.Vector3(0,-1.3+2.6*u,0)),0xffffff,.008,8);
// rotation arrow (world space)
const arrowArc=tube(new FnCurve(u=>ll(-4,-35+70*u,1.2)),0xffffff,.012,64,scene);
const cone=new THREE.Mesh(new THREE.ConeGeometry(.04,.11,20),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}));scene.add(cone);
{const p=ll(-4,35,1.2),tg=ll(-4,40,1.2).sub(p).normalize();cone.position.copy(p);cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tg);}
// center dot + angle helpers
const center=new THREE.Mesh(new THREE.SphereGeometry(.022,20,12),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}));earth.add(center);
const rayA=dyn(0xffffff,.006),rayB=dyn(0xff5a5a,.007),arc=dyn(0xff8a3d,.008);
const P=new THREE.Mesh(new THREE.SphereGeometry(.032,24,16),new THREE.MeshBasicMaterial({color:0xff3b3b,transparent:true}));earth.add(P);
const hiPar=dyn(0xff9a3d,.008), hiMer=dyn(0x7fd3ff,.008);
// filled angle wedge (fan)
function wedge(color){const N=64,pos=new Float32Array((N+2)*3),idx=[];for(let i=1;i<=N;i++)idx.push(0,i,i+1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(idx);
 const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));m.renderOrder=5;earth.add(m);m.visible=false;
 m.set=(fn,op)=>{m.visible=op>.003;m.material.opacity=op;if(!m.visible)return;for(let i=0;i<=N;i++){const p=fn(i/N);pos.set([p.x,p.y,p.z],(i+1)*3);}g.attributes.position.needsUpdate=true;g.computeBoundingSphere();};return m;}
const wedgeM=wedge(0xff8a3d);
// translucent planes
const eqDisc=new THREE.Mesh(new THREE.CircleGeometry(1.0,128),new THREE.MeshBasicMaterial({color:0x7fd3ff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
eqDisc.rotation.x=-Math.PI/2;eqDisc.renderOrder=4;earth.add(eqDisc);
const merDisc=new THREE.Mesh(new THREE.CircleGeometry(1.0,128,-Math.PI/2,Math.PI),new THREE.MeshBasicMaterial({color:0xff9a9a,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
merDisc.rotation.y=-4*D2R;merDisc.renderOrder=4;earth.add(merDisc);
// pins
function pin(color){const m=new THREE.Mesh(new THREE.SphereGeometry(.022,20,12),new THREE.MeshBasicMaterial({color,transparent:true}));earth.add(m);return m;}
const CITIES={greenwich:[51.48,0],madrid:[40.42,-3.70],sevilla:[37.39,-5.98],ba:[-34.6,-58.38],tokyo:[35.68,139.69],london:[51.5,-0.13],moscow:[55.75,37.62],ny:[40.71,-74.0],canarias:[28.29,-16.0]};
const pins={};for(const k in CITIES){pins[k]=pin(k==='madrid'||k==='canarias'||k==='sevilla'?0xff3b3b:0xffe14d);pins[k].position.copy(ll(...CITIES[k],1.01));}

// ---------- labels ----------
const LBL=[];const host=document.getElementById('labels');
function label(html,posFn,opFn,{space='earth',off=[0,0],occl=true,cls=''}={}){const el=document.createElement('div');el.className='lbl '+cls;el.innerHTML=typeof html==='string'?html:'';host.appendChild(el);
 const L={el,html,posFn,opFn,space,off,occl,last:''};LBL.push(L);return L;}
const v=new THREE.Vector3(),wp=new THREE.Vector3();
function occluded(p){const c=camera.position;const d=wp.copy(p).sub(c);const len=d.length();d.divideScalar(len);
 const b=c.dot(d),cc=c.lengthSq()-R*R*0.995,disc=b*b-cc;if(disc<0)return 0;const tN=-b-Math.sqrt(disc);if(tN<0||tN>len-0.02)return 0;
 return clamp((len-tN)/0.08);}
function updateLabels(t){for(const L of LBL){let op=L.opFn(t);if(op<=.003){L.el.style.display='none';continue;}
 const p=L.posFn(t);v.copy(p);if(L.space==='earth')earth.localToWorld(v);
 if(L.occl)op*=1-occluded(v);if(op<=.003){L.el.style.display='none';continue;}
 const w=v.clone().project(camera);const x=(w.x*.5+.5)*W+L.off[0],y=(-w.y*.5+.5)*H+L.off[1];
 L.el.style.display='block';L.el.style.opacity=op;L.el.style.left=x+'px';L.el.style.top=y+'px';
 if(typeof L.html==='function'){const h=L.html(t);if(h!==L.last){L.el.innerHTML=h;L.last=h;}}}}
const camOff={x:0,y:95};

// ---------- city coordinate rigs ----------
const RIGS=[];
function cityRig(key,name,coords,latTxt,lonTxt,t0,t1,O={}){const dim=null;const nO=O.n||[0,-58],lO=O.l,oO=O.o||[0,34];const [la,lo]=CITIES[key];
 const r={key,t0,t1,dim,
  latArc:tube(new FnCurve(u=>ll(la*u,lo,1.013)),0xff9a3d,.011,64),
  lonArc:tube(new FnCurve(u=>ll(0,lo*u,1.013)),0x3fc8ff,.011,96),
  par:tube(latCurve(la,1.007),0xff9a3d,.0045,256),mer:tube(lonCurve(lo,1.007),0x3fc8ff,.0045,160)};
 r.op=t=>Math.max(fade(t,t0,t1),dim?fade(t,dim[0],dim[1])*.45:0);
 label(`<b>${name}</b><small>${coords}</small>`,()=>ll(la,lo,1.01),t=>Math.max(fade(t,t0+.5,t1),dim?fade(t,dim[0],dim[1])*.8:0),{off:nO});
 label(`<span style="color:#ffb070">${latTxt}</span>`,()=>ll(la/2,lo,1.02),t=>fade(t,t0+2.2,t1),{off:lO||[lo<-20?-62:62,0]});
 label(`<span style="color:#7fd8ff">${lonTxt}</span>`,()=>ll(0,lo/2,1.02),t=>fade(t,t0+4,t1),{off:oO});
 RIGS.push(r);}
cityRig('madrid','Madrid','40° N, 4° O','40° N','4° O',252,287.5,{n:[0,-58],l:[62,0],o:[0,34]});
cityRig('sevilla','Sevilla','37° N, 6° O','37° N','6° O',276,287.5,{n:[-120,24],l:[-62,0],o:[0,-34]});
cityRig('ba','Buenos Aires','35° S, 58° O','35° S','58° O',288,298.5);
cityRig('tokyo','Tokio','36° N, 140° E','36° N','140° E',298.6,310.5);
cityRig('sevilla','Sevilla','37° N, 6° O','37° N','6° O',531.5,548.6,{n:[0,-58],l:[-62,0],o:[0,34]});

// ---------- orbit scene (seasons) ----------
const orbit=new THREE.Group();orbit.visible=false;scene.add(orbit);
const ORB=4.2;
{const sun=new THREE.Mesh(new THREE.SphereGeometry(.75,64,32),new THREE.MeshBasicMaterial({color:0xffd56b}));orbit.add(sun);
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');const gr=g.createRadialGradient(128,128,0,128,128,128);
 gr.addColorStop(0,'rgba(255,230,150,1)');gr.addColorStop(.25,'rgba(255,190,80,.55)');gr.addColorStop(.6,'rgba(255,150,40,.12)');gr.addColorStop(1,'rgba(255,150,40,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sp.scale.setScalar(4.6);orbit.add(sp);
 window.ring=new THREE.Mesh(new THREE.TubeGeometry(new FnCurve(u=>new THREE.Vector3(Math.cos(u*Math.PI*2)*ORB,0,-Math.sin(u*Math.PI*2)*ORB)),256,.012,6,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35}));orbit.add(ring);}
const miniTilt=new THREE.Group();orbit.add(miniTilt);miniTilt.rotation.z=-23.5*D2R;
const miniSpin=new THREE.Group();miniTilt.add(miniSpin);
const miniMat=earthMat.clone();miniMat.uniforms.map.value=tex;miniMat.uniforms.ambient.value=.1;miniMat.transparent=false;
const MR=.5;
miniSpin.add(new THREE.Mesh(new THREE.SphereGeometry(MR,96,64),miniMat));
miniTilt.add(new THREE.Mesh(new THREE.TubeGeometry(new FnCurve(u=>new THREE.Vector3(0,(-1+2*u)*MR*1.55,0)),4,.012,8),new THREE.MeshBasicMaterial({color:0xffffff})));
miniTilt.add(new THREE.Mesh(new THREE.TubeGeometry(new FnCurve(u=>new THREE.Vector3(Math.cos(u*Math.PI*2)*MR*1.01,0,Math.sin(u*Math.PI*2)*MR*1.01)),128,.008,6,true),new THREE.MeshBasicMaterial({color:0xffb020})));
const ORBIT_T0=436.8,ORBIT_T1=511.8;
const orbA=K([[436.8,120],[462,540],[475,540],[479.5,720],[487.4,720],[490.5,810],[499.6,810],[511.8,880]]);
const orbPos=t=>{const a=orbA(t)*D2R;return new THREE.Vector3(Math.cos(a)*ORB,0,-Math.sin(a)*ORB);};
const followF=K([[436.8,0],[461.5,0],[464,1],[475,1],[477,.15],[478.5,.15],[481,1],[487.4,1],[488.6,.2],[489.4,.2],[491.5,1],[499.6,1],[502,0]]);
const fox=K([[0,0],[487.4,0],[490,4.0]]),foz=K([[0,4.5],[487.4,4.5],[490,1.7]]);
const RAYL=ORB-.95-MR-.12;const rays=new THREE.Group();orbit.add(rays);const rayMat=new THREE.MeshBasicMaterial({color:0xffd56b,transparent:true,opacity:0,depthWrite:false});
for(const [dy,dz] of [[.36,0],[0,0],[-.36,0]]){const sh=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,RAYL-.16,10),rayMat);sh.rotation.z=-Math.PI/2;sh.position.set(.95+(RAYL-.16)/2,dy,dz);rays.add(sh);
 const hd=new THREE.Mesh(new THREE.ConeGeometry(.06,.16,16),rayMat);hd.rotation.z=-Math.PI/2;hd.position.set(.95+RAYL-.08,dy,dz);rays.add(hd);}
const rayOp=t=>Math.max(fade(t,463.5,475),fade(t,480.8,487.4),fade(t,491,499.6));
const OVER=new THREE.Vector3(0,4.4,9.8);
const AXDIR=new THREE.Vector3(Math.sin(23.5*D2R),Math.cos(23.5*D2R),0);
const posAtA=a=>new THREE.Vector3(Math.cos(a*D2R)*ORB,0,-Math.sin(a*D2R)*ORB);
const dateOp=t=>Math.max(fade(t,450,462.4),fade(t,500,511.4));
label('<b>21 de junio</b><small>verano (N) · invierno (S)</small>',()=>posAtA(180),dateOp,{space:'world',occl:false,off:[0,-78]});
label('<b>21 de diciembre</b><small>invierno (N) · verano (S)</small>',()=>posAtA(0),dateOp,{space:'world',occl:false,off:[0,-78]});
label('<b>20 de marzo</b><small>primavera (N) · otoño (S)</small>',()=>posAtA(90),dateOp,{space:'world',occl:false,off:[0,-62]});
label('<b>23 de septiembre</b><small>otoño (N) · primavera (S)</small>',()=>posAtA(270),dateOp,{space:'world',occl:false,off:[0,-62]});
label('Sol',()=>new THREE.Vector3(0,0,0),t=>fade(t,438,511.4)*(1-followF(t)),{space:'world',occl:false,off:[0,92]});
label('Tierra',t=>orbPos(t),t=>fade(t,438,449.5),{space:'world',occl:false,off:[0,-62]});
const seasonLbl=(txt,sign,a,b)=>label(txt,t=>orbPos(t).add(AXDIR.clone().multiplyScalar(sign*MR*1.05)),t=>fade(t,a,b)*followF(t),{space:'world',occl:false,off:[sign>0?150:-150,0]});
seasonLbl('☀️ <b style="color:#ffd23f">VERANO</b><small>hemisferio norte</small>',1,464,475);seasonLbl('❄️ <b style="color:#8fe8ff">INVIERNO</b><small>hemisferio sur</small>',-1,464,475);
seasonLbl('❄️ <b style="color:#8fe8ff">INVIERNO</b><small>hemisferio norte</small>',1,481,487.4);seasonLbl('☀️ <b style="color:#ffd23f">VERANO</b><small>hemisferio sur</small>',-1,481,487.4);
seasonLbl('🌱 <b style="color:#7ee787">PRIMAVERA</b><small>hemisferio norte</small>',1,491.5,499.6);seasonLbl('🍂 <b style="color:#ffb070">OTOÑO</b><small>hemisferio sur</small>',-1,491.5,499.6);
label('<span style="color:#ffd56b">luz del Sol</span>',t=>orbPos(t).normalize().multiplyScalar(.95+RAYL*.45).add(new THREE.Vector3(0,.42,0)),t=>rayOp(t)*followF(t),{space:'world',occl:false,off:[0,-26]});
// tilt helpers (main globe, world space)
const refLine=tube(new FnCurve(u=>new THREE.Vector3(0,-1.35+2.7*u,0)),0xffffff,.005,4,scene);
const tiltArc=dyn(0xffd23f,.01,scene);
const tiltK=K([[0,0],[424.5,0],[428.5,-23.5],[436.8,-23.5],[436.9,0],[518.1,0],[519.7,-23.5],[521.7,-23.5],[522.9,0]]);
const SB=513.5,SD=4.5;const sVis=(t,k)=>ease((t-(SB+k*SD))/.8);const sEmph=(t,k)=>k===5?ease((t-(SB+k*SD))/.8):fade(t,SB+k*SD,SB+(k+1)*SD,.6);

// ---------- script (captions) ----------
const SECTIONS=[[9,33,'1','El eje y los polos'],[33,60,'2','El ecuador'],[422,436.8,'3','La inclinación del eje y las estaciones'],[436.8,511.8,'3','La inclinación del eje y las estaciones'],[60,100,'4','Los paralelos'],[100,127,'5','Los meridianos'],
 [127,166,'6','El meridiano de Greenwich'],[166,206,'7','La latitud'],[206,250,'8','La longitud'],[250,310,'9','Las coordenadas geográficas'],
 [310,373,'10','Los husos horarios'],[373,399,'11','La línea de cambio de fecha'],[399,422,'12','Curiosidad: la hora en España']];
const CAPS=[
 [10,20.5,'La Tierra tiene forma casi <b>esférica</b> y gira sobre sí misma alrededor de una línea imaginaria: el <b>eje terrestre</b>.'],
 [21,32.6,'Los extremos del eje son los <b>polos</b>: el <b>Polo Norte</b> y el <b>Polo Sur</b>. La Tierra da una vuelta completa cada <b>24 horas</b>, de <i>oeste a este</i>.'],
 [34,44.5,'El <b>ecuador</b> es una línea imaginaria que rodea la Tierra justo a mitad de camino entre los dos polos.'],
 [45,59.6,'El ecuador divide la Tierra en dos mitades iguales: el <b>hemisferio norte</b> y el <b>hemisferio sur</b>. <i>(Hemisferio = media esfera)</i>'],
 [61,72.3,'Los <b>paralelos</b> son círculos imaginarios <b>paralelos al ecuador</b>. Cuanto más cerca de los polos, <b>más pequeños</b> son.'],
 [73,86.8,'Algunos tienen nombre propio: los <b>trópicos de Cáncer y Capricornio</b> (23,5° N y S, ¡como la inclinación del eje!) y los <b>círculos polares Ártico y Antártico</b> (66,5° N y S).'],
 [87.5,99.6,'Estos paralelos separan las <b>zonas climáticas</b>: una <b>zona cálida</b>, dos <b>zonas templadas</b> y dos <b>zonas frías</b>.'],
 [101,112.3,'Los <b>meridianos</b> son semicircunferencias imaginarias que van <b>de un polo al otro</b>. Todos miden lo mismo y se juntan en los polos.'],
 [113,126.6,'Un meridiano y su <b>meridiano opuesto</b> forman una circunferencia completa que divide la Tierra en dos mitades.'],
 [128,140,'Para orientarnos necesitamos un meridiano de referencia: el <b>meridiano de Greenwich</b>, también llamado <b>meridiano 0°</b>.'],
 [141,152,'Se llama así porque pasa por el <b>Observatorio de Greenwich</b>, en Londres. Se eligió como referencia mundial en <b>1884</b>.'],
 [153,165.6,'Greenwich divide la Tierra en <b>hemisferio oriental</b> <i>(este)</i> y <b>hemisferio occidental</b> <i>(oeste)</i>. Su opuesto es el <b>meridiano 180°</b>.'],
 [167,179,'La <b>latitud</b> es la distancia, medida en <b>grados</b>, entre un lugar y el <b>ecuador</b>. Es el ángulo que se forma en el <i>centro de la Tierra</i>.'],
 [180,191,'Va de <b>0°</b> (en el ecuador) a <b>90°</b> (en los polos). Por eso hablamos de latitud <b>norte (N)</b> o latitud <b>sur (S)</b>.'],
 [192,205.6,'Todos los lugares situados sobre <b>un mismo paralelo</b> tienen <b>la misma latitud</b>.'],
 [207,218.5,'La <b>longitud</b> es la distancia, medida en <b>grados</b>, entre un lugar y el <b>meridiano de Greenwich</b>. Se mide sobre el plano del ecuador.'],
 [219.5,231,'Va de <b>0°</b> (en Greenwich) a <b>180°</b>, hacia el <i>este</i> o hacia el <i>oeste</i>. Por eso hablamos de longitud <b>este (E)</b> o <b>oeste (O)</b>.'],
 [232.5,249.5,'Todos los lugares situados sobre <b>un mismo meridiano</b> tienen <b>la misma longitud</b>.'],
 [251,262.5,'Latitud + longitud = <b>coordenadas geográficas</b>. Latitud: <i style="color:#ffb070">cuánto al norte o al sur del ecuador</i>. Longitud: <i>cuánto al este o al oeste de Greenwich</i>.'],
 [263.5,274.6,'Por ejemplo, <b>Madrid</b> está en <b>40° N, 4° O</b>. Siempre se escribe primero la <b>latitud</b> y después la <b>longitud</b>.'],
 [275.5,287.2,'<b>Sevilla</b> está en <b>37° N, 6° O</b>: un poco más al <i>sur</i> que Madrid (menos latitud) y un poco más al <i>oeste</i> (más longitud oeste).'],
 [288.3,298.2,'En el hemisferio sur: <b>Buenos Aires</b> (Argentina) está en <b>35° S, 58° O</b>.'],
 [299,309.6,'Y en el hemisferio oriental: <b>Tokio</b> (Japón) está en <b>36° N, 140° E</b>.'],
 [311,321.5,'Mientras la Tierra gira, el Sol solo ilumina <b>la mitad</b> del planeta. Cuando en un lugar es <b>de día</b>, en el lado opuesto es <b>de noche</b>.'],
 [322.5,332,'La Tierra gira <b>360°</b> en <b>24 horas</b>. Así que cada hora gira: 360° ÷ 24 = <b>15°</b>.'],
 [333,345,'Por eso la Tierra se divide en <b>24 husos horarios</b> de <b>15°</b> cada uno. Dentro de un mismo huso, todos tienen <b>la misma hora</b>.'],
 [346,358,'El huso de Greenwich es la referencia <b>(UTC)</b>. Hacia el <i>este</i> se <b>suma 1 hora</b> por cada huso; hacia el <i>oeste</i> se <b>resta 1 hora</b>.'],
 [359,372.6,'Ejemplo: si en <b>Londres</b> son las <b>12:00</b>, en Moscú son las <b>15:00</b>, en Tokio las <b>21:00</b> y en Nueva York las <b>07:00</b>.'],
 [374,386,'Al otro lado de Greenwich, cerca del <b>meridiano 180°</b>, está la <b>línea internacional de cambio de fecha</b>.'],
 [387,398.6,'Si la cruzas viajando hacia el <i>oeste</i>, <b>sumas un día</b>. Si la cruzas viajando hacia el <i>este</i>, <b>restas un día</b>.'],
 [400,409.6,'Casi toda España está en el huso de Greenwich por su posición… ¡pero usa la hora de <b>Europa central (UTC+1)</b>!'],
 [410.3,421.8,'En <b>Canarias</b> pasa algo parecido: por su posición estarían en el huso <b>UTC−1</b>, pero usan <b>UTC+0</b>. Por eso allí es <b>una hora menos</b> que en la península.'],
 [424.9,436.2,'El eje de la Tierra no está derecho: está <b>inclinado unos 23,5°</b>. Esta inclinación es la causa de las <b>estaciones del año</b>. ¡Vamos a verlo!'],
 [437.8,448.8,'Además de girar sobre sí misma, la Tierra da una vuelta alrededor del Sol cada año (unos <b>365 días</b>): es el movimiento de <b>traslación</b>.'],
 [449.6,461.4,'Durante todo el viaje, el eje inclinado apunta <b>siempre hacia el mismo lado</b>. Por eso, a lo largo del año, cada hemisferio recibe la luz del Sol de forma distinta.'],
 [462.2,475.2,'Hacia el <b>21 de junio</b>, el hemisferio norte se inclina <b>hacia el Sol</b>: días más largos y rayos más directos. ¡<b>Verano en el norte</b> e <b>invierno en el sur</b>!'],
 [476.4,487.2,'Hacia el <b>21 de diciembre</b> ocurre lo contrario: <b>invierno en el norte</b> y <b>verano en el sur</b>.'],
 [488.2,499.4,'En los <b>equinoccios</b> (hacia el 20 de marzo y el 23 de septiembre), el día y la noche duran casi lo mismo en todo el planeta: empiezan la <b>primavera</b> y el <b>otoño</b>.'],
 [500.2,511.4,'¡Ojo! Las estaciones <b>no</b> se deben a que la Tierra esté más cerca o más lejos del Sol, sino a la <b>inclinación del eje</b>. Por eso son <b>opuestas</b> en cada hemisferio.'],
];
const chip=document.getElementById('chip'),cap=document.getElementById('cap');let lastCap=null,lastChip=null;

// ---------- tracks ----------
const TOTAL=555;
const CAM=[[0,10,18,5.6],[9,15,15,4.8],[21,7,8,5.9],[33,0,8,5.9],
 [35,0,20,4.9],[45,0,20,4.9],[47,0,5,5.0],[60,0,5,5.0],
 [62,10,18,4.95],[73,10,18,4.95],[74.5,10,2,5.0],[100,10,2,5.0],
 [102,20,35,4.9],[113,20,35,4.9],[115,0,22,4.9],[127,0,22,4.9],
 [129,0,25,4.9],[141,0,25,4.9],[143.5,0,51,1.75],[152,0,51,1.75],[154,0,15,4.9],[158.5,0,15,4.9],[162,90,32,5.0],[165.5,90,32,5.0],
 [168,62,10,5.0],[194,62,10,5.0],[196,20,32,4.9],[206,20,32,4.9],
 [208.5,30,55,5.0],[231,30,55,5.0],[233.5,-70,15,5.0],[250,-70,15,5.0],
 [252.5,-10,22,4.9],[274,-10,22,4.9],[276.5,-5,24,4.4],[287.5,-5,24,4.4],[290,-30,-12,4.9],[298,-30,-12,4.9],[300.5,70,18,5.0],[310,70,18,5.0],
 [312.5,-90,18,4.9],[333,-60,18,4.9],[335,0,15,5.1],[358,0,15,5.1],[360,-74,30,4.9],[372.5,139.7,30,4.9],
 [377,180,12,4.9],[398,180,12,4.9],[402,-8,36,2.25],[422,-8,36,2.25],[424.5,-90,4,6.6],[436.8,-90,4,6.6],[511.7,-90,4,6.6],[511.8,20,16,5.0],[555,20,16,5.0]];
const cam={lon:K(CAM.map(k=>[k[0],k[1]])),lat:K(CAM.map(k=>[k[0],k[2]])),dist:K(CAM.map(k=>[k[0],k[3]])),
 offX:K([[0,0],[321,0],[322.5,-250],[332,-250],[333.5,0],[358,0],[359.5,-270],[372,-270],[373.5,0],[511.7,0],[511.8,-480],[555,-480]])};
const earthRot=K([[0,-260],[31,0],[310,0],[321.5,150],[322.6,150],[323.2,165],[324.4,165],[325,180],[326.2,180],[326.8,195],[328,195],[328.6,210],[329.8,210],[330.4,225],[331.6,225],[333,360],[422,360],[436.8,400],[511.8,400],[555,405]]);
const sunMix=K([[0,0],[310,0],[312,1],[422,1],[424,0]]);
const nightAmb=K([[0,.13],[374,.13],[377,.3],[399,.3],[402,.13]]);
const SUNDIR=new THREE.Vector3(1,.05,0).normalize();
earth.rotation.order='ZYX';

// ---------- labels ----------
label('Polo Norte',()=>new THREE.Vector3(0,1.27,0),t=>fade(t,21,33),{off:[105,0],occl:false});
label('Polo Sur',()=>new THREE.Vector3(0,-1.27,0),t=>fade(t,21,33),{off:[90,0],occl:false});
label('Eje terrestre',()=>new THREE.Vector3(0,1.2,0),t=>fade(t,11.5,20.8),{off:[120,0],occl:false});
label('de oeste a este',()=>ll(-4,0,1.2),t=>fade(t,25,33),{space:'world',off:[0,48],occl:false});
label('Ecuador <small>0°</small>',()=>ll(0,30),t=>fade(t,37,60),{off:[0,-38]});
label('Hemisferio Norte',()=>ll(42,8),t=>fade(t,46,60));
label('Hemisferio Sur',()=>ll(-42,8),t=>fade(t,46,60));
label('Polo Norte',()=>new THREE.Vector3(0,1.02,0),t=>fade(t,108,113),{off:[0,-30]});
const parL=(txt,lat,c)=>label(`<span style="color:${c}">${txt}</span>`,()=>ll(lat,32,1.005),t=>fade(t,74,87.3),{off:[0,lat>0?-24:24]});
parL('Trópico de Cáncer <small>23,5° N</small>',23.5,'#ff8a8a');parL('Trópico de Capricornio <small>23,5° S</small>',-23.5,'#ff8a8a');
parL('Círculo Polar Ártico <small>66,5° N</small>',66.5,'#cfe4ff');parL('Círculo Polar Antártico <small>66,5° S</small>',-66.5,'#cfe4ff');
label('Ecuador',()=>ll(0,-10),t=>fade(t,74,87.3),{off:[0,-26]});
label('Zona cálida',()=>ll(0,10),t=>fade(t,88.5,100));
label('Zona templada',()=>ll(45,10),t=>fade(t,88.5,100));label('Zona templada',()=>ll(-45,10),t=>fade(t,88.5,100));
label('Zona fría',()=>ll(76,10),t=>fade(t,88.5,100));label('Zona fría',()=>ll(-75,10),t=>fade(t,88.5,100));
label('<span style="color:#ff8fc0">Meridiano</span>',()=>ll(25,-60),t=>fade(t,114,127),{off:[-70,0]});
label('<span style="color:#ff8fc0">Meridiano opuesto</span>',()=>ll(25,120),t=>fade(t,114,127),{off:[80,0]});
label('<span style="color:#6ee7a0">Meridiano de Greenwich</span><small>0°</small>',()=>ll(-18,0,1.01),t=>fade(t,131,141));
label('Observatorio de Greenwich<small>Londres (Reino Unido)</small>',()=>ll(51.48,0,1.01),t=>fade(t,144,152.5),{off:[0,-60]});
label('Hemisferio Oriental<small>(Este)</small>',()=>ll(12,55),t=>fade(t,155,166));
label('Hemisferio Occidental<small>(Oeste)</small>',()=>ll(12,-55),t=>fade(t,155,166));
label('<span style="color:#6ee7a0">Greenwich 0°</span>',()=>ll(-28,0,1.01),t=>fade(t,154,166));
label('<span style="color:#ff8ce9">Meridiano 180°</span>',()=>ll(-28,180,1.01),t=>fade(t,160.5,166));
// latitude / longitude
const latP=K([[167,0],[169,0],[173,40],[181,40],[184,90],[185.5,90],[187.5,0],[188.3,0],[190.3,-35],[192,-35],[194,40],[206,40]]);
const lonAlongPar=K([[194,-4],[205.5,-110]]);
const lonP=K([[206,0],[209.5,0],[213.5,60],[220,60],[223.5,180],[224.6,180],[228.5,-100],[250,-100]]);
const latAlongMer=K([[231,0],[234,0],[237.5,55],[238.5,55],[242.5,-40],[244,-40],[246.5,0],[250,0]]);
function fmtLat(a){a=Math.round(a);return a===0?'0° (ecuador)':Math.abs(a)+'° '+(a>0?'N':'S')+(Math.abs(a)===90?(a>0?' (Polo Norte)':' (Polo Sur)'):'');}
function fmtLon(a){a=Math.round(a);if(Math.abs(a)===180)return '180°';return a===0?'0° (Greenwich)':Math.abs(a)+'° '+(a>0?'E':'O');}
const Ppos=t=>{if(t<206){const lat=t<194?latP(t):40;const lon=t<194?-4:lonAlongPar(t);return ll(lat,lon,1.012);}
 const lon=t<231?lonP(t):-100,lat=t<231?0:latAlongMer(t);return ll(lat,lon,1.012);};
label(t=>`Latitud: <span style="color:#ffb070">${fmtLat(t<194?latP(t):40)}</span>`,Ppos,t=>fade(t,168,206),{off:[0,-52],occl:false});
label(t=>`Longitud: <span style="color:#7fd8ff">${fmtLon(t<231?lonP(t):-100)}</span>`,Ppos,t=>fade(t,207.5,250),{off:[0,-52],occl:false});
label('Centro de la Tierra',()=>new THREE.Vector3(0,0,0),t=>fade(t,168,180)+fade(t,208,219),{off:[0,40],occl:false});
label(t=>`<span style="color:#ffb070">${Math.round(Math.abs(latP(t)))}°</span>`,t=>ll(latP(t)/2,-4,.68),t=>fade(t,169.5,193.5)*(Math.abs(latP(t))>6?1:0),{occl:false});
label(t=>`<span style="color:#7fd8ff">${Math.round(Math.abs(lonP(t)))}°</span>`,t=>ll(0,lonP(t)/2,.72),t=>fade(t,210,230.5)*(Math.abs(lonP(t))>8?1:0),{occl:false});
label('<span style="color:#6ee7a0">Greenwich 0°</span>',()=>ll(0,0,1.02),t=>fade(t,207.5,231),{off:[0,40],occl:false});
label('<b style="color:#7ef0c8">ESTE (E)</b>',()=>ll(0,90,1.18),t=>fade(t,219.5,231),{occl:false});
label('<b style="color:#ff9ad5">OESTE (O)</b>',()=>ll(0,-90,1.18),t=>fade(t,219.5,231),{occl:false});
label('<span style="color:#7fd3ff">plano del ecuador</span>',()=>ll(0,150,.75),t=>fade(t,208.5,219),{occl:false});
label('Ecuador',()=>ll(0,-60,1.02),t=>fade(t,168,193),{off:[0,30],occl:false});
// coordinates section: Greenwich + equator tags
label('<span style="color:#6ee7a0">Greenwich 0°</span>',()=>ll(62,0,1.01),t=>fade(t,251,287.5),{off:[0,0]});
label('<span style="color:#6ee7a0">Greenwich 0°</span>',()=>ll(-45,0,1.01),t=>fade(t,288.5,310));
label('<span style="color:#ffd23f">Ecuador 0°</span>',()=>ll(0,-35,1.01),t=>fade(t,251,274.5)+fade(t,299,310),{off:[0,34]});
// time zones
for(let k=-12;k<=12;k++){const txt=k===0?'UTC':(k>0?'+'+k:'−'+(-k)); if(Math.abs(k)===12)continue;
 const del=k===0?0:Math.abs(k)*0.55;
 label(`<span style="color:${k===0?'#ffd23f':(k>0?'#7ef0c8':'#ff9ad5')}">${txt}</span>`,()=>ll(-4,k*15,1.01),t=>fade(t,k===0?334:347+del,373),{});}
label('<b>Londres</b> 12:00',()=>ll(...CITIES.london,1.01),t=>fade(t,360,373),{off:[0,-34]});
label('<b>Moscú</b> 15:00',()=>ll(...CITIES.moscow,1.01),t=>fade(t,360,373),{off:[0,-34]});
label('<b>Tokio</b> 21:00',()=>ll(...CITIES.tokyo,1.01),t=>fade(t,360,373),{off:[0,-34]});
label('<b>Nueva York</b> 07:00',()=>ll(...CITIES.ny,1.01),t=>fade(t,360,373),{off:[0,-34]});
label('<span style="color:#ff8ce9">Línea internacional<br>de cambio de fecha</span>',()=>ll(42,180,1.01),t=>fade(t,378,399),{});
label('<b style="color:#7ef0c8">MARTES</b><small>(lado oeste de la línea)</small>',()=>ll(-8,165,1.01),t=>fade(t,388,399),{});
label('<b style="color:#ff9ad5">LUNES</b><small>(lado este de la línea)</small>',()=>ll(-8,-165,1.01),t=>fade(t,388,399),{});
label('<b>Península</b><small>huso 0 · usa UTC+1</small>',()=>ll(...CITIES.madrid,1.01),t=>fade(t,402,422),{off:[0,-56]});
label('<b style="color:#ffd23f">huso 0</b>',()=>ll(52,0,1.01),t=>fade(t,402,422),{off:[60,30]});
label('<b style="color:#6fdcff">huso −1</b>',()=>ll(40,-15,1.01),t=>fade(t,410.5,422));
label('<b>Canarias</b><small>huso −1 · usa UTC+0</small>',()=>ll(...CITIES.canarias,1.01),t=>fade(t,410.8,422),{off:[0,-56]});
label('<span style="color:#6ee7a0">Greenwich 0°</span>',()=>ll(47,0,1.01),t=>fade(t,401,422),{off:[70,0]});
// tilt
label('<span style="color:#ffd23f">23,5°</span>',()=>{const a=tiltK(431)*D2R/2;return new THREE.Vector3(-Math.sin(a)*1.42,Math.cos(a)*1.42,0);},t=>fade(t,428.5,436.6),{space:'world',occl:false});
label('vertical',()=>new THREE.Vector3(0,1.35,0),t=>fade(t,425,436.6),{space:'world',occl:false,off:[-70,0]});
label('eje inclinado',()=>new THREE.Vector3(Math.sin(23.5*D2R)*1.3,Math.cos(23.5*D2R)*1.3,0),t=>fade(t,429,436.6),{space:'world',occl:false,off:[110,0]});

// ---------- update ----------
const els={title:document.getElementById('title'),formula:document.getElementById('formula'),clocks:document.getElementById('clocks'),
 summary:document.getElementById('summary'),end:document.getElementById('end'),fade:document.getElementById('fade'),bar:document.getElementById('bar'),ctr:document.getElementById('ctr')};
const lis=[...document.querySelectorAll('#summary li')];
window.TOTAL=TOTAL;
const ZERO=new THREE.Vector3();
window.setTime=function(t){
 const orbitOn=t>=ORBIT_T0&&t<ORBIT_T1;
 earth.visible=!orbitOn;atm.visible=!orbitOn;orbit.visible=orbitOn;cone.visible=false;
 if(orbitOn){
  const ep=orbPos(t);miniTilt.position.copy(ep);miniSpin.rotation.y=t*0.7;
  miniMat.uniforms.lightDir.value.copy(ep).negate().normalize();
  const F=followF(t);const tgt=ep.clone().multiplyScalar(1-1.45/ORB);const fpos=tgt.clone().add(new THREE.Vector3(fox(t),.6,foz(t)));
  camera.position.copy(OVER).lerp(fpos,F);camera.up.set(0,1,0);camera.lookAt(ZERO.clone().lerp(tgt,F));
  rays.rotation.y=orbA(t)*D2R;rayMat.opacity=rayOp(t)*F*.85;rays.visible=rayMat.opacity>.01;
  ring.material.opacity=.35*(1-F);refLine.visible=false;tiltArc.visible=false;arrowArc.visible=false;camOff.x=0;camera.setViewOffset(W,H,0,95+90*(1-F),W,H);camera.updateMatrixWorld();
 } else {
 const lon=cam.lon(t),lat=cam.lat(t),dist=cam.dist(t);
 camera.position.copy(ll(lat,lon,dist));camera.up.set(0,1,0);camera.lookAt(0,0,0);
 camOff.x=-cam.offX(t);
 camera.setViewOffset(W,H,camOff.x,camOff.y,W,H);camera.updateMatrixWorld();
 earth.rotation.y=earthRot(t)*D2R;earth.rotation.z=tiltK(t)*D2R;earth.updateMatrixWorld(true);
 const head=camera.position.clone().normalize().applyAxisAngle(new THREE.Vector3(0,1,0),-.5).add(new THREE.Vector3(0,.35,0)).normalize();
 const sm=sunMix(t);U.lightDir.value.copy(head).lerp(SUNDIR,sm).normalize();U.ambient.value=.5+(nightAmb(t)-.5)*sm;
 const transp=fade(t,166.5,250.5,1.2);U.opacity.value=1-.62*transp;earthMat.depthWrite=transp<.01;
 U.hemiNS.value=fade(t,45.5,59.8,1);U.hemiEW.value=fade(t,154,166,1);U.climate.value=fade(t,88,100,1);
 U.zones.value=Math.max(fade(t,333,373,1.2),fade(t,372,399,1)*.55,fade(t,398,422.5,1)*.8);
 U.zoneHi.value=0;U.zoneHiAmt.value=Math.max(fade(t,346,358),fade(t,402,422));U.zoneHi2Amt.value=fade(t,410.3,422);
 atm.material.uniforms.s.value=1-.7*transp;
 setTube(axis,Math.max(fade(t,11,33),fade(t,423,436.8)),prog(t,11,13));setTube(arrowArc,fade(t,24,33),prog(t,24,25.5));cone.material.opacity=fade(t,25,33);cone.visible=cone.material.opacity>.01;
 setTube(refLine,fade(t,424.5,436.8)*.5,1);
 const tl=tiltK(t);tiltArc.set('tilt'+tl.toFixed(2),()=>new FnCurve(u=>new THREE.Vector3(Math.sin(-tl*u*D2R)*1.22,Math.cos(tl*u*D2R)*1.22,0)),fade(t,425,436.8)*(Math.abs(tl)>.5?1:0),32);
 const eqOp=Math.max(fade(t,34,100),fade(t,424.3,436.8),fade(t,166,206.5),fade(t,206,250.5),fade(t,250,310.5),fade(t,511.8,560));setTube(equator,eqOp,t<100?prog(t,34.5,38.5):1);
 PARS.forEach((p,i)=>{const o=Math.max(fade(t,62+i*.45,101)*(t>73?.35+.65*(1-prog(t,73,74.5)):1),fade(t,511.8,560)*.5);setTube(p.m,o,t<75?prog(t,62+i*.45,64+i*.45):1);});
 special.forEach((m,i)=>setTube(m,fade(t,73,101),t<100?prog(t,73.5,75.5):1));
 MERS.forEach((m,i)=>{const o=Math.max(fade(t,101.5+i*.18,128)*(t>113?.3:1)*(t>127?0:1),fade(t,127,166)*.32,fade(t,511.8,560)*.5);setTube(m.m,o,t<115?prog(t,101.5+i*.18,103.5+i*.18):1);});
 setTube(pinkA,fade(t,113.5,127),prog(t,113.5,115.5));setTube(pinkB,fade(t,113.5,127),prog(t,115.2,117.2));
 setTube(greenwich,Math.max(fade(t,129.5,166.5),fade(t,206.5,250)*.55,fade(t,250,310.5),fade(t,321.8,333),fade(t,333,373)*.9,fade(t,398,422.5),fade(t,511.8,560)),t<140?prog(t,129.5,132):1);
 setTube(m180,Math.max(fade(t,160.5,166.5),fade(t,375.5,399)),t<170?prog(t,160.5,162.5):prog(t,375.5,378.5));
 // latitude / longitude construction
 const angOn=fade(t,168,193.8),angOn2=fade(t,208,231);
 center.material.opacity=Math.max(angOn,angOn2);center.visible=center.material.opacity>.01;
 const la=latP(t),lo=lonP(t);
 merDisc.material.opacity=angOn*.13;merDisc.visible=angOn>.003;eqDisc.material.opacity=angOn2*.2;eqDisc.visible=angOn2>.003;
 if(angOn>.003){rayA.material.color.set(0xffffff);rayB.material.color.set(0xff5a5a);arc.material.color.set(0xff8a3d);wedgeM.material.color.set(0xff8a3d);rayA.set('A',()=>new FnCurve(u=>ll(0,-4,u*1.01)),angOn,4);rayB.set('B'+la.toFixed(2),()=>new FnCurve(u=>ll(la,-4,u*1.01)),angOn,4);
  arc.set('C'+la.toFixed(2),()=>new FnCurve(u=>ll(la*u,-4,.55)),angOn*(Math.abs(la)>1?1:0),48);wedgeM.set(u=>u===0&&false?ZERO:ll(la*u,-4,.55),angOn*.38);wedgeM.geometry.attributes.position.setXYZ(0,0,0,0);}
 else if(angOn2>.003){rayA.material.color.set(0x4ade80);rayB.material.color.set(0xff5a5a);arc.material.color.set(0x3fc8ff);wedgeM.material.color.set(0x3fc8ff);rayA.set('A2',()=>new FnCurve(u=>ll(0,0,u*1.01)),angOn2,4);rayB.set('B2'+lo.toFixed(2),()=>new FnCurve(u=>ll(0,lo,u*1.01)),angOn2,4);
  arc.set('C2'+lo.toFixed(2),()=>new FnCurve(u=>ll(0,lo*u,.6)),angOn2*(Math.abs(lo)>1?1:0),64);wedgeM.set(u=>ll(0,lo*u,.6),angOn2*.38);wedgeM.geometry.attributes.position.setXYZ(0,0,0,0);}
 else{rayA.set('',null,0);rayB.set('',null,0);arc.set('',null,0);wedgeM.set(null,0);}
 hiMer.set(t<206?'mer-4':'mer-100',()=>t<206?lonCurve(-4,1.006):lonCurve(-100,1.006),t<206?fade(t,168,194)*.8:fade(t,231.5,250),160);
 hiPar.set('par40',()=>latCurve(40,1.006),fade(t,194,206),200);
 P.visible=Math.max(fade(t,167.5,206),fade(t,207.5,250))>.01;P.material.opacity=Math.max(fade(t,167.5,206),fade(t,207.5,250));P.position.copy(Ppos(t));
 if(t>=511.8){const on=fade(t,511.8,560);const lv=k=>on*sVis(t,k)*(.4+.6*sEmph(t,k));
  setTube(equator,lv(0)*1.2,1);PARS.forEach(p=>setTube(p.m,lv(2)*.8,1));
  special.forEach((m,i)=>setTube(m,i<2?on*sEmph(t,1):0,1));setTube(axis,on*sEmph(t,1),1);
  MERS.forEach(m=>{m.m.material.color.set(0xff8fc0);setTube(m.m,lv(3)*.75,1);});setTube(greenwich,lv(3)*1.3,1);
  U.zones.value=on*sVis(t,5)*.85;U.zoneHiAmt.value=0;U.zoneHi2Amt.value=0;}
 else MERS.forEach(m=>m.m.material.color.set(0xd8ecff));
 // coordinate rigs
 for(const r of RIGS){const o=r.op(t);setTube(r.latArc,o,prog(t,r.t0+1,r.t0+2.6));setTube(r.lonArc,o,prog(t,r.t0+2.8,r.t0+4.3));setTube(r.par,o*.7,1);setTube(r.mer,o*.7,1);}
 // pins
 const cd=dist;
 const pv={greenwich:fade(t,142,153),madrid:Math.max(fade(t,252.5,287.5),fade(t,401,422)),sevilla:Math.max(fade(t,276.5,287.5),fade(t,531.8,548.6)),ba:fade(t,288.5,298.5),tokyo:Math.max(fade(t,299,310.5),fade(t,359.5,373)),
  london:fade(t,359.5,373),moscow:fade(t,359.5,373),ny:fade(t,359.5,373),canarias:fade(t,410.5,422)};
 for(const k in pins){pins[k].material.opacity=pv[k];pins[k].visible=pv[k]>.01;pins[k].scale.setScalar(Math.min(1,(cd-1)/3.2));}
 }
 // cards
 els.title.style.opacity=fade(t,-1,8.6,1);els.formula.style.opacity=fade(t,322.5,332.5);
 const step=Math.max(0,Math.round((earthRot(t)-150)/15));els.ctr.textContent=t<322.5?'':`${step} h → ${step*15}°`;
 els.clocks.style.opacity=fade(t,360,373);els.summary.style.opacity=fade(t,512.5,548.5);
 lis.forEach((li,i)=>li.style.opacity=sVis(t,i)*(.55+.45*sEmph(t,i)));
 els.end.style.opacity=fade(t,548.6,556);
 els.fade.style.opacity=Math.max(clamp(1-Math.abs(t-436.8)/.6),clamp(1-Math.abs(t-511.8)/.6),ease((t-553.4)/1.5));
 
 const c=CAPS.find(c=>t>=c[0]&&t<c[1]);const ch=SECTIONS.find(s=>t>=s[0]&&t<s[1]);
 if(c!==lastCap){cap.innerHTML=c?'<div>'+c[2]+'</div>':'';lastCap=c;}
 cap.style.opacity=c?fade(t,c[0],c[1],.45):0;
 if(ch!==lastChip){chip.innerHTML=ch?`<span>${ch[2]}</span>${ch[3]}`:'';lastChip=ch;}
 chip.style.opacity=ch?fade(t,ch[0],ch[1],.6):0;
 renderer.render(scene,camera);updateLabels(t);
};
await document.fonts.ready;
window.setTime(0);window.ready=true;
