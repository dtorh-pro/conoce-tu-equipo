/* ============================================================
   VISTA 2D DE RESPALDO (sin WebGL)
   Mismo contenido, mismas etiquetas y popups. Al seleccionar,
   el dibujo se acerca a la zona y marca el punto exacto.
   ============================================================ */
import { zonaDe } from './zonas.js?v=20261030c';

const FRENTE = `
<svg viewBox="0 0 100 205" aria-hidden="true">
  <rect x="2" y="2" width="96" height="201" rx="15" fill="#B9C1CD"/>
  <rect x="4" y="4" width="92" height="197" rx="13" fill="#05070B"/>
  <rect x="7" y="7" width="86" height="191" rx="11" fill="url(#gf)"/>
  <defs><linearGradient id="gf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#04B84C"/><stop offset=".5" stop-color="#037A6E"/><stop offset="1" stop-color="#1236D8"/></linearGradient></defs>
  <circle cx="50" cy="12" r="2.6" fill="#0B0E14"/>
  <text x="50" y="44" text-anchor="middle" fill="#fff" font-size="15" font-weight="300" font-family="system-ui,sans-serif">10:08</text>
  <g fill="#fff" opacity=".85">${Array.from({ length: 12 }, (_, i) => `<rect x="${14 + (i % 4) * 19}" y="${72 + Math.floor(i / 4) * 24}" width="13" height="13" rx="3.5"/>`).join('')}</g>
  <rect x="11" y="176" width="78" height="17" rx="8" fill="#fff" opacity=".2"/>
  <rect x="97.5" y="44" width="2.5" height="26" rx="1" fill="#9AA4B2"/>
  <rect x="97.5" y="76" width="2.8" height="16" rx="1" fill="#D3D9E2"/>
  <rect x="0" y="52" width="1.8" height="24" rx="1" fill="#5E6774"/>
  <rect x="42" y="201.5" width="16" height="2.5" rx="1.2" fill="#0B0E14"/>
  <g fill="#0B0E14">${[68, 72, 76, 80, 84].map((x) => `<circle cx="${x}" cy="202.6" r="1"/>`).join('')}<circle cx="22" cy="202.6" r="1.8"/></g>
</svg>`;

const REVERSO = `
<svg viewBox="0 0 100 205" aria-hidden="true">
  <rect x="2" y="2" width="96" height="201" rx="15" fill="#B9C1CD"/>
  <rect x="4" y="4" width="92" height="197" rx="13" fill="#0F3A5C"/>
  <g opacity=".55" fill="none" stroke="#CFE0FF" stroke-width="1" stroke-dasharray="2 2">
    <rect x="9" y="8" width="82" height="70" rx="4"/>
    <rect x="22" y="22" width="22" height="22" rx="2"/>
    <rect x="22" y="10" width="22" height="9" rx="2"/>
    <rect x="54" y="33" width="20" height="14" rx="2"/>
    <rect x="9" y="84" width="82" height="112" rx="6"/>
  </g>
  <text x="50" y="146" text-anchor="middle" fill="#CFE0FF" opacity=".7" font-size="7" font-family="system-ui,sans-serif">BATERÍA</text>
  <rect x="52" y="12" width="38" height="50" rx="10" fill="#0B2A4A"/>
  <circle cx="71" cy="24" r="8.5" fill="#D3D9E2"/><circle cx="71" cy="24" r="6.6" fill="#141A26"/>
  <circle cx="71" cy="46" r="8.5" fill="#D3D9E2"/><circle cx="71" cy="46" r="6.6" fill="#141A26"/>
  <circle cx="58" cy="35" r="2.6" fill="#FFF3D1"/>
  <rect x="30" y="0" width="1.6" height="4" fill="#5E6774"/><rect x="68" y="0" width="1.6" height="4" fill="#5E6774"/>
</svg>`;

export function crearVista2D({ contenedor, specs, cats }) {
  contenedor.hidden = false;
  contenedor.innerHTML = `
    <div class="v2-telefonos">
      <figure class="v2-tel" data-lado="frente">${FRENTE}<span class="v2-punto"></span><figcaption>Frente</figcaption></figure>
      <figure class="v2-tel" data-lado="reverso">${REVERSO}<span class="v2-punto"></span><figcaption>Reverso (vista interna)</figcaption></figure>
    </div>
    <div class="v2-lista" role="list" aria-label="Especificaciones"></div>`;
  const lista = contenedor.querySelector('.v2-lista');
  const tels = {
    frente: contenedor.querySelector('[data-lado="frente"]'),
    reverso: contenedor.querySelector('[data-lado="reverso"]')
  };

  // Etiquetas agrupadas por categoría (los mismos botones de la vista 3D)
  let catActual = null;
  specs.forEach((s) => {
    if (s.categoria !== catActual) {
      catActual = s.categoria;
      const h = document.createElement('p');
      h.className = 'v2-grupo'; h.dataset.cat = s.categoria;
      h.style.color = cats[s.categoria].color;
      h.textContent = cats[s.categoria].nombre;
      lista.appendChild(h);
    }
    s._boton.style.transform = '';
    lista.appendChild(s._boton);
  });

  function limpiar() {
    Object.values(tels).forEach((t) => {
      t.style.transform = '';
      t.querySelector('.v2-punto').classList.remove('activo');
    });
  }

  return {
    enfocar(spec) {
      limpiar();
      const z = zonaDe(spec).d2;
      const t = tels[z.lado] || tels.frente;
      const punto = t.querySelector('.v2-punto');
      punto.style.left = `${z.x}%`;
      punto.style.top = `${(z.y / 100) * t.offsetWidth * 2.05}px`;
      punto.style.setProperty('--c', cats[spec.categoria].color);
      punto.classList.add('activo');
      t.style.transformOrigin = `${z.x}% ${z.y}%`;
      t.style.transform = 'scale(1.5)';
      contenedor.scrollTo({ top: 0, behavior: 'smooth' });
    },
    desenfocar: limpiar,
    filtrar(filtro) {
      lista.querySelectorAll('.v2-grupo').forEach((h) => { h.hidden = !!filtro && h.dataset.cat !== filtro; });
    },
    destruir() {
      contenedor.hidden = true;
      contenedor.innerHTML = '';
    }
  };
}
