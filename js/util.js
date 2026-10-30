/* Utilidades compartidas */
export const V = '20261030h';
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

/* Íconos de cada especificación (trazos de 24 px, heredan el color) */
const ICONOS_SPEC = {
  procesador: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  ram: '<rect x="3" y="7" width="18" height="9" rx="1.5"/><path d="M7 10v3M11 10v3M15 10v3M6 16v3M18 16v3"/>',
  almacenamiento: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  sistema: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/><path d="m9 12 2 2 4-4"/>',
  'camara-principal': '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  'camara-frontal': '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><circle cx="12" cy="10" r="2.5"/><path d="M8.5 16.5c.8-1.5 2-2.2 3.5-2.2s2.7.7 3.5 2.2"/>',
  bateria: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3M11.5 9l-2 3h3l-2 3"/>',
  pantalla: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M6 6h12M6 18h12"/>',
  audio: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  conectividad: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.2" r="1"/>',
  sim: '<path d="M7 3h7l4 4v14H7z"/><rect x="9.5" y="11" width="6" height="7" rx="1"/>',
  seguridad: '<path d="M12 11.5v4M8.6 8.6A4.8 4.8 0 0 1 16.8 12v2.5M7.2 12.6c0 3 .9 5 2.3 7M12 7.2A4.8 4.8 0 0 0 7.2 12M14.8 15.6c0 2-.5 3.6-1.4 5M5 9.2A8 8 0 0 1 19 10"/>',
  resistencia: '<path d="M12 3c3 4 6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 3-7 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>'
};
export function iconoSpec(id, extra = '') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${ICONOS_SPEC[id] || '<circle cx="12" cy="12" r="7"/>'}</svg>`;
}
