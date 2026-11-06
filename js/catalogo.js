/* ============================================================
   CATÁLOGO DE EQUIPOS · fichas reales por marca y modelo
   Datos editables en data/equipos.json
   Rutas: #/catalogo · #/catalogo/<id> · #/catalogo/vs/<id>/<id>
   ============================================================ */
import { $, $$, cargarJson, esc, copiar, guardar, iconoSpec } from './util.js?v=20261106a';

let datos = null, raiz = null, montado = null;
let marca = 'todas', criterio = null, vista = 'lista', actualId = null;
const AHORA = new Date().getFullYear();

const CRITERIOS = [
  { id: 'bateria', nombre: 'Batería', ico: 'bateria', valor: (e) => e.bateria?.mah, txt: (e) => `${mil(e.bateria?.mah)} mAh` },
  { id: 'camara', nombre: 'Cámara', ico: 'camara-principal', valor: (e) => (e.tigo?.camara_mp || 0) + (e.camaras?.teleobjetivo ? 60 : 0), txt: (e) => `${e.tigo?.camara_mp} MP${e.camaras?.teleobjetivo ? ' + zoom' : ''}` },
  { id: 'rendimiento', nombre: 'Rendimiento', ico: 'procesador', valor: (e) => GAMAS.indexOf(e.gama) * 10 + (e.memoria?.ram_gb || 0), txt: (e) => `${e.memoria?.ram_gb} GB RAM` },
  { id: 'almacenamiento', nombre: 'Espacio', ico: 'almacenamiento', valor: (e) => e.memoria?.almacenamiento_gb, txt: (e) => `${e.memoria?.almacenamiento_gb} GB` },
  { id: 'actualizaciones', nombre: 'Actualizaciones', ico: 'sistema', valor: (e) => +e.software?.soporte_hasta || 0, txt: (e) => e.software?.soporte_hasta ? `Hasta ${e.software.soporte_hasta}` : '—' },
  { id: 'carga', nombre: 'Carga rápida', ico: 'bateria', valor: (e) => e.bateria?.carga_w, txt: (e) => e.bateria?.carga_w ? `${e.bateria.carga_w} W` : '—' },
  { id: 'pantalla', nombre: 'Pantalla', ico: 'pantalla', valor: (e) => (e.pantalla?.hz || 60) * 10 + (e.pantalla?.pulgadas || 0), txt: (e) => `${e.pantalla?.pulgadas}" · ${e.pantalla?.hz} Hz` }
];
const GAMAS = ['Entrada', 'Media', 'Media alta', 'Alta', 'Premium'];

const mil = (n) => (n == null ? '—' : Number(n).toLocaleString('es-CO'));
const v = (x, suf = '') => (x == null || x === '' ? '—' : esc(x) + suf);
const sino = (b) => (b == null ? '—' : b ? 'Sí' : 'No');
const porId = (id) => datos.equipos.find((e) => e.id === id);
const img = (e, cls = '') => `<img class="${cls}" src="img/equipos/${e.id}.webp?v=1" alt="${esc(e.marca + ' ' + e.modelo)}" loading="lazy" decoding="async" draggable="false">`;

export function montar(cont) {
  if (montado) return montado;
  raiz = cont;
  marca = guardar.leer('cat-marca', 'todas');
  montado = (async () => { datos = await cargarJson('data/equipos.json'); })();
  return montado;
}

export function ruta(sub) {
  const p = (sub || '').split('/').filter(Boolean);
  if (p[0] === 'vs' && porId(p[1]) && porId(p[2])) return pintarComparar(porId(p[1]), porId(p[2]));
  if (p[0] && porId(p[0])) return pintarFicha(porId(p[0]));
  if (p[0]) history.replaceState(null, '', '#/catalogo');
  pintarLista();
}

