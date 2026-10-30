/* ============================================================
   Núcleo del portal
   Rutas (#/equipo, #/mesa, #/frases), inicio,
   buscador inteligente y navegación.
   ============================================================ */
import { V, $, $$, cargarJson, esc, normalizar, guardar, reduceMovimiento, iconoSpec } from './util.js?v=20261030h';

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
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === nombre) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = VISTAS[nombre].titulo;
    const anterior = actual;
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
   BUSCADOR INTELIGENTE
   Entiende sinónimos y palabras del día a día ("pila", "se regó",
   "pagar con el celular") y apunta a la respuesta exacta.
   ============================================================ */
const SINONIMOS = {
  memoria: 'ram almacenamiento', pila: 'bateria', carga: 'bateria', cargador: 'bateria', dura: 'bateria', duracion: 'bateria', mah: 'bateria',
  foto: 'camara', fotos: 'camara', selfie: 'frontal', selfies: 'frontal', videollamada: 'frontal', videollamadas: 'frontal', video: 'camara', megapixeles: 'camara', mp: 'camara', noche: 'camara nocturno',
  brillo: 'pantalla', hz: 'pantalla', amoled: 'pantalla', oled: 'pantalla', lcd: 'pantalla', pulgadas: 'pantalla', sol: 'pantalla',
  sumergible: 'resistencia ip', ip68: 'resistencia', polvo: 'resistencia', lluvia: 'resistencia', playa: 'resistencia',
  huella: 'seguridad huella', rostro: 'seguridad', facial: 'seguridad', cara: 'seguridad', desbloqueo: 'seguridad', desbloquear: 'seguridad',
  pagar: 'nfc', pago: 'nfc', pagos: 'nfc', datafono: 'nfc', billetera: 'nfc', tarjeta: 'nfc',
  internet: 'conectividad', datos: 'conectividad', senal: 'conectividad', wifi: 'conectividad', '5g': 'conectividad', '4g': 'conectividad', bluetooth: 'conectividad',
  chip: 'sim', linea: 'sim', lineas: 'sim', esim: 'sim',
  espacio: 'almacenamiento', lleno: 'almacenamiento', llena: 'almacenamiento', gb: 'almacenamiento ram', microsd: 'almacenamiento', nube: 'almacenamiento',
  lento: 'procesador ram', rapido: 'procesador', juega: 'procesador ram', jugar: 'procesador ram', juego: 'procesador ram', streaming: 'procesador ram pantalla', redes: 'ram pantalla', rapidez: 'procesador', juegos: 'procesador ram', gamer: 'procesador ram', multitarea: 'ram', apps: 'ram',
  actualizacion: 'sistema', actualizaciones: 'sistema', android: 'sistema', seguro: 'sistema seguridad',
  sonido: 'audio', musica: 'audio', audifonos: 'audio', parlante: 'audio', parlantes: 'audio', volumen: 'audio',
  limpiar: 'limpieza pasos productos', limpio: 'limpieza pasos', limpieza: 'pasos productos', jabon: 'productos agua',
  rego: 'derrame', regue: 'derrame', rego_: 'derrame', cafe: 'derrame', gaseosa: 'derrame', mojo: 'resistencia derrame', mojado: 'resistencia', mojada: 'derrame resistencia', agua: 'resistencia derrame', liquido: 'derrame',
  rayado: 'rayon', rayada: 'rayon', quemado: 'rayon', opaco: 'rayon',
  correr: 'mover', trasladar: 'mover', arrastrar: 'mover', empujar: 'mover',
  apagada: 'luz', apago: 'luz', prende: 'luz', enciende: 'luz', led: 'luz',
  reportar: 'reporte novedad', reporto: 'reporte', novedad: 'reporte', avisar: 'reporte', whatsapp: 'reporte',
  mesa: 'mesa', mueble: 'mesa', vitrina: 'mesa',
  practicar: 'frases',
  frase: 'frases', decir: 'frases', argumento: 'frases', vender: 'frases'
};
const VACIAS = new Set('el la los las un una unos unas de del al a en y o que se me mi mis tu su sus con sin por para es son como cual cuanta cuanto cuantos cuantas donde puedo hago hacer hay le lo si no cliente clientes celular mucho muy bien quiere necesita tiene mas ej'.split(' '));

