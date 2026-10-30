# Kit del asesor

Portal de formación para asesores comerciales. Sitio 100 % estático: sin login, sin instalación, sin backend. Publicado en https://desarrollador.click (GitHub Pages).

## Herramientas

| Ruta | Herramienta | Contenido editable |
|---|---|---|
| `#/` | Inicio: buscador inteligente, menú y tip del día | — |
| `#/equipo` | Conoce tu equipo: smartphone 3D con 13 especificaciones y recorrido guiado | `data/especificaciones.json` |
| `#/mesa` | Cuida la mesa: mesa de exhibición 3D, ¿qué hago si…?, ¿puedo usar esto?, 5 pasos, quién hace qué y reporte de novedades | `data/mesa.json` |
| `#/prueba` | Ponte a prueba: 10 preguntas al azar con explicación y récord | `data/prueba.json` |
| `#/frases` | Frases de venta con copiar y modo práctica | `data/especificaciones.json` (campo `frase`) |

Cada especificación, zona y situación tiene su propio enlace para compartir, por ejemplo `desarrollador.click/#/equipo/bateria` o `desarrollador.click/#/mesa/derrame`.

## Estructura

```
index.html                 estructura del portal
css/app.css                estilos generales (paleta plana: azul #1E5EFF, verde #00D68F, cian, amarillo, tinta)
css/equipo.css             estilos de Conoce tu equipo y popups
data/*.json                TEXTOS EDITABLES
js/main.js                 rutas, inicio y buscador inteligente (sinónimos en SINONIMOS)
js/equipo.js · escena3d.js · vista2d.js · zonas.js   Conoce tu equipo
js/mesa.js · mesa3d.js     Cuida la mesa
js/prueba.js · frases.js   Ponte a prueba y Frases de venta
js/util.js                 utilidades compartidas
js/vendor/three.min.js     Three.js r187 (solo los módulos usados)
scripts/three-entrada.js   para regenerar el bundle de Three.js
```

## Editar textos

Abre el JSON en GitHub, toca el lápiz, cambia solo lo que está entre comillas y guarda. No cambies los campos `id`, `categoria` ni `zona`. En `prueba.json`, `correcta` es la posición de la respuesta correcta empezando en 0. El cambio se ve al recargar la página.

## Probar en tu computador

```
python3 -m http.server 8000
```
Abre http://localhost:8000. Para forzar las versiones 2D: `http://localhost:8000/?modo=2d#/equipo`.

## Versiones y caché

GitHub Pages guarda los archivos hasta 10 minutos en el navegador. Cada archivo de código se carga con `?v=AAAAMMDDx`; al cambiar código, actualiza ese número en todos los archivos (búscalo con "v=2026") para que todos reciban la versión nueva de inmediato. Los JSON de textos siempre se piden frescos.

## Regenerar Three.js (solo si cambias de versión)

```
npm install three esbuild
npx esbuild scripts/three-entrada.js --bundle --format=esm --minify --target=es2020,safari15,chrome90,firefox90,edge90 --outfile=js/vendor/three.min.js
```

## Publicación

GitHub Pages (rama `main`, carpeta raíz) con dominio propio `desarrollador.click`. DNS en Hostinger: 4 registros A a 185.199.108–111.153 y `www` como CNAME a `dtorh-pro.github.io`. HTTPS forzado.
