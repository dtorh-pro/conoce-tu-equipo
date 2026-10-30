/* ============================================================
   APP: carga de datos, etiquetas, popup, recorrido guiado y
   selección de vista (3D con Three.js o respaldo 2D).
   Los textos se editan en data/especificaciones.json
   ============================================================ */
const $ = (s) => document.querySelector(s);

const estado = {
  datos: null,
  specs: [],
  cats: {},
  filtro: null,
  abierta: null,     // spec abierta
  tour: false,
  vista: null,       // objeto con enfocar / desenfocar / filtrar / destruir
  modo: null,        // '3d' | '2d'
  ultimoFoco: null
};

const el = {
  escenario: $('#escenario'), etiquetas: $('#etiquetas'), leyenda: $('#leyenda'),
  cargando: $('#cargando'), popup: $('#popup'), fondo: $('#fondo-popup'),
  cerrar: $('#pp-cerrar'), nav: $('#pp-nav'), ant: $('#pp-ant'), sig: $('#pp-sig'), paso: $('#pp-paso'),
  btnTour: $('#btn-recorrido'), btnVista: $('#btn-vista'), pista: $('#pista')
};

/* ---------- Utilidades ---------- */
function soportaWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
function texto(nodo, valor) { nodo.textContent = valor ?? ''; }

/* ---------- Datos ---------- */
async function cargarDatos() {
  const r = await fetch('data/especificaciones.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('No se pudo leer data/especificaciones.json');
  const datos = await r.json();
  estado.datos = datos;
  datos.categorias.forEach((c, i) => { estado.cats[c.id] = { ...c, orden: i }; });
  // Orden del recorrido: por categoría y luego por el orden del archivo
  estado.specs = datos.especificaciones
    .filter((s) => estado.cats[s.categoria])
    .map((s, i) => ({ ...s, _i: i }))
    .sort((a, b) => (estado.cats[a.categoria].orden - estado.cats[b.categoria].orden) || (a._i - b._i));
  if (datos.meta) {
    texto($('#titulo'), datos.meta.titulo);
    texto($('#subtitulo'), datos.meta.subtitulo);
  }
}

/* ---------- Etiquetas y leyenda ---------- */
function construirEtiquetas() {
  el.etiquetas.innerHTML = '';
  const n = estado.specs.length;
  const mitad = Math.ceil(n / 2);
  estado.specs.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'etiqueta ' + (i < mitad ? 'izq' : 'der');
    b.dataset.id = s.id;
    b.setAttribute('role', 'listitem');
    b.style.setProperty('--c', estado.cats[s.categoria].color);
    b.setAttribute('aria-label', `${s.etiqueta} (${estado.cats[s.categoria].nombre})`);
    b.innerHTML = `<span class="txt"></span>`;
    b.querySelector('.txt').textContent = s.etiqueta;
    b.addEventListener('click', () => { estado.tour = false; abrir(s); });
    s._boton = b;
    s._lado = i < mitad ? 'izq' : 'der';
    el.etiquetas.appendChild(b);
  });
}

function construirLeyenda() {
  el.leyenda.innerHTML = '';
  estado.datos.categorias.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.style.setProperty('--c', c.color);
    b.setAttribute('aria-pressed', 'false');
    b.textContent = c.nombre;
    b.addEventListener('click', () => {
      estado.filtro = estado.filtro === c.id ? null : c.id;
      el.leyenda.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b && !!estado.filtro)));
      aplicarFiltro();
    });
    el.leyenda.appendChild(b);
  });
}

function aplicarFiltro() {
  estado.specs.forEach((s) => {
    const visible = !estado.filtro || s.categoria === estado.filtro;
    s._oculta = !visible;
    s._boton.classList.toggle('oculta', !visible);
  });
  estado.vista?.filtrar?.(estado.filtro);
}

/* ---------- Popup ---------- */
function regionLibre() {
  // Área de pantalla que queda visible con el popup abierto (para centrar el acercamiento)
  const r = el.escenario.getBoundingClientRect();
  const p = el.popup.getBoundingClientRect();
  const escritorio = window.innerWidth >= 900;
  if (escritorio) {
    const ancho = Math.max(200, p.left - r.left);
    return { x: ancho / 2, y: r.height / 2, w: ancho, h: r.height };
  }
  const alto = Math.max(140, p.top - r.top);
  return { x: r.width / 2, y: alto / 2, w: r.width, h: alto };
}

function pintarPopup(s) {
  const cat = estado.cats[s.categoria];
  el.popup.style.setProperty('--c', cat.color);
  texto($('#pp-cat'), cat.nombre);
  texto($('#pp-titulo'), s.titulo || s.etiqueta);
  texto($('#pp-que'), s.que_es);
  texto($('#pp-beneficio'), s.beneficio);
  texto($('#pp-frase'), s.frase ? `“${s.frase}”` : '');
  const ul = $('#pp-gamas');
  ul.innerHTML = '';
  [['baja', 'Baja', 1], ['media', 'Media', 2], ['alta', 'Alta', 3]].forEach(([k, nombre, nivel]) => {
    if (!s.clave?.[k]) return;
    const li = document.createElement('li');
    li.innerHTML = `<span class="g-et"><span class="barras" aria-hidden="true">${[1, 2, 3].map((j) => `<i class="${j <= nivel ? 'on' : ''}"></i>`).join('')}</span>${nombre}</span><span class="g-val"></span>`;
    li.querySelector('.g-val').textContent = s.clave[k];
    li.setAttribute('aria-label', `Gama ${nombre.toLowerCase()}: ${s.clave[k]}`);
    ul.appendChild(li);
  });
  $('#pp-cuerpo').scrollTop = 0;

  // Navegación del recorrido
  el.nav.hidden = !estado.tour;
  if (estado.tour) {
    const i = estado.specs.indexOf(s);
    texto(el.paso, `${i + 1} de ${estado.specs.length}`);
    el.ant.disabled = i === 0;
    texto(el.sig, i === estado.specs.length - 1 ? 'Finalizar ✓' : 'Siguiente →');
  }
}

