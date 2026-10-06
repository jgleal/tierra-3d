# ¿Dónde estoy en la Tierra?

Animación 3D interactiva para **Geografía de 1.º de ESO**. Sin voz: textos explicativos en pantalla, con tiempo para leerlos, y música de fondo muy tenue.

**▶ Verla:** abre la página de GitHub Pages de este repositorio (o el archivo `index.html` en cualquier navegador; funciona sin conexión).

## Contenido (≈ 9 min)

1. El eje y los polos
2. El ecuador
3. La inclinación del eje y las estaciones (traslación, solsticios y equinoccios)
4. Los paralelos (trópicos, círculos polares y zonas climáticas)
5. Los meridianos
6. El meridiano de Greenwich
7. La latitud
8. La longitud
9. Las coordenadas geográficas (Madrid, Sevilla, Buenos Aires, Tokio)
10. Los husos horarios
11. La línea internacional de cambio de fecha
12. Curiosidad: la hora en España (península y Canarias)
13. Resumen

## Controles

| Acción | Ratón / táctil | Teclado |
|---|---|---|
| Reproducir / pausar | botón ▶ o clic en la imagen | Espacio |
| Avanzar / retroceder 5 s | barra de progreso | → / ← |
| Ir a una sección | menú de secciones | |
| Velocidad (0,75×–1,5×) | menú de velocidad | |
| Música on/off y volumen | botón ♪ y deslizador | M |
| Pantalla completa | botón ⛶ | F |

## Estructura del repositorio

```
index.html              ← página final, autocontenida (es lo que publica GitHub Pages)
src/p_main.js           ← escena 3D (three.js), guion, textos y línea de tiempo
src/p_player.js         ← reproductor: orden de secciones, controles y música (Web Audio)
src/p_ui.html, p_css.css← tarjetas, rótulos y estilos
src/build_player.py     ← empaqueta todo en index.html (JS, fuentes, textura y música en línea)
src/gen_texture.html    ← genera la textura de la Tierra a partir de Natural Earth (world-atlas)
src/music.py            ← sintetiza la música ambiental (original, sin derechos de terceros)
assets/                 ← textura de la Tierra y música
```

## Regenerar `index.html`

Requisitos: Node 18+ y Python 3.

```bash
npm install
npm run build
```

Para cambiar textos o tiempos, edita `CAPS` (textos) y las pistas de animación en `src/p_main.js`; el orden de las secciones está en `SEGS` dentro de `src/p_player.js`.

## Créditos

- Motor 3D: [three.js](https://threejs.org) (MIT)
- Datos cartográficos: [Natural Earth](https://www.naturalearthdata.com) vía [world-atlas](https://github.com/topojson/world-atlas) (dominio público)
- Tipografía: Nunito (SIL Open Font License)
- Música: generada por código para este proyecto
