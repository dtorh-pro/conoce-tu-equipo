# Conoce tu equipo · Smartphone 3D de formación

Herramienta web para que asesores comerciales entiendan y expliquen las especificaciones de un smartphone. Sitio 100 % estático: sin login, sin instalación, sin backend.

## Estructura

```
(raíz del repositorio = sitio publicado)
├── index.html
├── favicon.svg
├── CNAME                    ← dominio personalizado (GitHub Pages)
├── .nojekyll
├── css/estilos.css
├── data/especificaciones.json   ← TEXTOS EDITABLES
└── js/
    ├── app.js               ← etiquetas, popup, recorrido guiado, elección 3D/2D
    ├── escena3d.js          ← modelo 3D propio, giro, acercamiento de cámara
    ├── vista2d.js           ← versión 2D de respaldo (sin WebGL)
    ├── zonas.js             ← dónde apunta cada especificación (3D y 2D)
    └── vendor/three.min.js  ← Three.js r187 (solo los módulos usados)
scripts/three-entrada.js     ← para regenerar vendor/three.min.js
```

## Editar textos

Abre `data/especificaciones.json` y cambia solo lo que está entre comillas en `etiqueta`, `titulo`, `que_es`, `clave` (baja/media/alta), `beneficio` y `frase`. No cambies `id`, `categoria` ni `zona`. Máximo 80 palabras por popup. Guarda y vuelve a subir ese archivo: el cambio se ve al recargar.

Zonas disponibles: `pantalla`, `pantalla-sistema`, `camara-frontal`, `camara-trasera`, `interior-procesador`, `interior-ram`, `interior-almacenamiento`, `interior-bateria`, `parlantes`, `borde-superior`, `lateral-sim`, `lateral-huella`, `cuerpo`.

## Probar en tu computador

```
python3 -m http.server 8000
```
Abre http://localhost:8000 (abrir el index.html con doble clic no carga el JSON). Para forzar la vista 2D: http://localhost:8000/?modo=2d

## Regenerar Three.js (solo si cambias de versión)

```
npm install three esbuild
npx esbuild scripts/three-entrada.js --bundle --format=esm --minify --target=es2020,safari15,chrome90,firefox90,edge90 --outfile=js/vendor/three.min.js
```

## Publicar gratis con tu dominio (GitHub Pages + DNS en Hostinger)

1. Crea un repositorio público en GitHub (por ejemplo `conoce-tu-equipo`) y sube estos archivos a la raíz del repositorio.
2. En el repositorio: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
3. En **Custom domain** escribe `desarrollador.click` y guarda (el archivo `CNAME` ya lo trae).
4. En Hostinger: **hPanel → Dominios → desarrollador.click → DNS / Nameservers**:
   - Borra los registros `A` y `CNAME` existentes para `@` y `www` (los de "parking").
   - Crea 4 registros `A` para `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - Crea un `CNAME` para `www` apuntando a `TU-USUARIO.github.io`.
5. Espera la propagación (de minutos a unas horas). En GitHub Pages marca **Enforce HTTPS** cuando se habilite.
6. Comparte el enlace `https://desarrollador.click` por WhatsApp o correo.

Alternativa sin GitHub: Netlify → "Add new site → Deploy manually" y arrastra la carpeta del proyecto; luego en Domain settings agrega `desarrollador.click` y sigue los registros DNS que indique.

## Versiones y caché

GitHub Pages guarda los archivos hasta 10 minutos en el navegador. Cada archivo de código se carga con `?v=AAAAMMDDx`; al cambiar código, actualiza ese número en `index.html`, `js/app.js`, `js/escena3d.js` y `js/vista2d.js` para que todos reciban la versión nueva de inmediato. El JSON de textos siempre se pide fresco (no necesita versión).
