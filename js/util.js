/* Utilidades compartidas */
export const V = '20261030d';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const cacheJson = {};
export function cargarJson(ruta) {
  // Los textos se piden siempre frescos para que una edición se vea al recargar
  if (!cacheJson[ruta]) {
    cacheJson[ruta] = fetch(ruta, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('No se pudo leer ' + ruta);
      return r.json();
    }).catch((e) => { delete cacheJson[ruta]; throw e; });
  }
  return cacheJson[ruta];
}

export function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Quita tildes y pasa a minúsculas para comparar textos */
export function normalizar(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export const guardar = {
  leer(clave, defecto = null) {
    try { const v = localStorage.getItem('kit:' + clave); return v === null ? defecto : JSON.parse(v); } catch { return defecto; }
  },
  escribir(clave, valor) {
    try { localStorage.setItem('kit:' + clave, JSON.stringify(valor)); } catch { /* almacenamiento no disponible */ }
  }
};

let temporizadorAviso;
export function avisar(texto) {
  const a = document.getElementById('aviso');
  if (!a) return;
  a.textContent = texto;
  a.hidden = false;
  a.style.animation = 'none'; void a.offsetWidth; a.style.animation = '';
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { a.hidden = true; }, 2200);
}

export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch { /* sin portapapeles */ }
    t.remove();
  }
  avisar('Copiado');
}

export const reduceMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function soportaWebGL2() {
  if (soportaWebGL2._v !== undefined) return soportaWebGL2._v;
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGL2RenderingContext && c.getContext('webgl2');
    soportaWebGL2._v = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { soportaWebGL2._v = false; }
  return soportaWebGL2._v;
}

export const iconos = {
  copiar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
  ver: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  usar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V7a5 5 0 0 1 10 0v4"/><rect x="5" y="11" width="14" height="9" rx="2"/></svg>',
  rayo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>',
  camara: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  mano: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V12m0-2.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3L4.5 14a1.5 1.5 0 0 1 2.5-1.6L7 12"/></svg>'
};
