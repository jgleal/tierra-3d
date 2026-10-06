// ---------- player (playback time -> content time remap) ----------
const SEGS=[[0,33],[33,60],[424.5,436.8],[436.8,511.8],[60,422],[511.8,555]];
const PS=[];{let acc=0;for(const [a,b] of SEGS){PS.push([acc,a,b]);acc+=b-a;}}
const PTOTAL=PS[PS.length-1][0]+SEGS[SEGS.length-1][1]-SEGS[SEGS.length-1][0];
const p2c=tp=>{for(let i=PS.length-1;i>=0;i--){if(tp>=PS[i][0])return Math.min(PS[i][2]-1e-4,PS[i][1]+(tp-PS[i][0]));}return 0;};
const c2p=c=>{for(const [ps,a,b] of PS)if(c>=a&&c<b)return ps+(c-a);let best=null;for(const [ps,a] of PS)if(a>c&&(best===null||a<best[1]))best=[ps,a];return best?best[0]:0;};
const CUTS=PS.slice(1).map(x=>x[0]);
const stage=document.getElementById('stage');
const $=id=>document.getElementById(id);
const btnPlay=$('pl-play'),seek=$('pl-seek'),tcur=$('pl-time'),selSec=$('pl-sec'),btnMus=$('pl-mus'),vol=$('pl-vol'),spd=$('pl-spd'),btnFs=$('pl-fs'),bar=$('pl-bar'),start=$('pl-start'),ticks=$('pl-ticks'),fadeEl=$('fade'),pbar=$('bar');
const seen=new Set();const ALLSEC=[[0,'Inicio']];
for(const s of SECTIONS){if(seen.has(s[2]))continue;seen.add(s[2]);ALLSEC.push([c2p(s[0]),s[2]+'. '+s[3]]);}
ALLSEC.push([c2p(511.8),'Resumen']);ALLSEC.sort((a,b)=>a[0]-b[0]);
for(const [t0,name] of ALLSEC){const o=document.createElement('option');o.value=t0;o.textContent=name;selSec.appendChild(o);
 const k=document.createElement('i');k.style.left=(t0/PTOTAL*100)+'%';ticks.appendChild(k);}
seek.max=PTOTAL;
let T=0,playing=false,last=0,musicOn=true,idle=0;
const fmt=x=>{x=Math.max(0,Math.floor(x));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0');};
function fit(){const s=Math.min(innerWidth/1920,innerHeight/1080);stage.style.transform=`translate(${(innerWidth-1920*s)/2}px,${(innerHeight-1080*s)/2}px) scale(${s})`;}
addEventListener('resize',fit);fit();
// ---- music via Web Audio ----
let actx=null,mbuf=null,master=null,src=null,srcG=null,sCtx=0,sT=0,decoding=false;
function initAudio(){if(actx)return;try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
 master=actx.createGain();master.gain.value=+vol.value;master.connect(actx.destination);
 const bin=atob(window.__MUSIC);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
 decoding=true;actx.decodeAudioData(u8.buffer,b=>{mbuf=b;decoding=false;syncAudio();},()=>{decoding=false;});}
function stopSrc(){if(!src)return;const n=actx.currentTime;try{srcG.gain.setTargetAtTime(0,n,.03);src.stop(n+.2);}catch(e){}src=null;}
function syncAudio(){if(!actx)return;if(actx.state==='suspended'&&playing)actx.resume().catch(()=>{});
 stopSrc();if(!mbuf||!musicOn||!playing||T>=mbuf.duration-.05)return;
 src=actx.createBufferSource();src.buffer=mbuf;src.playbackRate.value=+spd.value;srcG=actx.createGain();srcG.gain.value=0;
 src.connect(srcG);srcG.connect(master);const n=actx.currentTime;srcG.gain.setTargetAtTime(1,n,.05);src.start(n,T);sCtx=n;sT=T;}
const audioClock=()=>src&&actx&&actx.state==='running'?sT+(actx.currentTime-sCtx)*(+spd.value):null;
// ----
function render(){const c=p2c(T);setTime(c);let d=0;for(const x of CUTS)d=Math.max(d,1-Math.abs(T-x)/.5);
 if(d>0)fadeEl.style.opacity=Math.max(+fadeEl.style.opacity||0,d);pbar.style.width=(T/PTOTAL*100)+'%';}
function setPlaying(p){playing=p&&T<PTOTAL;btnPlay.textContent=playing?'❚❚':'▶';btnPlay.setAttribute('aria-label',playing?'Pausar':'Reproducir');last=performance.now();initAudio();syncAudio();wake();}
function go(t){T=Math.max(0,Math.min(PTOTAL,t));render();updUI();syncAudio();}
function updUI(){seek.value=T;tcur.textContent=fmt(T)+' / '+fmt(PTOTAL);
 let cur=0;ALLSEC.forEach((s,i)=>{if(T>=s[0]-.05)cur=i;});if(selSec.selectedIndex!==cur)selSec.selectedIndex=cur;}
function loop(now){if(playing){const ac=audioClock();T=ac!==null?ac:T+Math.min(.1,(now-last)/1000)*(+spd.value);
 if(T>=PTOTAL){T=PTOTAL;setPlaying(false);}render();updUI();}
 last=now;if(playing&&now-idle>2600)bar.classList.add('hide');requestAnimationFrame(loop);}
function wake(){idle=performance.now();bar.classList.remove('hide');}
btnPlay.onclick=()=>{start.hidden=true;if(T>=PTOTAL)go(0);setPlaying(!playing);};
seek.oninput=()=>go(+seek.value);
selSec.onchange=()=>{go(+selSec.value+.01);};
btnMus.onclick=()=>{musicOn=!musicOn;btnMus.classList.toggle('off',!musicOn);btnMus.setAttribute('aria-pressed',String(musicOn));initAudio();syncAudio();};
vol.oninput=()=>{if(master)master.gain.value=+vol.value;};
spd.onchange=()=>{T=audioClock()??T;syncAudio();};
btnFs.onclick=()=>{try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});}catch(e){}};
start.onclick=()=>{start.hidden=true;setPlaying(true);};
addEventListener('mousemove',wake);addEventListener('touchstart',wake,{passive:true});
stage.addEventListener('click',()=>{if(start.hidden)setPlaying(!playing);});
addEventListener('keydown',e=>{if(e.target.tagName==='SELECT'||e.target.tagName==='INPUT'&&e.target.type!=='range')return;
 if(e.code==='Space'){e.preventDefault();start.hidden=true;setPlaying(!playing);}
 else if(e.code==='ArrowRight'){e.preventDefault();go(T+5);}else if(e.code==='ArrowLeft'){e.preventDefault();go(T-5);}
 else if(e.key==='m'||e.key==='M')btnMus.click();else if(e.key==='f'||e.key==='F')btnFs.click();wake();});
window.__player={go,get T(){return T},get playing(){return playing},audio:()=>({state:actx&&actx.state,buf:!!mbuf,src:!!src})};
go(0);requestAnimationFrame(loop);
