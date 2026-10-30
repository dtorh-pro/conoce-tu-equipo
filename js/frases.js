/* ============================================================
   FRASES DE VENTA · usa las frases de data/especificaciones.json
   ============================================================ */
import { $, $$, cargarJson, esc, copiar, guardar, iconos, iconoSpec } from './util.js?v=20261030i';

let datos = null, raiz = null, montado = null;
let filtro = null, practica = false;
const reveladas = new Set();

export function montar(cont) {
  if (montado) return montado;
  raiz = cont;
  practica = guardar.leer('practica', false);
  montado = (async () => { datos = await cargarJson('data/especificaciones.json'); pintar(); })();
  return montado;
}
export function ruta() { /* sin subrutas */ }

function pintar() {
  const cats = datos.categorias;
  raiz.innerHTML = `
  <div class="contenedor">
    <header class="h-herr">
      <h1 class="sr">Frases de venta</h1>
      <p>Una frase corta por especificación, en lenguaje natural. Cópiala o practícala antes de atender.</p>
    </header>
    <div class="frases-filtros" role="group" aria-label="Categoría">
      <button type="button" class="f-filtro todas" data-cat="" aria-pressed="true">Todas</button>
      ${cats.map((c) => `<button type="button" class="f-filtro" data-cat="${c.id}" style="--c:${c.color}" aria-pressed="false">${esc(c.nombre)}</button>`).join('')}
    </div>
    <div class="practica">
      <p><strong>Modo práctica</strong>Oculta las frases: intenta decirla tú y luego tócala para comparar.</p>
      <button type="button" class="interruptor" id="f-practica" role="switch" aria-checked="${practica}" aria-label="Modo práctica"></button>
    </div>
    <div class="lista-frases" id="f-lista" aria-live="polite"></div>
  </div>`;
  $$('.f-filtro', raiz).forEach((b) => b.addEventListener('click', () => {
    filtro = b.dataset.cat || null;
    $$('.f-filtro', raiz).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    lista();
  }));
  $('#f-practica', raiz).addEventListener('click', (e) => {
    practica = !practica; guardar.escribir('practica', practica); reveladas.clear();
    e.currentTarget.setAttribute('aria-checked', String(practica));
    lista();
  });
  lista();
}

function lista() {
  const cats = Object.fromEntries(datos.categorias.map((c) => [c.id, c]));
  const specs = datos.especificaciones.filter((s) => s.frase && (!filtro || s.categoria === filtro));
  $('#f-lista', raiz).innerHTML = specs.map((s, k) => {
    const oculta = practica && !reveladas.has(s.id);
    return `<article class="f-tarjeta" style="--c:${cats[s.categoria]?.color};animation-delay:${Math.min(k, 8) * 35}ms">
      <span class="f-ico">${iconoSpec(s.id)}</span>
      <div>
      <div class="f-cabeza">
        <span class="f-spec">${esc(s.etiqueta)}</span>
        <div class="f-acciones">
          <button type="button" class="icono-btn" data-copiar="${s.id}" aria-label="Copiar la frase de ${esc(s.etiqueta)}">${iconos.copiar}</button>
          <a class="icono-btn" href="#/equipo/${s.id}" aria-label="Ver ${esc(s.etiqueta)} en el equipo 3D">${iconos.ver}</a>
        </div>
      </div>
      ${oculta ? `<button type="button" class="f-oculta" data-revelar="${s.id}">Di la frase y toca para comparar</button>` : `<p class="f-texto">“${esc(s.frase)}”</p>`}
      </div>
    </article>`;
  }).join('');
  $$('[data-copiar]', raiz).forEach((b) => b.addEventListener('click', () => {
    const s = datos.especificaciones.find((x) => x.id === b.dataset.copiar); copiar(s.frase);
  }));
  $$('[data-revelar]', raiz).forEach((b) => b.addEventListener('click', () => { reveladas.add(b.dataset.revelar); lista(); }));
}