let indice = [];
async function construirIndice() {
  if (indice.length) return indice;
  const [eq, mesa] = await Promise.all([cargarJson('data/especificaciones.json'), cargarJson('data/mesa.json')]);
  const cats = Object.fromEntries(eq.categorias.map((c) => [c.id, c]));
  const items = [
    { tipo: 'Herramienta', titulo: 'Conoce tu equipo', sub: 'Las especificaciones del celular en 3D', ruta: '#/equipo', claves: 'equipo celular smartphone especificaciones 3d recorrido', ico: '3D', c: '#1E5EFF' },
    { tipo: 'Herramienta', titulo: 'Cuida la mesa', sub: 'Qué hacer y qué evitar con la mesa de exhibición', ruta: '#/mesa', claves: 'mesa mueble exhibicion vitrina cuidado mantenimiento', ico: 'ME', c: '#0A1A3F' },
    { tipo: 'Herramienta', titulo: 'Frases de venta', sub: 'Todas las frases para el cliente', ruta: '#/frases', claves: 'frases venta decir cliente argumento practicar', ico: '“”', c: '#4F46E5' },
    { tipo: 'Mesa', titulo: 'Limpieza segura en 5 pasos', sub: 'Si te toca limpiar la mesa', ruta: '#/mesa/pasos', claves: 'limpieza limpiar pasos jabon agua paño', ico: '5', c: '#0A1A3F' }
  ];
  eq.especificaciones.forEach((s) => items.push({
    tipo: 'Equipo', titulo: s.titulo, sub: s.que_es, ruta: `#/equipo/${s.id}`, svg: iconoSpec(s.id), ico: s.etiqueta.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '').slice(0, 2).toUpperCase(),
    c: cats[s.categoria]?.color, claves: `${s.id} ${s.etiqueta} ${cats[s.categoria]?.nombre}`, texto: `${s.que_es} ${Object.values(s.clave || {}).join(' ')} ${s.beneficio} ${s.frase}`
  }));
  mesa.zonas.forEach((z) => items.push({ tipo: 'Mesa', titulo: z.nombre, sub: z.rol, ruta: `#/mesa/${z.id}`, ico: z.corto.slice(0, 2).toUpperCase(), c: '#0A1A3F', claves: `${z.id} ${z.corto} mesa`, texto: [...z.cuidar, ...z.evitar, z.si_pasa].join(' ') }));
  mesa.situaciones.forEach((s) => items.push({ tipo: 'Situación', titulo: s.titulo, sub: s.haz[0], ruta: `#/mesa/${s.id}`, ico: '?', c: '#0077C8', claves: `${s.id} ${s.claves}`, texto: [...s.haz, ...s.no_hagas, s.avisa].join(' ') }));
  mesa.productos.forEach((p, i) => items.push({ tipo: p.ok ? 'Sí se puede' : 'No usar', titulo: p.nombre, sub: p.por, ruta: `#/mesa/producto-${i}`, ico: p.ok ? '✓' : '✕', c: p.ok ? '#0077C8' : '#0A1A3F', claves: `${p.nombre} producto limpiar usar`, texto: p.por }));
  indice = items.map((it) => ({ ...it, _t: normalizar(it.titulo), _k: normalizar(it.claves || ''), _x: normalizar(`${it.sub || ''} ${it.texto || ''}`) }));
  return indice;
}