/** Botón Atrás de la barra: desde una ficha vuelve a la lista */
export function atras() {
  if (vista === 'lista') { location.hash = '#/'; return true; }
  if (vista === 'vs' && actualId) location.hash = `#/catalogo/${actualId}`;
  else location.hash = '#/catalogo';
  return true;
}
export function salir() { titulo('Catálogo de equipos'); }

function titulo(t) { const b = $('#barra-titulo'); if (b) b.textContent = t; }

/* ---------------- LISTA ---------------- */
// Menú fijo arriba: marcas (pestañas) + "ordenar por" en una sola fila deslizable.
// Debajo, modelos agrupados por marca. Deslizar a los lados cambia de marca.
function pintarLista() {
  vista = 'lista'; titulo('Catálogo de equipos');
  const marcas = [{ id: 'todas', nombre: 'Todas' }, ...datos.marcas];
  raiz.innerHTML = `
  <div class="cat">
    <div class="cat-menu">
      <div class="cat-marcas" role="tablist" aria-label="Marca">
        ${marcas.map((m) => `<button type="button" class="cat-marca" data-marca="${m.id}" role="tab">${esc(m.nombre)}<span>${m.id === 'todas' ? datos.equipos.length : datos.equipos.filter((e) => e.marca === m.nombre).length}</span></button>`).join('')}
      </div>
      <div class="cat-criterios" role="group" aria-label="Ordenar por lo que busca el cliente">
        <span class="cat-orden">Busca</span>
        ${CRITERIOS.map((c) => `<button type="button" class="cat-crit" data-crit="${c.id}" aria-pressed="false">${iconoSpec(c.ico)}${c.nombre}</button>`).join('')}
      </div>
    </div>
    <div class="cat-grid" id="cat-grid" aria-live="polite"></div>
  </div>`;
  $$('.cat-marca', raiz).forEach((b) => b.addEventListener('click', () => elegirMarca(b.dataset.marca)));
  $$('.cat-crit', raiz).forEach((b) => b.addEventListener('click', () => { criterio = criterio === b.dataset.crit ? null : b.dataset.crit; grid(); centrar(b); }));
  // Deslizar sobre los modelos para pasar de marca
  const g = $('#cat-grid', raiz); let x0 = null, y0 = null;
  g.addEventListener('touchstart', (ev) => { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, { passive: true });
  g.addEventListener('touchend', (ev) => {
    if (x0 == null) return;
    const dx = ev.changedTouches[0].clientX - x0, dy = ev.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const ids = marcas.map((m) => m.id), i = ids.indexOf(marca);
    const j = i + (dx < 0 ? 1 : -1);
    if (j >= 0 && j < ids.length) elegirMarca(ids[j], dx < 0 ? 1 : -1);
  }, { passive: true });
  grid();
}

function elegirMarca(id, dir = 0) {
  if (id === marca) return;
  marca = id; guardar.escribir('cat-marca', marca);
  grid(dir);
  const v = document.getElementById('vista-catalogo');
  if (v && v.scrollTop > 0) v.scrollTo({ top: 0, behavior: 'smooth' });
}
function centrar(b) { b?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }

function tarjeta(e, k, c, max) {
  return `<a class="cat-card" href="#/catalogo/${e.id}" style="--k:${Math.min(k, 10)}">
      ${c && k < 3 ? `<span class="cat-top${k === 0 ? ' uno' : ''}">${k === 0 ? 'Mejor opción' : `Top ${k + 1}`}</span>` : ''}
      <span class="cat-foto">${img(e)}</span>
      <span class="cat-info">
        ${marca === 'todas' && c ? `<span class="cat-mar">${esc(e.marca)}</span>` : ''}
        <b>${esc(e.modelo)}</b>
        ${c ? `<span class="cat-valor">${c.txt(e)}</span><span class="cat-medida"><span style="width:${Math.max(8, ((c.valor(e) || 0) / max) * 100)}%"></span></span>`
    : `<span class="cat-mini"><span>${e.memoria?.almacenamiento_gb} GB</span><span>${e.memoria?.ram_gb} GB RAM</span><span>${e.tigo?.camara_mp} MP</span><span>${mil(e.bateria?.mah)} mAh</span></span>`}
      </span>
    </a>`;
}

function grid(dir = 0) {
  $$('.cat-marca', raiz).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.marca === marca)));
  $$('.cat-crit', raiz).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.crit === criterio)));
  centrar($(`.cat-marca[data-marca="${marca}"]`, raiz));
  const nombreMarca = datos.marcas.find((m) => m.id === marca)?.nombre;
  let lista = datos.equipos.filter((e) => marca === 'todas' || e.marca === nombreMarca);
  const c = CRITERIOS.find((x) => x.id === criterio);
  const g = $('#cat-grid', raiz);
  g.dataset.dir = dir > 0 ? 'izq' : dir < 0 ? 'der' : '';
  if (c) {
    lista = [...lista].sort((a, b) => (c.valor(b) || 0) - (c.valor(a) || 0));
    const max = Math.max(...lista.map((e) => c.valor(e) || 0));
    g.innerHTML = `<p class="cat-aviso">${iconoSpec(c.ico)}Ordenado por <b>${c.nombre.toLowerCase()}</b>, de mejor a menor</p><div class="cat-cards">${lista.map((e, k) => tarjeta(e, k, c, max)).join('')}</div>`;
  } else if (marca === 'todas') {
    // Agrupado por marca, con encabezado tocable
    g.innerHTML = datos.marcas.map((m) => {
      const es = lista.filter((e) => e.marca === m.nombre);
      return `<section class="cat-grupo"><button type="button" class="cat-grupo-cab" data-ir="${m.id}"><b>${esc(m.nombre)}</b><span>${es.length} modelos</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button><div class="cat-cards">${es.map((e, k) => tarjeta(e, k)).join('')}</div></section>`;
    }).join('');
    $$('.cat-grupo-cab', g).forEach((b) => b.addEventListener('click', () => elegirMarca(b.dataset.ir, 1)));
  } else {
    g.innerHTML = `<div class="cat-cards">${lista.map((e, k) => tarjeta(e, k)).join('')}</div>`;
  }
  g.classList.remove('anima'); void g.offsetWidth; g.classList.add('anima');
}

