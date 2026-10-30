/* ============================================================
   CONOCE TU EQUIPO: etiquetas, popup, recorrido guiado y
   selección de vista (3D con Three.js o respaldo 2D).
   Los textos se editan en data/especificaciones.json
   ============================================================ */
import { cargarJson, soportaWebGL2, iconoSpec } from './util.js?v=20261030j';
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
  escenario: $('#escenario'), etiquetas: $('#etiquetas'),
  cargando: $('#cargando'), popup: $('#popup'), fondo: $('#fondo-popup'),
  cerrar: $('#pp-cerrar'), nav: $('#pp-nav'), ant: $('#pp-ant'), sig: $('#pp-sig'), paso: $('#pp-paso'),
  btnTour: $('#btn-recorrido')
};

/* ---------- Utilidades ---------- */
// La escena usa Three.js r187, que necesita WebGL2 (Safari 15+, Chrome/Edge/Firefox modernos)
const soportaWebGL = soportaWebGL2;
function texto(nodo, valor) { nodo.textContent = valor ?? ''; }

/* ---------- Datos ---------- */
async function cargarDatos() {
  const datos = await cargarJson('data/especificaciones.json');
  estado.datos = datos;
  datos.categorias.forEach((c, i) => { estado.cats[c.id] = { ...c, orden: i }; });
  // Orden del recorrido: por categoría y luego por el orden del archivo
  estado.specs = datos.especificaciones
    .filter((s) => estado.cats[s.categoria])
    .map((s, i) => ({ ...s, _i: i }))
    .sort((a, b) => (estado.cats[a.categoria].orden - estado.cats[b.categoria].orden) || (a._i - b._i));
}

function aplicarFiltro() {
  estado.specs.forEach((s) => {
    const visible = !estado.filtro || s.categoria === estado.filtro;
    s._oculta = !visible;
  });
  estado.vista?.filtrar?.(estado.filtro);
}

/* ---------- Popup ---------- */
function regionLibre() {
  // Área de pantalla que queda visible con el popup abierto (para centrar el acercamiento)
  const r = el.escenario.getBoundingClientRect();
  const p = el.popup.getBoundingClientRect();
  const lateral = p.width < window.innerWidth * 0.7 && p.left > window.innerWidth * 0.3;
  if (lateral) {
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
  $('#pp-ico').innerHTML = iconoSpec(s.id);
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

let historialEmpujado = false;
function abrir(s, desdeHistorial) {
  desdeHistorial = desdeHistorial === true;
  const yaAbierta = !!estado.abierta;
  if (!yaAbierta) estado.ultimoFoco = document.activeElement;
  estado.abierta = s;
  if (!desdeHistorial) {
    try {
      if (!yaAbierta && !historialEmpujado) { history.pushState({ spec: s.id }, '', '#/equipo/' + s.id); historialEmpujado = true; }
      else history.replaceState({ spec: s.id }, '', '#/equipo/' + s.id);
    } catch { /* algunos visores embebidos bloquean el historial */ }
  }
  pintarPopup(s);
  el.popup.hidden = false;
  el.fondo.hidden = false;
  document.body.classList.add('popup-abierto');
  // Espera un cuadro para medir el popup y luego acerca la cámara
  requestAnimationFrame(() => estado.vista?.enfocar(s, regionLibre()));
  el.cerrar.focus({ preventScroll: true });
}

function cerrar(desdeHistorial) {
  desdeHistorial = desdeHistorial === true;
  if (!estado.abierta) return;
  if (!desdeHistorial) {
    try {
      if (historialEmpujado) { historialEmpujado = false; history.back(); }
      else history.replaceState(null, '', '#/equipo');
    } catch { /* sin historial */ }
  } else historialEmpujado = false;
  estado.abierta = null;
  estado.tour = false;
  el.popup.hidden = true;
  el.fondo.hidden = true;
  el.popup.style.transform = '';
  document.body.classList.remove('popup-abierto');
  estado.vista?.desenfocar();
  if (estado.ultimoFoco && document.contains(estado.ultimoFoco)) estado.ultimoFoco.focus({ preventScroll: true });
}

/* ---------- Recorrido guiado ---------- */
function iniciarRecorrido() {
  // El recorrido pasa por todas, sin filtro
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
      const { crearEscena3D } = await import('./escena3d.js?v=20261030j');
      // Lienzo nuevo en cada montaje (un contexto WebGL liberado no se reutiliza)
      const viejo = $('#lienzo'); const nuevo = viejo.cloneNode(false); viejo.replaceWith(nuevo);
      estado.vista = await crearEscena3D({
        ...comunes, lienzo: $('#lienzo'), marcador: $('#marcador'), capa: el.etiquetas,
        // Si el sistema libera la GPU (app en segundo plano, poca memoria), se reconstruye la escena
        alPerderContexto: () => setTimeout(() => cambiarVista(++estado.reintentos3d > 2 ? '2d' : '3d'), 400)
      });
      estado.modo = '3d';
    } catch (e) {
      console.warn('3D no disponible, usando versión 2D:', e);
      return montarVista('2d');
    }
  } else {
    const { crearVista2D } = await import('./vista2d.js?v=20261030j');
    estado.vista = crearVista2D({ ...comunes, contenedor: $('#vista2d') });
    estado.modo = '2d';
  }
  document.body.classList.toggle('modo-2d', estado.modo === '2d');
  aplicarFiltro();
}

