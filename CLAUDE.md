# Cómo trabajamos en este proyecto

Portal de formación publicado en https://desarrollador.click (GitHub Pages, rama `main`, raíz). Dueño: David Torres.

## Forma de trabajo
- Responder siempre en español de Colombia, directo y breve.
- Claude actúa como socio: aplica los cambios, los prueba, hace commit, `git push` a `main` y verifica en línea, sin pedir permiso para cada paso. Al final, resumen corto de lo que cambió.
- Si una petición es ambigua, tomar la lectura más razonable, hacerla y decir en una línea qué se decidió. Preguntar solo si el cambio no se puede deshacer.
- No dejar cosas a medias: si se elimina algo de la interfaz, limpiar también su JS, CSS y README.

## Reglas de diseño (decididas por David)
- Sin nombre de portal, sin header, sin buscador, sin barra inferior. Inicio = solo 3 opciones (Conoce tu equipo, Cuida la mesa, Frases de venta). Cada sección: botón "‹ Atrás" + nombre.
- Lenguaje neutral: no usar "asesor", "Zona Costa", ni regiones.
- Colores planos, escala de azules (tokens en `css/app.css`: --azul #1E5EFF, --cielo #28B4FF, --indigo #4F46E5, --tinta #0A1A3F, --papel #F3F7FF). Nada de degradados en botones ni en la interfaz.
- Fuente Geist, estilo moderno y minimalista, animaciones suaves.
- Teléfono 3D: reverso blanco brillante, borde plateado, sin logos; fondo de pantalla verde→azul. Solo puntos animados con ícono (sin etiquetas de texto). No cambiar su tamaño ni diseño sin que se pida.
- Nunca marcas ni modelos reales en textos.
- Mobile-first: debe verse bien a 360 px.

## Técnica
- Sitio estático, sin backend. Three.js r187 recortado en `js/vendor/three.min.js`.
- Textos editables: `data/especificaciones.json` y `data/mesa.json`.
- Al cambiar CSS o JS, subir la versión `?v=AAAAMMDDx` en `index.html` y en todos los imports de `js/*.js` (evita caché vieja).
- Antes de publicar: probar con Playwright (Chromium) a 360×740 y 1366×800: sin scroll horizontal, los 13 puntos abren su popup, recorrido guiado funciona, botón Atrás vuelve al inicio, versión 2D (`?modo=2d#/equipo`) funciona.
- Después de publicar: comprobar en https://desarrollador.click que el cambio está en línea.
- Commits en español.
