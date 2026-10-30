/* ============================================================
   CUIDA LA MESA · lo esencial para cuidar el mueble
   Textos en data/mesa.json
   ============================================================ */
import { V, $, $$, cargarJson, esc, soportaWebGL2, reduceMovimiento } from './util.js?v=20261030h';

let datos = null, raiz = null, escena3d = null, montado = null;
let paso = 0, empujado = false, abiertoId = null, ultimoFoco = null;

const ICO = {
  usa: '<svg viewBox="0 0 24 24"><path d="M4 7h16M7 7v12M17 7v12M10 4h4"/></svg>',
  rapido: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></svg>',
  foto: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
};

export function montar(cont) {
  if (montado) { escena3d?.reanudar(); return montado; }
  raiz = cont;
  montado = (async () => {
    datos = await cargarJson('data/mesa.json');
    pintar();
    await iniciar3D();
  })();
  return montado;
}

export function salir() {
  if (abiertoId) cerrarPanel(true);
  escena3d?.pausar();
}

/** Ruta: #/mesa/<zona | situación | pasos | producto-n> */
export async function ruta(sub) {
  await montado;
  if (!sub) { if (abiertoId) cerrarPanel(true); return; }
  if (sub === 'pasos' || sub === 'situaciones') {
    if (abiertoId) cerrarPanel(true);
    irA(`m-${sub}`);
    return;
  }
  const mp = /^producto-(\d+)$/.exec(sub);
  if (mp) { if (abiertoId) cerrarPanel(true); irA('m-productos'); elegirProducto(+mp[1]); return; }
  if (datos.zonas.some((z) => z.id === sub) || datos.situaciones.some((s) => s.id === sub)) {
    empujado = false;
    abrirPanel(sub, true);
  } else history.replaceState(null, '', '#/mesa');
}

function irA(id) {
  const el = document.getElementById(id);
  if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: reduceMovimiento() ? 'auto' : 'smooth', block: 'start' }));
}

/* ---------------- Contenido ---------------- */
function pintar() {
  const m = datos.meta;
  raiz.innerHTML = `
  <div class="contenedor">
    <header class="h-herr">
      <span class="eyebrow">Mesa de exhibición</span>
      <h1>${esc(m.titulo)}</h1>
      <p>${esc(m.subtitulo)}</p>
    </header>

    <div class="mesa-hero">
      <div>
        <div class="mesa-escena" id="mesa-escena">
          <canvas id="mesa-lienzo" aria-hidden="true"></canvas>
          <div class="mesa-pins" id="mesa-pins" role="group" aria-label="Zonas de la mesa"></div>
          <span class="mesa-ayuda">Toca un punto para ver cómo cuidar esa zona</span>
        </div>
        <div class="zonas-chips" aria-label="Zonas de la mesa">
          ${datos.zonas.map((z) => `<button type="button" class="zchip" data-zona="${z.id}" aria-pressed="false">${esc(z.corto)}</button>`).join('')}
        </div>
      </div>
      <div class="tu-parte" aria-label="Lo que te toca a ti">
        ${datos.tu_parte.map((t, i) => `
          <div class="tp"><span class="tp-ico" aria-hidden="true">${[ICO.usa, ICO.rapido, ICO.foto][i] || ICO.usa}</span>
          <div><h3>${esc(t.titulo)}</h3><p>${esc(t.texto)}</p></div></div>`).join('')}
      </div>
    </div>

    <section class="seccion" id="m-situaciones" aria-labelledby="h-sit">
      <h2 id="h-sit">¿Qué hago si…?</h2>
      <p class="sec-sub">Toca lo que está pasando y sigue los pasos.</p>
      <div class="situaciones">
        ${datos.situaciones.map((s) => `<button type="button" class="sit" data-sit="${s.id}"><span class="sit-zona">${esc(zona(s.zona)?.corto || '')}</span>${esc(s.titulo)}</button>`).join('')}
      </div>
    </section>

    <section class="seccion" id="m-productos" aria-labelledby="h-prod">
      <h2 id="h-prod">¿Puedo usar esto?</h2>
      <p class="sec-sub">Toca un producto y te digo si se puede usar en la mesa.</p>
      <div class="productos" role="group" aria-label="Productos">
        ${datos.productos.map((p, i) => `<button type="button" class="prod ${p.ok ? 'si' : 'no'}" data-prod="${i}" aria-pressed="false">${esc(p.nombre)}</button>`).join('')}
      </div>
      <div class="veredicto" id="veredicto" aria-live="polite">
        <span class="v-ico" aria-hidden="true">?</span>
        <div><strong>Elige un producto</strong><span>La respuesta aparece aquí.</span></div>
      </div>
    </section>

    <section class="seccion" id="m-pasos" aria-labelledby="h-pasos">
      <h2 id="h-pasos">Si te toca limpiar: 5 pasos</h2>
      <p class="sec-sub">En este orden. Avanza cuando termines cada uno.</p>
      <div class="pasos">
        <div class="pasos-barra" role="tablist" aria-label="Pasos">
          ${datos.pasos.map((p, i) => `<button type="button" role="tab" data-paso="${i}" aria-label="Paso ${i + 1}: ${esc(p.titulo)}"></button>`).join('')}
        </div>
        <div class="paso-actual" id="paso-actual" aria-live="polite"></div>
        <div class="pasos-nav">
          <button type="button" class="btn btn-sec" id="paso-ant">← Anterior</button>
          <button type="button" class="btn btn-primario" id="paso-sig">Siguiente →</button>
        </div>
      </div>
    </section>

  </div>`;

  // Eventos
  $$('.zchip', raiz).forEach((b) => b.addEventListener('click', () => abrirPanel(b.dataset.zona)));
  $$('.sit', raiz).forEach((b) => b.addEventListener('click', () => abrirPanel(b.dataset.sit)));
  $$('.prod', raiz).forEach((b) => b.addEventListener('click', () => elegirProducto(+b.dataset.prod)));
  $$('.pasos-barra button', raiz).forEach((b) => b.addEventListener('click', () => mostrarPaso(+b.dataset.paso)));
  $('#paso-ant', raiz).addEventListener('click', () => mostrarPaso(paso - 1));
  $('#paso-sig', raiz).addEventListener('click', () => mostrarPaso(paso + 1 >= datos.pasos.length ? 0 : paso + 1));
  mostrarPaso(0, true);

}