/* ---------- Eventos ---------- */
el.cerrar.addEventListener('click', () => cerrar());
el.fondo.addEventListener('click', () => cerrar());
el.fondo.addEventListener('touchstart', (e) => { e.preventDefault(); cerrar(); }, { passive: false });
el.ant.addEventListener('click', () => mover(-1));
el.sig.addEventListener('click', () => mover(1));
el.btnTour.addEventListener('click', iniciarRecorrido);
async function cambiarVista(modo) {
  cerrar();
  await montarVista(modo);
}

// Deslizar hacia abajo el popup (celular) para cerrarlo
(() => {
  let y0 = null, dy = 0;
  const zona = [el.popup.querySelector('.pp-agarre'), el.popup.querySelector('.pp-cabeza')];
  zona.forEach((z) => {
    z.addEventListener('touchstart', (e) => { if (window.innerWidth < 900) { y0 = e.touches[0].clientY; dy = 0; el.popup.style.transition = 'none'; } }, { passive: true });
    z.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      el.popup.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    z.addEventListener('touchend', () => {
      if (y0 === null) return;
      y0 = null; el.popup.style.transition = '';
      if (dy > 90) cerrar(); else el.popup.style.transform = '';
    });
  });
})();
document.addEventListener('keydown', (e) => {
  if (!estado.abierta) return;
  if (e.key === 'Escape') cerrar(false);
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

/* ---------- API para el portal ---------- */
let listo = null;
export function iniciar() {
  if (listo) return listo;
  listo = (async () => {
    estado.reintentos3d = 0;
    const vigilante = setTimeout(() => {
      const c = document.getElementById('cargando');
      if (c) c.innerHTML = '<p class="aviso" style="position:static">La carga está tardando más de lo normal. <a href="">Reintentar</a> · <a href="?modo=2d#/equipo">Abrir versión 2D</a></p>';
    }, 12000);
    try {
      await cargarDatos();
    } catch (e) {
      clearTimeout(vigilante);
      el.cargando.innerHTML = '<p class="aviso" style="position:static">No se pudo cargar el contenido. Revisa tu conexión y recarga la página.</p>';
      throw e;
    }
    const pedido = new URLSearchParams(location.search).get('modo');
    const modo = pedido === '2d' || !soportaWebGL() ? '2d' : '3d';
    await montarVista(modo);
    clearTimeout(vigilante);
    el.cargando.classList.add('fuera');
    setTimeout(() => el.cargando.remove(), 400);
    window.__app = { estado, abrir, cerrar, mover, iniciarRecorrido };
  })();
  return listo;
}
/** Abre una especificación desde la dirección (#/equipo/bateria) */
export async function abrirPorId(id) {
  await iniciar();
  const s = estado.specs.find((x) => x.id === id);
  if (!s) return false;
  historialEmpujado = false;
  if (estado.abierta !== s) abrir(s, true);
  return true;
}
/** Cierra sin tocar el historial (la dirección ya cambió) */
export function cerrarDesdeRuta() { cerrar(true); }
export function pausar() { estado.vista?.pausar?.(); }
export function reanudar() { estado.vista?.reanudar?.(); }

