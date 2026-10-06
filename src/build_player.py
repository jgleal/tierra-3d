import base64,subprocess,re,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ROOT='..'
b64=lambda p:base64.b64encode(open(p,'rb').read()).decode()
css=open('p_css.css').read(); ui=open('p_ui.html').read(); js=open('p_main.js').read(); pl=open('p_player.js').read()
for w in ('400','700','900'):
    css=css.replace(f"url(node_modules/@fontsource/nunito/files/nunito-latin-{w}-normal.woff2)",f"url(data:font/woff2;base64,{b64(f'../node_modules/@fontsource/nunito/files/nunito-latin-{w}-normal.woff2')})")
css=css.replace("html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#02040c;font-family:N,sans-serif;color:#fff}",
"""html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#02040c;color:#fff;font-family:N,'Nunito',system-ui,sans-serif;color-scheme:dark}
:root{padding:0!important}
[hidden]{display:none!important}
#stage{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;overflow:hidden;background:#02040c;cursor:pointer}
#pl-bar{position:fixed;left:0;right:0;bottom:0;padding:10px 16px calc(12px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:12px;flex-wrap:wrap;
 background:linear-gradient(to top,rgba(2,4,12,.95),rgba(2,4,12,.75) 70%,rgba(2,4,12,0));font:600 15px/1.2 N,system-ui,sans-serif;color:#e8eefc;transition:opacity .35s;z-index:5}
#pl-bar.hide{opacity:0;pointer-events:none}
#pl-bar button,#pl-bar select{font:inherit;color:#e8eefc;background:rgba(255,255,255,.08);border:1px solid rgba(160,200,255,.28);border-radius:10px;padding:7px 12px;cursor:pointer}
#pl-bar button:hover,#pl-bar select:hover{background:rgba(255,255,255,.16)}
#pl-bar :focus-visible{outline:2px solid #ffd23f;outline-offset:2px}
#pl-play{min-width:48px;font-size:16px!important}
#pl-mus.off{opacity:.5;text-decoration:line-through}
#pl-track{position:relative;flex:1 1 260px;min-width:0;display:flex;align-items:center}
#pl-seek{width:100%;accent-color:#ffd23f;margin:0}
#pl-ticks{position:absolute;left:8px;right:8px;top:-6px;height:4px;pointer-events:none}
#pl-ticks i{position:absolute;top:0;width:2px;height:6px;background:rgba(160,200,255,.6)}
#pl-time{font-variant-numeric:tabular-nums;min-width:96px;text-align:center}
#pl-sec{max-width:260px}
#pl-vol{width:80px;accent-color:#7fd3ff}
#pl-start{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12vh;z-index:6;background:rgba(2,4,12,.25);border:0;cursor:pointer}
#pl-start span{font:900 26px/1 N,system-ui,sans-serif;color:#02040c;background:#ffd23f;padding:18px 34px;border-radius:40px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
@media (max-width:700px){#pl-vol,#pl-spd{display:none}#pl-sec{max-width:150px}}
@media (prefers-reduced-motion:reduce){#pl-bar{transition:none}}""")
js=js.replace("import * as THREE from './node_modules/three/build/three.module.js';","import * as THREE from 'three';")
js=js.replace("document.body.insertBefore(renderer.domElement,document.body.firstChild);","document.getElementById('stage').insertBefore(renderer.domElement,document.getElementById('stage').firstChild);")
js=js.replace("loadAsync('earth.jpg')","loadAsync(window.__EARTH)")
js=js.replace("window.setTime(0);window.ready=true;","window.setTime(0);window.ready=true;\n"+pl)
open('p_bundle_in.js','w').write(js)
subprocess.run(['npx','--prefix','..','esbuild','p_bundle_in.js','--bundle','--format=esm','--minify','--target=es2022','--outfile=p_bundle.js','--log-level=warning'],check=True)
bundle=open('p_bundle.js').read().replace('</script','<\\/script')
earth='data:image/jpeg;base64,'+b64('../assets/earth_small.jpg')
music=b64('../assets/music_small.mp3')
bar='''<div id="pl-bar" role="toolbar" aria-label="Controles del vídeo">
 <button id="pl-play" type="button" aria-label="Reproducir">▶</button>
 <div id="pl-track"><div id="pl-ticks"></div><input id="pl-seek" type="range" min="0" step="0.1" value="0" aria-label="Posición"></div>
 <span id="pl-time">0:00 / 9:12</span>
 <select id="pl-sec" aria-label="Ir a la sección"></select>
 <select id="pl-spd" aria-label="Velocidad"><option value="0.75">0,75×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option></select>
 <button id="pl-mus" type="button" aria-pressed="true" title="Música (M)">♪ Música</button>
 <input id="pl-vol" type="range" min="0" max="1" step="0.05" value="0.6" aria-label="Volumen de la música">
 <button id="pl-fs" type="button" title="Pantalla completa (F)">⛶</button>
</div>
<button id="pl-start" type="button" aria-label="Comenzar"><span>▶ Comenzar</span></button>'''
body=f'''<div id="stage">{ui}</div>
{bar}
<script>window.__EARTH="{earth}";window.__MUSIC="{music}";</script>
<script type="module">{bundle}</script>'''
head='<title>¿Dónde estoy en la Tierra?</title>\n<style>'+css+'</style>\n'
open('../index.html','w').write('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+head+'</head><body>\n'+body+'\n</body></html>')