const zona = (id) => datos.zonas.find((z) => z.id === id);
const situacion = (id) => datos.situaciones.find((s) => s.id === id);

function elegirProducto(i) {
  const p = datos.productos[i]; if (!p) return;
  $$('.prod', raiz).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.prod === i)));
  const v = $('#veredicto', raiz);
  v.className = 'veredicto ' + (p.ok ? 'si' : 'no');
  v.innerHTML = `<span class="v-ico" aria-hidden="true">${p.ok ? '✓' : '✕'}</span><div><strong>${p.ok ? 'Sí, se puede' : 'No lo uses'}: ${esc(p.nombre.toLowerCase())}</strong><span>${esc(p.por)}</span></div>`;
  void v.offsetWidth; v.classList.add('cambio');
}

function mostrarPaso(i, inicial) {
  paso = Math.max(0, Math.min(datos.pasos.length - 1, i));
  const p = datos.pasos[paso];
  $$('.pasos-barra button', raiz).forEach((b, k) => { b.classList.toggle('hecho', k <= paso); b.setAttribute('aria-selected', String(k === paso)); });
  const c = $('#paso-actual', raiz);
  c.innerHTML = `<span class="paso-num">${paso + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p>`;
  if (!inicial) { c.classList.remove('cambio'); void c.offsetWidth; c.classList.add('cambio'); }
  $('#paso-ant', raiz).disabled = paso === 0;
  $('#paso-sig', raiz).textContent = paso === datos.pasos.length - 1 ? 'Volver al inicio ↺' : 'Siguiente →';
}

/* ---------------- Panel de zona / situación ---------------- */
const panel = $('#panel'), fondo = $('#fondo-panel');
$('#panel-cerrar').addEventListener('click', () => cerrarPanel());
fondo.addEventListener('click', () => cerrarPanel());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abiertoId && $('#buscador').hidden) cerrarPanel(); });

function abrirPanel(id, desdeRuta) {
  const z = zona(id), s = situacion(id);
  if (!z && !s) return;
  if (!abiertoId) ultimoFoco = document.activeElement;
  if (!desdeRuta) {
    try {
      if (!abiertoId && !empujado) { history.pushState({ mesa: id }, '', '#/mesa/' + id); empujado = true; }
      else history.replaceState({ mesa: id }, '', '#/mesa/' + id);
    } catch { /* sin historial */ }
  }
  abiertoId = id;
  const cuerpo = $('#panel-cuerpo');
  if (z) {
    $('#panel-cat').textContent = 'Zona de la mesa';
    $('#panel-titulo').textContent = z.nombre;
    cuerpo.innerHTML = `
      <p class="z-rol">${esc(z.rol)}</p>
      <h3>Cuídala así</h3><ul class="lista ok">${z.cuidar.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <h3>Evita</h3><ul class="lista no">${z.evitar.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="caja-avisa"><strong>Si pasa algo:</strong> ${esc(z.si_pasa)}</div>`;
  } else {
    $('#panel-cat').textContent = '¿Qué hago si…?';
    $('#panel-titulo').textContent = s.titulo;
    cuerpo.innerHTML = `
      <h3>Haz esto</h3><ul class="lista ok">${s.haz.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <h3>No hagas</h3><ul class="lista no">${s.no_hagas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="caja-avisa"><strong>Avisa:</strong> ${esc(s.avisa)}</div>`;
  }
  $$('.zchip', raiz).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.zona === (z ? z.id : s.zona))));
  panel.hidden = false; fondo.hidden = false;
  cuerpo.scrollTop = 0;
  escena3d?.enfocar(z ? z.id : s.zona);
  // Si la mesa no está a la vista, el foco 3D igual queda listo; el panel es lo principal
  $('#panel-cerrar').focus({ preventScroll: true });
}

