/* ============================================================
   Núcleo del portal
   Rutas (#/equipo, #/mesa, #/frases), inicio
   y barra de sección con botón Atrás.
   ============================================================ */
import { V, $, $$, cargarJson, esc, guardar, reduceMovimiento, iconoSpec } from './util.js?v=20261030i';

const VISTAS = {
  inicio: { titulo: 'Inicio' },
  equipo: { titulo: 'Conoce tu equipo', modulo: () => import(`./equipo.js?v=${V}`) },
  mesa: { titulo: 'Cuida la mesa', modulo: () => import(`./mesa.js?v=${V}`) },
  frases: { titulo: 'Frases de venta', modulo: () => import(`./frases.js?v=${V}`) }
};
let actual = null;
const modulos = {};

/* ============================================================
   ENRUTADOR
   ============================================================ */
function leerRuta() {
  const h = decodeURIComponent(location.hash || '');
  // Enlaces anteriores: desarrollador.click/#bateria → #/equipo/bateria
  if (/^#[a-z0-9-]+$/i.test(h)) return { nombre: 'equipo', sub: h.slice(1), legado: true };
  const partes = h.replace(/^#\/?/, '').split('/').filter(Boolean);
  const nombre = VISTAS[partes[0]] ? partes[0] : 'inicio';
  return { nombre, sub: partes[1] || null };
}

async function obtenerModulo(nombre) {
  if (!VISTAS[nombre].modulo) return null;
  if (!modulos[nombre]) modulos[nombre] = VISTAS[nombre].modulo();
  return modulos[nombre];
}

async function enrutar() {
  const ruta = leerRuta();
  if (ruta.legado) { history.replaceState(null, '', `#/equipo/${ruta.sub}`); }
  const { nombre, sub } = ruta;

  if (actual !== nombre) {
    // Salir de la vista anterior
    if (actual && modulos[actual]) {
      const m = await modulos[actual];
      m.salir?.();
      if (actual === 'equipo') { m.cerrarDesdeRuta(); m.pausar(); }
    }
    const cambiar = () => $$('.vista').forEach((v) => {
      const activa = v.dataset.vista === nombre;
      v.hidden = !activa;
      v.classList.toggle('entrando', activa && actual !== null && !reduceMovimiento() && !document.startViewTransition);
    });
    if (document.startViewTransition && actual !== null && !reduceMovimiento()) {
      try { await document.startViewTransition(cambiar).updateCallbackDone; } catch { cambiar(); }
    } else cambiar();
    document.title = VISTAS[nombre].titulo;
    pintarBarra(nombre);
    const anterior = actual;
    vinoDelInicio = anterior === 'inicio';
    actual = nombre;
    if (nombre !== 'inicio') guardar.escribir('ultima', nombre);
    if (anterior !== null) {
      const v = $(`#vista-${nombre}`);
      v.scrollTop = 0;
      v.setAttribute('tabindex', '-1');
      v.focus({ preventScroll: true });
    }
    if (nombre === 'inicio') refrescarInicio();
  }

  const m = await obtenerModulo(nombre);
  if (!m) return;
  try {
    if (nombre === 'equipo') {
      await m.iniciar();
      if (actual !== 'equipo') return;
      m.reanudar();
      if (sub) { if (!(await m.abrirPorId(sub))) history.replaceState(null, '', '#/equipo'); }
      else m.cerrarDesdeRuta();
    } else {
      await m.montar($(`#vista-${nombre}`));
      if (actual === nombre) m.ruta?.(sub);
    }
  } catch (e) {
    console.error(e);
    $(`#vista-${nombre}`).insertAdjacentHTML('afterbegin', '<p class="aviso" style="margin:16px">No se pudo cargar esta herramienta. Revisa tu conexión y recarga la página.</p>');
  }
}
window.addEventListener('hashchange', enrutar);

/* ============================================================
   BARRA DE SECCIÓN: botón Atrás + nombre de la sección
   ============================================================ */
const barra = $('#barra-sec');
let vinoDelInicio = false;
$('#btn-atras').addEventListener('click', () => {
  // Si se llegó desde el inicio y no hay nada abierto encima, se usa el historial del navegador
  // (así el botón Atrás del celular sigue funcionando igual); si no, se va directo al inicio.
  const sinSubruta = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).length <= 1;
  if (vinoDelInicio && sinSubruta && history.length > 1) history.back();
  else location.hash = '#/';
});
function pintarBarra(nombre) {
  barra.hidden = nombre === 'inicio';
  document.body.classList.toggle('en-inicio', nombre === 'inicio');
  $('#barra-titulo').textContent = nombre === 'inicio' ? '' : VISTAS[nombre].titulo;
  $('#btn-recorrido').hidden = nombre !== 'equipo';
}

/* ============================================================
   INICIO
   ============================================================ */
function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

const ATAJOS = ['bateria', 'camara-principal', 'ram', 'almacenamiento', 'pantalla', 'conectividad', 'resistencia', 'seguridad'];
let inicioListo = false;
async function refrescarInicio() {
  $('#saludo').textContent = saludo();
  try {
    const [eq, mesa] = await Promise.all([cargarJson('data/especificaciones.json'), cargarJson('data/mesa.json')]);
    const cats = Object.fromEntries(eq.categorias.map((c) => [c.id, c]));
    if (!inicioListo) {
      // Accesos directos con íconos a las especificaciones más consultadas
      $('#atajos').innerHTML = ATAJOS.map((id) => eq.especificaciones.find((s) => s.id === id)).filter(Boolean).map((s, k) =>
        `<a class="atajo" href="#/equipo/${s.id}" style="--c:${cats[s.categoria]?.color};--i:${k}"><span class="atajo-ico">${iconoSpec(s.id)}</span><span>${esc(s.etiqueta)}</span></a>`).join('');
      inicioListo = true;
    }
    // Tip del día (cambia cada día)
    const tips = [
      ...mesa.situaciones.map((s) => ({ t: `${s.titulo}: ${s.haz[0].charAt(0).toLowerCase()}${s.haz[0].slice(1)}`, r: `#/mesa/${s.id}` })),
      ...eq.especificaciones.map((s) => ({ t: `${s.etiqueta}: ${s.beneficio}`, r: `#/equipo/${s.id}` })),
      ...mesa.productos.filter((p) => !p.ok).map((p) => ({ t: `No uses ${p.nombre.toLowerCase()} en la mesa: ${p.por.charAt(0).toLowerCase()}${p.por.slice(1)}`, r: `#/mesa/producto-${mesa.productos.indexOf(p)}` }))
    ];
    const d = new Date(); const dia = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    const tip = tips[dia % tips.length];
    $('#tip-texto').textContent = tip.t;
    $('#tip-enlace').href = tip.r;
  } catch { /* el inicio funciona sin estos extras */ }
}

/* ============================================================
   ARRANQUE
   ============================================================ */
enrutar();
// Prepara el índice y precarga la herramienta más usada sin bloquear
const ocioso = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
ocioso(() => {
  // Precarga las herramientas para que abrir cada una sea inmediato
  ['equipo', 'mesa', 'frases'].forEach((n) => obtenerModulo(n).catch(() => {}));
  import(`./vendor/three.min.js?v=${V}`).catch(() => {});
});