function tokens(q) {
  const base = normalizar(q).replace(/[^a-z0-9ñ\s-]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !VACIAS.has(t));
  const extra = [];
  base.forEach((t) => {
    const s = SINONIMOS[t] || SINONIMOS[t.replace(/s$/, '')];
    if (s) extra.push(...s.split(' '));
  });
  return { base, todos: [...new Set([...base, ...extra])] };
}

function buscar(q) {
  const { base, todos } = tokens(q);
  if (!todos.length) return [];
  const qn = normalizar(q).trim();
  return indice.map((it) => {
    let p = 0;
    todos.forEach((t) => {
      const esBase = base.includes(t) ? 1 : 0.7;
      const re = new RegExp(`(^|\\s|-)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (re.test(it._t)) p += 10 * esBase; else if (it._t.includes(t)) p += 6 * esBase;
      if (re.test(it._k)) p += 7 * esBase; else if (it._k.includes(t)) p += 3 * esBase;
      if (re.test(it._x)) p += 2 * esBase;
    });
    if (qn.length > 3 && it._t.includes(qn)) p += 12;
    if (it.tipo === 'Herramienta') p *= 0.8;
    return { it, p };
  }).filter((r) => r.p >= 2).sort((a, b) => b.p - a.p).slice(0, 8).map((r) => r.it);
}

function resaltar(texto, q) {
  const { todos } = tokens(q);
  let html = esc(texto);
  const n = normalizar(texto);
  const marcas = [];
  todos.forEach((t) => { let i = n.indexOf(t); if (i >= 0) marcas.push([i, i + t.length]); });
  if (!marcas.length) return html;
  marcas.sort((a, b) => a[0] - b[0]);
  let out = '', pos = 0;
  marcas.forEach(([a, b]) => { if (a < pos) return; out += esc(texto.slice(pos, a)) + '<mark>' + esc(texto.slice(a, b)) + '</mark>'; pos = b; });
  return out + esc(texto.slice(pos));
}

function pintarResultados(cont, q) {
  const res = buscar(q);
  if (!res.length) {
    cont.innerHTML = `<p class="res-vacio">No encontré nada con “${esc(q)}”. Prueba con palabras como <b>batería</b>, <b>se regó café</b> o <b>pagar con el celular</b>.</p>`;
    return [];
  }
  cont.innerHTML = res.map((it, i) => `
    <a class="res" role="option" id="${cont.id}-${i}" href="${it.ruta}" aria-selected="${i === 0}" style="--c:${it.c || '#1E5EFF'}">
      <span class="res-icono" aria-hidden="true">${it.svg || esc(it.ico || '')}</span>
      <span><span class="res-titulo">${resaltar(it.titulo, q)}</span><span class="res-sub">${esc(it.sub || '')}</span></span>
      <span class="res-tipo">${esc(it.tipo)}</span>
    </a>`).join('');
  return res;
}

function conectarBuscador(input, cont, { alElegir } = {}) {
  let sel = 0;
  const marcar = () => {
    const items = $$('.res', cont);
    items.forEach((a, i) => a.setAttribute('aria-selected', String(i === sel)));
    if (items[sel]) { items[sel].scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', items[sel].id); }
  };
  input.addEventListener('input', async () => {
    await construirIndice();
    const q = input.value.trim();
    sel = 0;
    if (!q) { cont.hidden = cont.classList.contains('resultados-dialogo') ? false : true; cont.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); return; }
    pintarResultados(cont, q);
    cont.hidden = false; input.setAttribute('aria-expanded', 'true');
    marcar();
  });
  input.addEventListener('keydown', (e) => {
    const items = $$('.res', cont);
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); sel = (sel + 1) % items.length; marcar(); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; marcar(); }
    else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); items[sel].click(); }
    else if (e.key === 'Escape') { input.value = ''; cont.innerHTML = ''; if (!cont.classList.contains('resultados-dialogo')) cont.hidden = true; alElegir?.(); }
  });
  cont.addEventListener('click', (e) => { if (e.target.closest('.res')) { setTimeout(() => alElegir?.(), 0); } });
}

/* Buscador de la cabecera (Ctrl K) */
const buscador = $('#buscador'), bInput = $('#buscador-input'), bRes = $('#buscador-resultados');
function abrirBuscador(texto = '') {
  buscador.hidden = false;
  bInput.value = texto;
  if (texto) bInput.dispatchEvent(new Event('input'));
  else bRes.innerHTML = '<p class="res-grupo">Prueba con</p>' + ['RAM para un cliente gamer', 'Se regó café', '¿Puedo usar alcohol?', 'Pagar con el celular', 'Mover la mesa'].map((t) => `<a class="res" href="#" data-sug="${esc(t)}"><span class="res-icono" aria-hidden="true">↗</span><span class="res-titulo">${esc(t)}</span><span></span></a>`).join('');
  setTimeout(() => bInput.focus(), 30);
}
function cerrarBuscador() { buscador.hidden = true; $('#abrir-buscador').focus({ preventScroll: true }); }
$('#abrir-buscador').addEventListener('click', () => abrirBuscador());
$('#buscador-cerrar').addEventListener('click', cerrarBuscador);
buscador.addEventListener('click', (e) => {
  if (e.target === buscador) return cerrarBuscador();
  const s = e.target.closest('[data-sug]');
  if (s) { e.preventDefault(); bInput.value = s.dataset.sug; bInput.dispatchEvent(new Event('input')); bInput.focus(); }
});
conectarBuscador(bInput, bRes, { alElegir: () => { buscador.hidden = true; } });
document.addEventListener('keydown', (e) => {
  const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); buscador.hidden ? abrirBuscador() : cerrarBuscador(); }
  else if (e.key === '/' && !escribiendo && buscador.hidden) { e.preventDefault(); abrirBuscador(); }
  else if (e.key === 'Escape' && !buscador.hidden) cerrarBuscador();
});

/* ============================================================
   INICIO
   ============================================================ */
const pInput = $('#pregunta-input'), pRes = $('#pregunta-resultados');
conectarBuscador(pInput, pRes, { alElegir: () => { pRes.hidden = true; pInput.value = ''; } });
document.addEventListener('click', (e) => { if (!e.target.closest('.pregunta')) pRes.hidden = true; });
pInput.addEventListener('focus', () => { if (pInput.value.trim()) pRes.hidden = false; });

const EJEMPLOS = ['¿Qué necesitas resolver?', 'Ej.: cliente que juega mucho', 'Ej.: se regó café en la mesa', 'Ej.: ¿puedo limpiar con alcohol?', 'Ej.: pagar con el celular', 'Ej.: batería que dure todo el día'];
let iEjemplo = 0;
setInterval(() => {
  if (document.activeElement === pInput || pInput.value || actual !== 'inicio' || reduceMovimiento()) return;
  iEjemplo = (iEjemplo + 1) % EJEMPLOS.length;
  pInput.placeholder = EJEMPLOS[iEjemplo];
}, 3200);

const SUGERENCIAS = ['Cliente que juega mucho', 'Se regó café', 'Pagar sin tarjeta', '¿Puedo usar alcohol?', 'Fotos de noche', 'Hay que mover la mesa'];
$('#sugerencias').innerHTML = SUGERENCIAS.map((s) => `<button type="button" class="sug">${esc(s)}</button>`).join('');
$('#sugerencias').addEventListener('click', (e) => {
  const b = e.target.closest('.sug'); if (!b) return;
  pInput.value = b.textContent; pInput.dispatchEvent(new Event('input')); pInput.focus();
});

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
  construirIndice().catch(() => {});
  // Precarga las herramientas para que abrir cada una sea inmediato
  ['equipo', 'mesa', 'frases'].forEach((n) => obtenerModulo(n).catch(() => {}));
  import(`./vendor/three.min.js?v=${V}`).catch(() => {});
});