function cerrarPanel(desdeRuta) {
  if (!abiertoId) return;
  abiertoId = null;
  panel.hidden = true; fondo.hidden = true;
  $$('.zchip', raiz).forEach((b) => b.setAttribute('aria-pressed', 'false'));
  escena3d?.desenfocar();
  if (!desdeRuta) {
    try {
      if (empujado) { empujado = false; history.back(); }
      else history.replaceState(null, '', '#/mesa');
    } catch { /* sin historial */ }
  } else empujado = false;
  if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus({ preventScroll: true });
}

/* ---------------- Escena 3D (o dibujo 2D) ---------------- */
async function iniciar3D() {
  const cont = $('#mesa-escena', raiz);
  if (!soportaWebGL2() || new URLSearchParams(location.search).get('modo') === '2d') return pintar2D(cont);
  try {
    const { crearMesa3D } = await import(`./mesa3d.js?v=${V}`);
    escena3d = crearMesa3D({ contenedor: cont, lienzo: $('#mesa-lienzo', cont), capaPins: $('#mesa-pins', cont), zonas: datos.zonas, alElegir: (id) => abrirPanel(id) });
    // Solo dibuja mientras la mesa está a la vista
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { if (!raiz.hidden && e.isIntersecting) escena3d.reanudar(); else escena3d.pausar(); }).observe(cont);
    }
    $('#mesa-lienzo', cont).addEventListener('webglcontextlost', (e) => { e.preventDefault(); escena3d = null; pintar2D(cont); });
  } catch (e) {
    console.warn('Mesa 3D no disponible:', e);
    pintar2D(cont);
  }
}

function pintar2D(cont) {
  $('#mesa-lienzo', cont)?.remove();
  const pos = { superficie: [24, 38], panel: [50, 16], habladores: [76, 44], luz: [93, 55], madera: [57, 72], base: [16, 80] };
  const d = document.createElement('div'); d.className = 'mesa-2d';
  d.innerHTML = `<svg viewBox="0 0 400 200" aria-hidden="true">
    <rect x="150" y="20" width="100" height="44" rx="6" fill="#1E5EFF"/><rect x="190" y="64" width="20" height="10" fill="#E9EEF0"/>
    <path d="M40 74 H360 a14 14 0 0 1 0 28 H40 a14 14 0 0 1 0 -28 Z" fill="#F6F8F8"/>
    <path d="M44 104 H356" stroke="#28B4FF" stroke-width="4" stroke-linecap="round"/>
    <rect x="148" y="106" width="104" height="70" rx="3" fill="#CDB89A"/>
    <rect x="62" y="106" width="12" height="72" rx="2" fill="#E9EEF0"/><rect x="326" y="106" width="12" height="72" rx="2" fill="#E9EEF0"/>
    ${[80, 110, 290, 320].map((x) => `<rect x="${x - 10}" y="78" width="20" height="10" rx="2" fill="#13407A"/><rect x="${x - 8}" y="66" width="16" height="10" rx="2" fill="#fff" stroke="#9FB0BC"/>`).join('')}
  </svg>`;
  cont.prepend(d);
  const capa = $('#mesa-pins', cont);
  capa.innerHTML = datos.zonas.map((z) => `<button type="button" class="pin" data-zona="${z.id}" style="left:${pos[z.id][0]}%;top:${pos[z.id][1]}%;transform:translate(-16px,-17px)" aria-label="${esc(z.nombre)}"><span class="pin-punto" aria-hidden="true"></span><span class="pin-txt">${esc(z.corto)}</span></button>`).join('');
  $$('.pin', capa).forEach((b) => b.addEventListener('click', () => abrirPanel(b.dataset.zona)));
}
