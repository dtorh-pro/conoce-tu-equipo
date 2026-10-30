# Portal de formación

Portal de formación comercial. Sitio 100 % estático: sin login, sin instalación, sin backend. Publicado en https://desarrollador.click (GitHub Pages).

## Herramientas

| Ruta | Herramienta | Contenido editable |
|---|---|---|
| `#/` | Inicio: herramientas, ilustración, accesos directos con íconos y tip del día (sin cabecera ni barra inferior) | — |
| `#/equipo` | Conoce tu equipo: pantalla completa con el smartphone 3D (reverso blanco, borde plateado), puntos animados con ícono y recorrido guiado (botón ▶) | `data/especificaciones.json` |
| `#/mesa` | Cuida la mesa: mesa de exhibición 3D, ¿qué hago si…?, ¿puedo usar esto? y limpieza en 5 pasos | `data/mesa.json` |
| `#/frases` | Frases de venta con copiar y modo práctica | `data/especificaciones.json` (campo `frase`) |

Cada sección muestra solo un botón **Atrás** y su nombre arriba. Cada especificación, zona y situación tiene su propio enlace para compartir, por ejemplo `desarrollador.click/#/equipo/bateria` o `desarrollador.click/#/mesa/derrame`.

## Estructura

```
index.html                 estructura del portal
css/app.css                estilos generales (escala de azules planos, tipografía Geist)
css/equipo.css             estilos de Conoce tu equipo y popups
data/*.json                TEXTOS EDITABLES
js/main.js                 rutas, inicio y barra de sección (Atrás + nombre)
js/equipo.js · escena3d.js · vista2d.js · zonas.js   Conoce tu equipo
js/mesa.js · mesa3d.js     Cuida la mesa
js/frases.js               Frases de venta
js/util.js                 utilidades compartidas
js/vendor/three.min.js     Three.js r187 (solo los módulos usados)
scripts/three-entrada.js   para regenerar el bundle de Three.js
```

## Editar textos

Abre el JSON en GitHub, toca el lápiz, cambia solo lo que está entre comillas y guarda. No cambies los campos `id`, `categoria` ni `zona`. El cambio se ve al recargar la página.

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
