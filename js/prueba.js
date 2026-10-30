/* ============================================================
   PONTE A PRUEBA · preguntas en data/prueba.json
   ============================================================ */
import { $, $$, cargarJson, esc, guardar, reduceMovimiento } from './util.js?v=20261030d';

let datos = null, raiz = null, montado = null;
let tema = 'todo', ronda = [], i = 0, aciertos = 0, fallas = [];

export function montar(cont) {
  if (montado) return montado;
  raiz = cont;
  montado = (async () => { datos = await cargarJson('data/prueba.json'); portada(); })();
  return montado;
}
export function ruta() { /* sin subrutas */ }

function contenedor(html) {
  raiz.innerHTML = `<div class="quiz">${html}</div>`;
}

function portada() {
  const mejor = guardar.leer('mejor');
  const n = Math.min(datos.meta.preguntas_por_ronda, datos.preguntas.length);
  contenedor(`
    <header class="h-herr quiz-inicio">
      <span class="eyebrow">Práctica</span>
      <h1>${esc(datos.meta.titulo)}</h1>
      <p>${n} preguntas al azar. Después de cada respuesta verás por qué es así, con enlace a la explicación completa.</p>
    </header>
    ${mejor ? `<div class="record">Tu mejor puntaje: <b>${mejor.aciertos} de ${mejor.total}</b></div>` : ''}
    <div class="temas" role="group" aria-label="Tema">
      ${[['todo', 'Todo'], ['equipo', 'Solo el equipo'], ['mesa', 'Solo la mesa']].map(([k, t]) => `<button type="button" class="tema-btn" data-tema="${k}" aria-pressed="${k === tema}">${t}</button>`).join('')}
    </div>
    <button type="button" class="btn btn-primario" id="q-empezar">Empezar</button>`);
  $$('.tema-btn', raiz).forEach((b) => b.addEventListener('click', () => {
    tema = b.dataset.tema; $$('.tema-btn', raiz).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('#q-empezar', raiz).addEventListener('click', empezar);
}

function barajar(a) { const b = [...a]; for (let k = b.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [b[k], b[j]] = [b[j], b[k]]; } return b; }

function empezar() {
  const pool = datos.preguntas.filter((p) => tema === 'todo' || p.tema === tema);
  ronda = barajar(pool).slice(0, Math.min(datos.meta.preguntas_por_ronda, pool.length)).map((p) => {
    // Mezcla las opciones conservando cuál es la correcta
    const orden = barajar(p.opciones.map((_, k) => k));
    return { ...p, opciones: orden.map((k) => p.opciones[k]), correcta: orden.indexOf(p.correcta) };
  });
  i = 0; aciertos = 0; fallas = [];
  pregunta();
}

function pregunta() {
  const p = ronda[i];
  contenedor(`
    <div class="q-progreso" aria-hidden="true"><i style="width:${(i / ronda.length) * 100}%"></i></div>
    <div class="q-cabeza"><span>Pregunta ${i + 1} de ${ronda.length}</span><span>${aciertos} correctas</span></div>
    <div class="q-tarjeta cambio">
      <span class="q-tema">${p.tema === 'mesa' ? 'Cuida la mesa' : 'Conoce tu equipo'}</span>
      <h2 class="q-pregunta" id="q-texto">${esc(p.pregunta)}</h2>
      <div class="opciones" role="group" aria-labelledby="q-texto">
        ${p.opciones.map((o, k) => `<button type="button" class="opcion" data-k="${k}"><span class="letra" aria-hidden="true">${'ABCD'[k]}</span>${esc(o)}</button>`).join('')}
      </div>
      <div id="q-explica"></div>
      <div class="q-acciones" id="q-acciones" hidden><button type="button" class="btn btn-primario" id="q-sig">${i === ronda.length - 1 ? 'Ver resultado' : 'Siguiente →'}</button></div>
    </div>`);
  $$('.opcion', raiz).forEach((b) => b.addEventListener('click', () => responder(+b.dataset.k)));
  $('.opcion', raiz).focus({ preventScroll: true });
}

function responder(k) {
  const p = ronda[i];
  const bien = k === p.correcta;
  if (bien) aciertos++; else fallas.push(p);
  $$('.opcion', raiz).forEach((b) => {
    b.disabled = true;
    const n = +b.dataset.k;
    if (n === p.correcta) b.classList.add('correcta');
    else if (n === k) b.classList.add('incorrecta');
  });
  $('#q-explica', raiz).innerHTML = `<div class="explica ${bien ? 'bien' : 'mal'}" role="status"><b>${bien ? '¡Correcto!' : 'No exactamente.'}</b> ${esc(p.explicacion)} ${p.ver ? `<a href="${p.ver}">Ver la explicación →</a>` : ''}</div>`;
  $('.q-cabeza span:last-child', raiz).textContent = `${aciertos} correctas`;
  $('.q-progreso i', raiz).style.width = `${((i + 1) / ronda.length) * 100}%`;
  $('#q-acciones', raiz).hidden = false;
  const sig = $('#q-sig', raiz);
  sig.addEventListener('click', () => { i++; i < ronda.length ? pregunta() : resultado(); });
  sig.focus({ preventScroll: true });
  sig.scrollIntoView({ block: 'nearest', behavior: reduceMovimiento() ? 'auto' : 'smooth' });
}

function resultado() {
  const total = ronda.length;
  const pct = Math.round((aciertos / total) * 100);
  const mejor = guardar.leer('mejor');
  const nuevoRecord = !mejor || aciertos / total > mejor.aciertos / mejor.total;
  if (nuevoRecord) guardar.escribir('mejor', { aciertos, total });
  const mensaje = pct === 100 ? 'Perfecto. Estás listo para cualquier pregunta del cliente.'
    : pct >= 80 ? 'Muy bien. Repasa las que fallaste y quedas al cien.'
      : pct >= 50 ? 'Vas bien. Revisa las explicaciones y vuelve a intentarlo.'
        : 'Buen comienzo. Repasa las herramientas y vuelve a intentarlo.';
  contenedor(`
    <div class="resultado">
      <div class="res-anillo">
        <svg class="anillo" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="48" class="anillo-fondo"/><circle cx="60" cy="60" r="48" class="anillo-valor" id="anillo-res" pathLength="100"/>
        </svg>
        <span class="anillo-num">${aciertos}/${total}</span>
      </div>
      <h2>${nuevoRecord ? 'Nuevo récord' : 'Resultado'}: ${pct}%</h2>
      <p>${mensaje}</p>
      ${fallas.length ? `<div class="repaso"><p class="res-grupo">Para repasar</p>${fallas.map((p) => `<div class="repaso-item"><b>${esc(p.pregunta)}</b>${esc(p.explicacion)} ${p.ver ? `<a href="${p.ver}">Ver →</a>` : ''}</div>`).join('')}</div>` : ''}
      <div class="acciones">
        <button type="button" class="btn btn-primario" id="q-otra">Jugar otra vez</button>
        <a class="btn btn-sec" href="#/">Volver al inicio</a>
      </div>
    </div>`);
  requestAnimationFrame(() => requestAnimationFrame(() => { $('#anillo-res', raiz).style.strokeDasharray = `${pct} 100`; }));
  $('#q-otra', raiz).addEventListener('click', empezar);
  raiz.scrollTop = 0;
}