function abrir(s) {
  if (!estado.abierta) estado.ultimoFoco = document.activeElement;
  estado.abierta = s;
  pintarPopup(s);
  el.popup.hidden = false;
  el.fondo.hidden = false;
  document.body.classList.add('popup-abierto');
  estado.specs.forEach((x) => x._boton.classList.toggle('activa', x === s));
  // Espera un cuadro para medir el popup y luego acerca la cámara
  requestAnimationFrame(() => estado.vista?.enfocar(s, regionLibre()));
  el.cerrar.focus({ preventScroll: true });
}

function cerrar() {
  if (!estado.abierta) return;
  estado.abierta = null;
  estado.tour = false;
  el.popup.hidden = true;
  el.fondo.hidden = true;
  document.body.classList.remove('popup-abierto');
  estado.specs.forEach((x) => x._boton.classList.remove('activa'));
  estado.vista?.desenfocar();
  if (estado.ultimoFoco && document.contains(estado.ultimoFoco)) estado.ultimoFoco.focus({ preventScroll: true });
}

/* ---------- Recorrido guiado ---------- */
function iniciarRecorrido() {
  // El recorrido pasa por todas, sin filtro
  if (estado.filtro) { estado.filtro = null; el.leyenda.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false')); aplicarFiltro(); }
  estado.tour = true;
  abrir(estado.specs[0]);
}
function mover(delta) {
  if (!estado.abierta) return;
  const i = estado.specs.indexOf(estado.abierta) + delta;
  if (i >= estado.specs.length) { cerrar(); return; }
  if (i < 0) return;
  abrir(estado.specs[i]);
}

/* ---------- Vistas ---------- */
async function montarVista(modo) {
  estado.vista?.destruir?.();
  estado.vista = null;
  const comunes = {
    escenario: el.escenario,
    specs: estado.specs,
    cats: estado.cats,
    alSeleccionar: (s) => { estado.tour = false; abrir(s); }
  };
  if (modo === '3d') {
    try {
      const { crearEscena3D } = await import('./escena3d.js');
      // Lienzo nuevo en cada montaje (un contexto WebGL liberado no se reutiliza)
      const viejo = $('#lienzo'); const nuevo = viejo.cloneNode(false); viejo.replaceWith(nuevo);
      estado.vista = await crearEscena3D({ ...comunes, lienzo: $('#lienzo'), lineas: $('#lineas'), marcador: $('#marcador'), capa: el.etiquetas });
      estado.modo = '3d';
    } catch (e) {
      console.warn('3D no disponible, usando versión 2D:', e);
      return montarVista('2d');
    }
  } else {
    const { crearVista2D } = await import('./vista2d.js');
    estado.vista = crearVista2D({ ...comunes, contenedor: $('#vista2d') });
    estado.modo = '2d';
  }
  document.body.classList.toggle('modo-2d', estado.modo === '2d');
  texto(el.btnVista, estado.modo === '2d' ? (soportaWebGL() ? 'Ver en 3D' : '') : 'Vista 2D');
  el.btnVista.hidden = estado.modo === '2d' && !soportaWebGL();
  texto(el.pista, estado.modo === '2d' ? 'Toca una especificación para ver el detalle' : 'Gira el equipo · toca una etiqueta');
  aplicarFiltro();
}

/* ---------- Eventos ---------- */
el.cerrar.addEventListener('click', cerrar);
el.fondo.addEventListener('click', cerrar);
el.fondo.addEventListener('touchstart', (e) => { e.preventDefault(); cerrar(); }, { passive: false });
el.ant.addEventListener('click', () => mover(-1));
el.sig.addEventListener('click', () => mover(1));
el.btnTour.addEventListener('click', iniciarRecorrido);
el.btnVista.addEventListener('click', async () => {
  cerrar();
  // Las etiquetas vuelven a la capa principal antes de cambiar de vista
  estado.specs.forEach((s) => el.etiquetas.appendChild(s._boton));
  await montarVista(estado.modo === '3d' ? '2d' : '3d');
});
document.addEventListener('keydown', (e) => {
  if (!estado.abierta) return;
  if (e.key === 'Escape') cerrar();
  else if (estado.tour && e.key === 'ArrowRight') mover(1);
  else if (estado.tour && e.key === 'ArrowLeft') mover(-1);
  else if (e.key === 'Tab') {
    // Mantiene el foco dentro del popup
    const f = [...el.popup.querySelectorAll('button:not([disabled])')].filter((b) => b.offsetParent);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});
window.addEventListener('resize', () => {
  if (estado.abierta) requestAnimationFrame(() => estado.vista?.enfocar(estado.abierta, regionLibre()));
});

/* ---------- Inicio ---------- */
(async function iniciar() {
  try {
    await cargarDatos();
  } catch (e) {
    el.cargando.innerHTML = '<p class="aviso" style="position:static">No se pudo cargar el contenido. Si abriste el archivo directamente desde tu computador, publícalo en un servidor o usa un servidor local (ver README).</p>';
    console.error(e);
    return;
  }
  construirEtiquetas();
  construirLeyenda();
  const pedido = new URLSearchParams(location.search).get('modo');
  const modo = pedido === '2d' || !soportaWebGL() ? '2d' : '3d';
  await montarVista(modo);
  el.cargando.classList.add('fuera');
  setTimeout(() => el.cargando.remove(), 400);
  // Ganchos para pruebas automáticas
  window.__app = { estado, abrir, cerrar, mover, iniciarRecorrido };
})();