/* ---------------- FICHA ---------------- */
function pintarFicha(e) {
  vista = 'ficha'; actualId = e.id; titulo(e.modelo);
  const misma = datos.equipos.filter((x) => x.marca === e.marca);
  const i = misma.indexOf(e);
  const ant = misma[(i - 1 + misma.length) % misma.length], sig = misma[(i + 1) % misma.length];
  const lanz = parseInt((e.lanzamiento || '').match(/\d{4}/)?.[0] || AHORA, 10);
  const hasta = parseInt(e.software?.soporte_hasta, 10);
  const restan = hasta ? Math.max(0, hasta - AHORA) : null;
  const cam = e.camaras || {}, pan = e.pantalla || {}, bat = e.bateria || {}, sw = e.software || {}, con = e.conectividad || {};

  raiz.innerHTML = `
  <nav class="f-modelos" aria-label="Modelos de ${esc(e.marca)}">
    ${misma.map((x) => `<a href="#/catalogo/${x.id}" class="f-mod${x === e ? ' activo' : ''}"${x === e ? ' aria-current="page"' : ''} data-reemplazar>${img(x)}<span>${esc(x.modelo)}</span></a>`).join('')}
  </nav>
  <article class="ficha">
    <section class="f-hero">
      <div class="f-escena" id="f-escena">
        <div class="f-aro" aria-hidden="true"></div>
        <div class="f-tel" id="f-tel">${img(e, 'f-img')}</div>
        <button type="button" class="f-pill p1" data-ir="sec-pantalla">${iconoSpec('pantalla')}<b>${v(pan.pulgadas, '"')}</b>${v(pan.hz, ' Hz')}</button>
        <button type="button" class="f-pill p2" data-ir="sec-camaras">${iconoSpec('camara-principal')}<b>${v(e.tigo?.camara_mp, ' MP')}</b>Cámara</button>
        <button type="button" class="f-pill p3" data-ir="sec-bateria">${iconoSpec('bateria')}<b>${mil(bat.mah)}</b>mAh</button>
        <button type="button" class="f-pill p4" data-ir="sec-software">${iconoSpec('sistema')}<b>${hasta || '—'}</b>Soporte</button>
      </div>
      <div class="f-cab">
        <span class="f-marca">${esc(e.marca)}${e.gama ? ` · <span class="f-gama">Gama ${esc(e.gama.toLowerCase())}</span>` : ''}</span>
        <h1>${esc(e.modelo)}</h1>
        <p class="f-sub">${v(e.memoria?.almacenamiento_gb, ' GB')} · ${v(e.memoria?.ram_gb, ' GB RAM')} · ${v(con.red)}${e.lanzamiento ? ` · Lanzado en ${esc(e.lanzamiento.toLowerCase())}` : ''}</p>
        ${e.validado ? '' : '<span class="f-validar">Ficha por validar</span>'}
      </div>
      <div class="f-nav">
        <button type="button" class="f-comparar" id="f-comparar"><svg viewBox="0 0 24 24"><path d="M8 4v16M16 4v16M4 8h8M12 16h8"/></svg>Comparar con otro equipo</button>
      </div>
    </section>

    ${e.destacados?.length || e.frase ? `
    <section class="f-venta">
      ${e.destacados?.length ? `<ul class="f-dest">${e.destacados.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${e.para_quien ? `<p class="f-quien"><b>Ideal para</b>${esc(e.para_quien)}</p>` : ''}
      ${e.frase ? `<div class="f-frase"><p>“${esc(e.frase)}”</p><button type="button" class="icono-btn" id="f-copiar" aria-label="Copiar frase"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg></button></div>` : ''}
    </section>` : ''}

    <section class="f-sec" id="sec-software">
      <h2>${iconoSpec('sistema')}Software y actualizaciones</h2>
      <p class="f-dato-grande">${v(sw.so_lanzamiento)}</p>
      ${hasta ? `
      <div class="f-linea" style="--ini:${lanz};--fin:${hasta}">
        <div class="f-barra"><span style="width:${Math.min(100, Math.max(4, ((AHORA - lanz + 0.5) / (hasta - lanz + 0.0001)) * 100))}%"></span></div>
        <div class="f-anios">${Array.from({ length: hasta - lanz + 1 }, (_, k) => `<span class="${lanz + k === AHORA ? 'hoy' : ''}">${lanz + k}</span>`).join('')}</div>
      </div>
      <p class="f-nota">${restan > 0 ? `Le quedan <b>cerca de ${restan} ${restan === 1 ? 'año' : 'años'}</b> de actualizaciones.` : 'Ya está al final de su soporte de actualizaciones.'}</p>` : ''}
      ${filas([
        ['Versiones de sistema', sw.actualizaciones_so != null ? `${sw.actualizaciones_so} actualizaciones` : null],
        ['Parches de seguridad', sw.parches_seguridad_anios != null ? `${sw.parches_seguridad_anios} años` : null],
        ['Soporte hasta', sw.soporte_hasta]
      ])}
      ${sw.funciones_ia?.length ? `<p class="f-etq">Funciones inteligentes</p><div class="f-chips">${sw.funciones_ia.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
    </section>

    <section class="f-sec" id="sec-rendimiento">
      <h2>${iconoSpec('procesador')}Rendimiento</h2>
      <p class="f-dato-grande">${v(e.procesador?.nombre)}</p>
      ${filas([['Procesador', e.procesador?.detalle], ['Memoria RAM', e.memoria?.ram_gb && `${e.memoria.ram_gb} GB`], ['Almacenamiento', e.memoria?.almacenamiento_gb && `${e.memoria.almacenamiento_gb} GB`], ['Memoria microSD', e.memoria?.microsd]])}
    </section>

    <section class="f-sec" id="sec-pantalla">
      <h2>${iconoSpec('pantalla')}Pantalla</h2>
      <p class="f-dato-grande">${v(pan.pulgadas, '"')} ${v(pan.tipo)}</p>
      ${filas([['Resolución', pan.resolucion], ['Tasa de refresco', pan.hz && `${pan.hz} Hz`], ['Brillo máximo', pan.brillo_nits && `${mil(pan.brillo_nits)} nits`], ['Protección', pan.proteccion]])}
    </section>

    <section class="f-sec" id="sec-camaras">
      <h2>${iconoSpec('camara-principal')}Cámaras</h2>
      <p class="f-dato-grande">${v(cam.principal)}</p>
      ${filas([['Ultra gran angular', cam.ultra_gran_angular], ['Teleobjetivo', cam.teleobjetivo], ['Macro', cam.macro], ['Frontal', cam.frontal], ['Video', cam.video]])}
      ${cam.extras?.length ? `<div class="f-chips">${cam.extras.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
    </section>

    <section class="f-sec" id="sec-bateria">
      <h2>${iconoSpec('bateria')}Batería y carga</h2>
      <p class="f-dato-grande">${mil(bat.mah)} mAh</p>
      ${filas([['Carga con cable', bat.carga_w && `${bat.carga_w} W`], ['Carga inalámbrica', bat.inalambrica_w ? `${bat.inalambrica_w} W` : bat.inalambrica_w === null ? null : 'No'], ['Carga inversa', bat.reversa == null ? null : sino(bat.reversa)], ['Cargador en la caja', bat.cargador_en_caja == null ? null : sino(bat.cargador_en_caja)]])}
    </section>

    <section class="f-sec" id="sec-conectividad">
      <h2>${iconoSpec('conectividad')}Conectividad</h2>
      <div class="f-iconos">
        ${chip('Red', con.red)} ${chip('NFC', con.nfc == null ? null : sino(con.nfc))} ${chip('eSIM', con.esim == null ? null : sino(con.esim))} ${chip('Wi-Fi', con.wifi)} ${chip('Bluetooth', con.bluetooth)} ${chip('Audífonos', con.jack_audifonos == null ? null : con.jack_audifonos ? 'Jack 3,5 mm' : 'Sin jack')}
      </div>
      ${filas([['SIM', con.sim], ['Puerto', con.usb]])}
    </section>

    <section class="f-sec" id="sec-seguridad">
      <h2>${iconoSpec('resistencia')}Seguridad, resistencia y diseño</h2>
      ${filas([['Huella', e.seguridad?.huella], ['Rostro', e.seguridad?.rostro], ['Resistencia', e.resistencia?.ip], ['Audio', e.audio ? [e.audio.estereo ? 'Estéreo' : e.audio.estereo === false ? 'Mono' : null, e.audio.detalle].filter(Boolean).join(' · ') : null], ['Peso', e.diseno?.peso_g && `${e.diseno.peso_g} g`], ['Grosor', e.diseno?.grosor_mm && `${String(e.diseno.grosor_mm).replace('.', ',')} mm`], ['Materiales', e.diseno?.materiales], ['Colores', e.diseno?.colores?.join(', ')]])}
    </section>

    ${!e.validado && (e.dudas?.length || e.fuentes?.length) ? `
    <details class="f-sec f-revision">
      <summary>Notas para validar esta ficha</summary>
      ${e.dudas?.length ? `<ul>${e.dudas.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${e.fuentes?.length ? `<p class="f-etq">Fuentes</p><ul class="f-fuentes">${e.fuentes.map((u) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a></li>`).join('')}</ul>` : ''}
    </details>` : ''}
  </article>

  <div class="f-hoja" id="f-hoja" hidden>
    <div class="f-hoja-panel" role="dialog" aria-modal="true" aria-label="Comparar con">
      <div class="f-hoja-cab"><b>Comparar ${esc(e.modelo)} con…</b><button type="button" class="icono-btn" id="f-hoja-cerrar" aria-label="Cerrar">✕</button></div>
      <div class="f-hoja-lista">
        ${datos.equipos.filter((x) => x.id !== e.id).map((x) => `<a href="#/catalogo/vs/${e.id}/${x.id}" class="f-op">${img(x)}<span><small>${esc(x.marca)}</small>${esc(x.modelo)}</span></a>`).join('')}
      </div>
    </div>
  </div>`;
  window.scrollTo?.(0, 0); raiz.scrollTop = 0;

  $$('.f-pill', raiz).forEach((b) => b.addEventListener('click', () => $('#' + b.dataset.ir, raiz)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  $('#f-copiar', raiz)?.addEventListener('click', () => copiar(e.frase));
  const hoja = $('#f-hoja', raiz);
  $('#f-comparar', raiz).addEventListener('click', () => { hoja.hidden = false; });
  $('#f-hoja-cerrar', raiz).addEventListener('click', () => { hoja.hidden = true; });
  hoja.addEventListener('click', (ev) => { if (ev.target === hoja) hoja.hidden = true; });
  inclinar($('#f-escena', raiz), $('#f-tel', raiz));
  $$('[data-reemplazar]', raiz).forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); location.replace(a.getAttribute('href')); }));
  const act = $('.f-mod.activo', raiz); if (act) act.parentNode.scrollLeft = act.offsetLeft - (act.parentNode.clientWidth - act.offsetWidth) / 2;
  deslizar($('.f-hero', raiz), ant, sig, misma.length > 1);
}

function filas(lista) {
  const f = lista.filter(([, x]) => x != null && x !== '' && x !== false);
  if (!f.length) return '';
  return `<dl class="f-filas">${f.map(([k, x]) => `<div><dt>${esc(k)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>`;
}
function chip(k, x) { return x == null ? '' : `<span class="f-ic"><small>${esc(k)}</small>${esc(x)}</span>`; }

/* Teléfono que se inclina con el dedo o el mouse */
function inclinar(escena, tel) {
  if (!escena || !tel || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let raf = 0;
  const mover = (x, y) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { tel.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`); tel.style.setProperty('--ry', `${(x * 22).toFixed(2)}deg`); });
  };
  escena.addEventListener('pointermove', (ev) => {
    const r = escena.getBoundingClientRect();
    mover((ev.clientX - r.left) / r.width - 0.5, (ev.clientY - r.top) / r.height - 0.5);
    tel.classList.add('activo');
  });
  escena.addEventListener('pointerleave', () => { mover(0, 0); tel.classList.remove('activo'); });
  escena.addEventListener('pointerup', () => { mover(0, 0); tel.classList.remove('activo'); });
}

/* Deslizar a los lados para cambiar de modelo de la misma marca */
function deslizar(el, ant, sig, activo) {
  if (!activo || !el) return;
  let x0 = null, y0 = null;
  el.addEventListener('touchstart', (ev) => { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (ev) => {
    if (x0 == null) return;
    const dx = ev.changedTouches[0].clientX - x0, dy = ev.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) location.replace(`#/catalogo/${(dx < 0 ? sig : ant).id}`);
  }, { passive: true });
}

/* ---------------- COMPARAR ---------------- */
function pintarComparar(a, b) {
  vista = 'vs'; actualId = a.id; titulo('Comparar');
  const filasVs = [
    ['Pantalla', (e) => `${e.pantalla?.pulgadas}" ${e.pantalla?.tipo || ''}`, (e) => e.pantalla?.pulgadas],
    ['Tasa de refresco', (e) => e.pantalla?.hz && `${e.pantalla.hz} Hz`, (e) => e.pantalla?.hz],
    ['Procesador', (e) => e.procesador?.nombre, null],
    ['Memoria RAM', (e) => e.memoria?.ram_gb && `${e.memoria.ram_gb} GB`, (e) => e.memoria?.ram_gb],
    ['Almacenamiento', (e) => e.memoria?.almacenamiento_gb && `${e.memoria.almacenamiento_gb} GB`, (e) => e.memoria?.almacenamiento_gb],
    ['Cámara principal', (e) => e.tigo?.camara_mp && `${e.tigo.camara_mp} MP`, (e) => e.tigo?.camara_mp],
    ['Zoom óptico', (e) => (e.camaras?.teleobjetivo ? 'Sí' : 'No'), (e) => (e.camaras?.teleobjetivo ? 1 : 0)],
    ['Cámara frontal', (e) => e.camaras?.frontal, null],
    ['Batería', (e) => e.bateria?.mah && `${mil(e.bateria.mah)} mAh`, (e) => e.bateria?.mah],
    ['Carga rápida', (e) => e.bateria?.carga_w && `${e.bateria.carga_w} W`, (e) => e.bateria?.carga_w],
    ['Carga inalámbrica', (e) => (e.bateria?.inalambrica_w ? `${e.bateria.inalambrica_w} W` : 'No'), (e) => e.bateria?.inalambrica_w || 0],
    ['Actualizaciones hasta', (e) => e.software?.soporte_hasta, (e) => +e.software?.soporte_hasta || 0],
    ['Resistencia', (e) => e.resistencia?.ip, (e) => +(e.resistencia?.ip || '').replace(/\D/g, '').slice(-2) || 0],
    ['NFC', (e) => (e.conectividad?.nfc == null ? null : sino(e.conectividad.nfc)), (e) => (e.conectividad?.nfc ? 1 : 0)],
    ['eSIM', (e) => (e.conectividad?.esim == null ? null : sino(e.conectividad.esim)), (e) => (e.conectividad?.esim ? 1 : 0)],
    ['Peso', (e) => e.diseno?.peso_g && `${e.diseno.peso_g} g`, (e) => (e.diseno?.peso_g ? -e.diseno.peso_g : null)]
  ];
  let ga = 0, gb = 0;
  const cuerpo = filasVs.map(([k, txt, val]) => {
    const va = val?.(a), vb = val?.(b);
    const mejorA = va != null && vb != null && va > vb, mejorB = va != null && vb != null && vb > va;
    if (mejorA) ga++; if (mejorB) gb++;
    return `<div class="vs-fila"><span class="vs-k">${k}</span><span class="${mejorA ? 'gana' : ''}">${v(txt(a))}</span><span class="${mejorB ? 'gana' : ''}">${v(txt(b))}</span></div>`;
  }).join('');
  raiz.innerHTML = `
  <div class="vs">
    <div class="vs-cab">
      <a href="#/catalogo/${a.id}" class="vs-eq">${img(a)}<small>${esc(a.marca)}</small><b>${esc(a.modelo)}</b></a>
      <span class="vs-x">vs</span>
      <a href="#/catalogo/${b.id}" class="vs-eq">${img(b)}<small>${esc(b.marca)}</small><b>${esc(b.modelo)}</b></a>
    </div>
    <p class="vs-res">${ga === gb ? 'Van parejos: elige según lo que más le importe al cliente.' : `<b>${esc(ga > gb ? a.modelo : b.modelo)}</b> gana en ${Math.max(ga, gb)} de ${ga + gb} puntos comparables.`}</p>
    <div class="vs-tabla">${cuerpo}</div>
  </div>`;
  raiz.scrollTop = 0;
}
