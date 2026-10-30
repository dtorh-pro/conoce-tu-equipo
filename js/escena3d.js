/* ============================================================
   ESCENA 3D (Three.js)
   Smartphone genérico construido con geometría propia,
   etiquetas flotantes, giro con dedo/mouse y acercamiento
   de cámara por zona.
   ============================================================ */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Shape, Path,
  ExtrudeGeometry, ShapeGeometry, BoxGeometry, CylinderGeometry, PlaneGeometry,
  MeshStandardMaterial, MeshBasicMaterial, HemisphereLight, DirectionalLight,
  CanvasTexture, SRGBColorSpace, Vector3, Matrix4, Euler, Quaternion, MathUtils
} from './vendor/three.min.js?v=20261030j';
import { zonaDe } from './zonas.js?v=20261030j';
import { iconoSpec } from './util.js?v=20261030j';

const FOV = 32;
const T = Math.tan(MathUtils.degToRad(FOV / 2));
const ANCHO_TEL = 1.04;          // media anchura del teléfono (unidades 3D)
const ALTO_TEL = 2.08;           // media altura

/* ---------- Geometrías auxiliares ---------- */
function rectRedondo(w, h, r, forma = new Shape()) {
  const x = -w / 2, y = -h / 2;
  forma.moveTo(x + r, y);
  forma.lineTo(x + w - r, y); forma.quadraticCurveTo(x + w, y, x + w, y + r);
  forma.lineTo(x + w, y + h - r); forma.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  forma.lineTo(x + r, y + h); forma.quadraticCurveTo(x, y + h, x, y + h - r);
  forma.lineTo(x, y + r); forma.quadraticCurveTo(x, y, x + r, y);
  return forma;
}
function planoRedondo(w, h, r) {
  const g = new ShapeGeometry(rectRedondo(w, h, r), 10);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return g;
}

/* ---------- Textura de la pantalla (interfaz genérica, sin marcas) ---------- */
function texturaPantalla() {
  const W = 512, H = 1072;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // Fondo de pantalla abstracto
  const fondo = g.createLinearGradient(0, 0, W, H);
  fondo.addColorStop(0, '#04B84C'); fondo.addColorStop(.5, '#037A6E'); fondo.addColorStop(1, '#1236D8');
  g.fillStyle = fondo; g.fillRect(0, 0, W, H);
  // Velo oscuro superior para que el reloj y la barra de estado se lean bien
  const velo = g.createLinearGradient(0, 0, 0, H * .45);
  velo.addColorStop(0, 'rgba(4, 20, 40, .45)'); velo.addColorStop(1, 'rgba(4, 20, 40, 0)');
  g.fillStyle = velo; g.fillRect(0, 0, W, H * .45);
  g.globalAlpha = .18; g.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.ellipse(W * (.2 + i * .35), H * (.25 + i * .22), 260, 120, -.5, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  // Barra de estado
  g.fillStyle = '#fff'; g.font = '600 26px system-ui, sans-serif'; g.fillText('10:08', 40, 58);
  for (let i = 0; i < 4; i++) g.fillRect(372 + i * 11, 54 - (i + 1) * 6, 7, (i + 1) * 6);
  g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.strokeRect(428, 36, 40, 20); g.fillRect(432, 40, 28, 12); g.fillRect(469, 42, 3, 8);
  // Reloj grande
  g.textAlign = 'center'; g.font = '300 128px system-ui, sans-serif'; g.fillText('10:08', W / 2, 270);
  g.font = '500 28px system-ui, sans-serif'; g.globalAlpha = .85; g.fillText('Viernes, 30 de octubre', W / 2, 320); g.globalAlpha = 1;
  // Íconos genéricos
  const colores = ['#FFFFFF', '#7CF0A6', '#5FD3C4', '#7FB2FF', '#B8F5CF', '#FFFFFF', '#9DE7DD', '#A9C4FF', '#5FE38E', '#C9D8FF', '#FFFFFF', '#4FC3B0'];
  const tam = 84, gap = (W - 4 * tam) / 5;
  colores.forEach((col, i) => {
    const fx = i % 4, fy = Math.floor(i / 4);
    const x = gap + fx * (tam + gap), y = 470 + fy * (tam + 58);
    g.fillStyle = col; redondo(g, x, y, tam, tam, 22); g.fill();
    g.fillStyle = 'rgba(4,40,60,.28)';
    if (i % 3 === 0) { g.beginPath(); g.arc(x + tam / 2, y + tam / 2, 20, 0, Math.PI * 2); g.fill(); }
    else if (i % 3 === 1) { redondo(g, x + 24, y + 24, 36, 36, 6); g.fill(); }
    else { g.beginPath(); g.moveTo(x + 42, y + 20); g.lineTo(x + 64, y + 62); g.lineTo(x + 20, y + 62); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.8)'; redondo(g, x + 14, y + tam + 12, tam - 28, 8, 4); g.fill();
  });
  // Dock
  g.fillStyle = 'rgba(255,255,255,.18)'; redondo(g, 28, H - 170, W - 56, 120, 40); g.fill();
  ['#5FE38E', '#5FD3C4', '#7FB2FF', '#FFFFFF'].forEach((col, i) => { g.fillStyle = col; redondo(g, 58 + i * 108, H - 152, 84, 84, 22); g.fill(); });
  g.fillStyle = 'rgba(255,255,255,.75)'; redondo(g, W / 2 - 70, H - 26, 140, 7, 4); g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function redondo(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function texturaSombra() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, 'rgba(20,28,45,.35)'); r.addColorStop(1, 'rgba(20,28,45,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/* ---------- Modelo del teléfono ---------- */
function construirTelefono() {
  const tel = new Group();
  const m = {
    marco: new MeshStandardMaterial({ color: 0xE4E7EB, emissive: 0x4C5057, emissiveIntensity: .5, metalness: .35, roughness: .2 }),
    tapa: new MeshStandardMaterial({ color: 0xF7F9FB, emissive: 0x6C7178, emissiveIntensity: .85, metalness: .05, roughness: .12, transparent: true, opacity: 1 }),
    negro: new MeshStandardMaterial({ color: 0x0B0E14, metalness: .3, roughness: .25 }),
    lente: new MeshStandardMaterial({ color: 0x141A26, metalness: .9, roughness: .12 }),
    aro: new MeshStandardMaterial({ color: 0xD3D9E2, metalness: .8, roughness: .22 }),
    modulo: new MeshStandardMaterial({ color: 0xEDF0F4, emissive: 0x5A5F67, emissiveIntensity: .7, metalness: .1, roughness: .1 }),
    placa: new MeshStandardMaterial({ color: 0x0F2C6E, roughness: .7 }),
    chip: new MeshStandardMaterial({ color: 0x9AA4B2, metalness: .7, roughness: .3 }),
    chipOsc: new MeshStandardMaterial({ color: 0x2A2F38, roughness: .5 }),
    bateria: new MeshStandardMaterial({ color: 0xD9DEE6, metalness: .2, roughness: .55 }),
    flash: new MeshStandardMaterial({ color: 0xE3ECFF, emissive: 0x3D5A99, roughness: .4 }),
    antena: new MeshStandardMaterial({ color: 0x5E6774, roughness: .6 })
  };

  // Marco (anillo extruido con hueco)
  const exterior = rectRedondo(1.96, 4.06, 0.3);
  exterior.holes.push(rectRedondo(1.84, 3.94, 0.25, new Path()));
  const marco = new Mesh(new ExtrudeGeometry(exterior, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 10 }), m.marco);
  marco.position.z = -0.1;
  tel.add(marco);

  // Pantalla (frente)
  const texPantalla = texturaPantalla();
  const vidrio = new Mesh(planoRedondo(1.96, 4.06, 0.29), new MeshBasicMaterial({ color: 0x05070B }));
  vidrio.position.z = 0.131; tel.add(vidrio);
  const pantalla = new Mesh(planoRedondo(1.86, 3.96, 0.24), new MeshBasicMaterial({ map: texPantalla }));
  pantalla.position.z = 0.132; tel.add(pantalla);
  // Cámara frontal (perforación)
  const perf = new Mesh(new CylinderGeometry(0.06, 0.06, 0.004, 20), m.negro);
  perf.rotation.x = Math.PI / 2; perf.position.set(0, 1.86, 0.134); tel.add(perf);
  const perfLente = new Mesh(new CylinderGeometry(0.03, 0.03, 0.004, 16), m.lente);
  perfLente.rotation.x = Math.PI / 2; perfLente.position.set(0, 1.86, 0.136); tel.add(perfLente);
  // Auricular superior (parlante 2 del estéreo)
  const auricular = new Mesh(new BoxGeometry(0.36, 0.018, 0.004), new MeshBasicMaterial({ color: 0x2B323D }));
  auricular.position.set(0, 2.0, 0.133); tel.add(auricular);

  // Tapa trasera (puede volverse transparente)
  const tapa = new Mesh(planoRedondo(1.96, 4.06, 0.29), m.tapa);
  tapa.rotation.y = Math.PI; tapa.position.z = -0.131; tapa.renderOrder = 2;
  tel.add(tapa);

  // Módulo de cámaras trasero (diseño genérico)
  const mod = new Mesh(new ExtrudeGeometry(rectRedondo(0.74, 1.0, 0.2), { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 8 }), m.modulo);
  mod.rotation.y = Math.PI; mod.position.set(-0.42, 1.38, -0.131); tel.add(mod);
  [1.6, 1.16].forEach((y) => {
    const aro = new Mesh(new CylinderGeometry(0.17, 0.17, 0.05, 28), m.aro);
    aro.rotation.x = Math.PI / 2; aro.position.set(-0.42, y, -0.185); tel.add(aro);
    const lente = new Mesh(new CylinderGeometry(0.135, 0.135, 0.052, 28), m.lente);
    lente.rotation.x = Math.PI / 2; lente.position.set(-0.42, y, -0.188); tel.add(lente);
    const brillo = new Mesh(new CylinderGeometry(0.035, 0.035, 0.002, 12), new MeshBasicMaterial({ color: 0x4A6A9A }));
    brillo.rotation.x = Math.PI / 2; brillo.position.set(-0.38, y + 0.04, -0.215); tel.add(brillo);
  });
  const flash = new Mesh(new CylinderGeometry(0.05, 0.05, 0.02, 16), m.flash);
  flash.rotation.x = Math.PI / 2; flash.position.set(-0.17, 1.38, -0.17); tel.add(flash);

  // Botones laterales: volumen y encendido con huella (derecha)
  const vol = new Mesh(new BoxGeometry(0.05, 0.56, 0.08), m.marco); vol.position.set(1.02, 1.05, 0); tel.add(vol);
  const enc = new Mesh(new BoxGeometry(0.055, 0.34, 0.08), m.aro); enc.position.set(1.025, 0.35, 0); tel.add(enc);
  const sensor = new Mesh(new BoxGeometry(0.01, 0.26, 0.05), m.chipOsc); sensor.position.set(1.054, 0.35, 0); tel.add(sensor);
  // Bandeja SIM (izquierda)
  const sim = new Mesh(new BoxGeometry(0.012, 0.52, 0.07), m.antena); sim.position.set(-1.024, 0.9, 0); tel.add(sim);
  const pin = new Mesh(new CylinderGeometry(0.015, 0.015, 0.02, 10), m.negro); pin.rotation.z = Math.PI / 2; pin.position.set(-1.03, 0.72, 0); tel.add(pin);

  // Borde inferior: puerto USB-C, parlante, conector 3,5 mm
  const puerto = new Mesh(new BoxGeometry(0.3, 0.02, 0.07), m.negro); puerto.position.set(0, -2.05, 0); tel.add(puerto);
  const agujero = new CylinderGeometry(0.022, 0.022, 0.02, 10);
  for (let i = 0; i < 6; i++) { const h = new Mesh(agujero, m.negro); h.position.set(0.4 + i * 0.075, -2.05, 0); tel.add(h); }
  const jack = new Mesh(new CylinderGeometry(0.045, 0.045, 0.02, 16), m.negro); jack.position.set(-0.55, -2.05, 0); tel.add(jack);
  const mic = new Mesh(agujero, m.negro); mic.position.set(-0.3, -2.05, 0); tel.add(mic);
  // Borde superior: micrófono y líneas de antena
  const mic2 = new Mesh(agujero, m.negro); mic2.position.set(0.35, 2.05, 0); tel.add(mic2);
  [[-0.99, 1.72], [0.99, 1.72], [-0.99, -1.72], [0.99, -1.72]].forEach(([x, y]) => {
    const a = new Mesh(new BoxGeometry(0.07, 0.03, 0.262), m.antena); a.position.set(x, y, 0); tel.add(a);
  });
  [[-0.62, 2.05], [0.62, 2.05]].forEach(([x, y]) => {
    const a = new Mesh(new BoxGeometry(0.03, 0.07, 0.262), m.antena); a.position.set(x, y, 0); tel.add(a);
  });

  // Interior (visible al transparentar la tapa)
  const interior = new Group();
  const placa = new Mesh(new BoxGeometry(1.7, 1.42, 0.03), m.placa); placa.position.set(0, 1.2, 0.02); interior.add(placa);
  const soc = new Mesh(new BoxGeometry(0.44, 0.44, 0.05), m.chip); soc.position.set(0.36, 1.12, -0.02); interior.add(soc);
  const socMarca = new Mesh(new BoxGeometry(0.3, 0.3, 0.052), m.chipOsc); socMarca.position.copy(soc.position); interior.add(socMarca);
  const ram = new Mesh(new BoxGeometry(0.44, 0.24, 0.045), m.chipOsc); ram.position.set(0.36, 1.66, -0.02); interior.add(ram);
  const alm = new Mesh(new BoxGeometry(0.4, 0.3, 0.045), m.chipOsc); alm.position.set(-0.3, 0.74, -0.02); interior.add(alm);
  const camInt = new Mesh(new BoxGeometry(0.42, 0.8, 0.06), m.chip); camInt.position.set(-0.42, 1.38, -0.03); interior.add(camInt);
  const bat = new Mesh(new BoxGeometry(1.66, 2.3, 0.1), m.bateria); bat.position.set(0, -0.85, 0); interior.add(bat);
  const banda = new Mesh(new BoxGeometry(1.2, 0.18, 0.102), m.chipOsc); banda.position.set(0, -0.3, 0); interior.add(banda);
  tel.add(interior);

  return { tel, tapa, matTapa: m.tapa };
}

/* ============================================================ */
export async function crearEscena3D({ escenario, lienzo, marcador, capa, specs, cats, alSeleccionar, alPerderContexto }) {
  const esTactil = matchMedia('(pointer: coarse)').matches;
  const reduceMov = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dprMax = esTactil ? 1.75 : 2;

  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  let perdido = false;
  lienzo.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (perdido) return;
    perdido = true;
    alPerderContexto?.();
  });

  const escena = new Scene();
  const camara = new PerspectiveCamera(FOV, 1, 0.1, 100);
  escena.add(new HemisphereLight(0xffffff, 0x8C96A8, 1.6));
  const clave = new DirectionalLight(0xffffff, 2.2); clave.position.set(3, 5, 6); escena.add(clave);
  const contra = new DirectionalLight(0xFFFFFF, 2.1); contra.position.set(-3, 4, -6); escena.add(contra);
  const contra2 = new DirectionalLight(0xFFFFFF, 0.9); contra2.position.set(4, -1, -5); escena.add(contra2);

  const raiz = new Group(); escena.add(raiz);
  const { tel, matTapa } = construirTelefono();
  raiz.add(tel);
  const sombra = new Mesh(new PlaneGeometry(3.2, 1.2), new MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = -2.65; escena.add(sombra);

  /* ---------- Puntos sobre el equipo (uno por especificación) ---------- */
  capa.innerHTML = '';
  specs.forEach((s, i) => {
    const z = zonaDe(s);
    s._ancla = new Vector3(...z.ancla);
    s._normal = new Vector3(...z.normal).normalize();
    const p = document.createElement('button');
    p.type = 'button'; p.className = 'punto'; p.tabIndex = -1;
    p.style.setProperty('--c', cats[s.categoria].color);
    p.style.setProperty('--d', `${(i * 0.37) % 2.6}s`);
    p.setAttribute('aria-label', s.etiqueta.replace(/\u00ad/g, ''));
    p.innerHTML = `<span class="punto-nucleo">${iconoSpec(s.id)}</span><span class="punto-txt"></span>`;
    p.querySelector('.punto-txt').textContent = s.etiqueta.replace(/\u00ad/g, '');
    p.addEventListener('click', () => alSeleccionar(s));
    capa.appendChild(p);
    s._punto = p;
  });

  /* ---------- Estado de animación ---------- */
  let ancho = 1, alto = 1;
  const rot = { x: 0.08, y: -0.5 }, vel = { x: 0, y: 0 };
  const objetivo = { pos: new Vector3(0, 0, 12), mira: new Vector3() };
  const camMira = new Vector3();
  let foco = null;                 // { spec, zona, region }
  let flotacion = 1, opacidadTapa = 1;
  let arrastrando = false, ultimoToque = 0, ultimaX = 0, ultimaY = 0;
  let tiempo = 0, previo = performance.now();

  /* ---------- Tamaño y encuadre ---------- */
  function pxPorUnidadDeseado() {
    // El teléfono ocupa ~84 % del alto del escenario y como máximo ~64 % del ancho
    const porAlto = (alto * 0.84) / (ALTO_TEL * 2);
    const porAncho = (ancho * 0.64) / (ANCHO_TEL * 2);
    return Math.max(30, Math.min(porAlto, porAncho, 280));
  }
  let pxGeneral = 50;              // escala del encuadre general (fija para las etiquetas)
  function encuadreGeneral() {
    const p = pxPorUnidadDeseado();
    pxGeneral = p;
    const d = alto / (2 * T * p);
    objetivo.pos.set(0, 0, d);
    objetivo.mira.set(0, 0, 0);
  }
  function redimensionar() {
    const r = escenario.getBoundingClientRect();
    ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprMax));
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto; camara.updateProjectionMatrix();
    if (!foco) encuadreGeneral();
  }
  // ResizeObserver (Safari 13.1+); si no existe, se usa el evento resize
  let ro = null;
  if ('ResizeObserver' in window) { ro = new ResizeObserver(redimensionar); ro.observe(escenario); }
  else window.addEventListener('resize', redimensionar);
  window.addEventListener('orientationchange', () => setTimeout(redimensionar, 250));
  redimensionar();
  camara.position.copy(objetivo.pos).add(new Vector3(0, 0, 3));

  /* ---------- Enfoque por zona ---------- */
  const tmpM = new Matrix4(), tmpE = new Euler(), tmpV = new Vector3();
  function calcularEnfoque() {
    const z = foco.zona;
    tmpE.set(z.rot[0], z.rot[1], 0, 'XYZ');
    tmpM.makeRotationFromEuler(tmpE);
    const anclaW = tmpV.copy(foco.spec._ancla).applyMatrix4(tmpM);
    // Ubica el ancla en el centro del área libre (sobre el popup)
    // Distancia ajustada al tamaño del área libre (el popup tapa parte de la pantalla)
    const S = Math.min(foco.region.h, foco.region.w * 1.2, 380);
    const d = (alto * z.dist) / S;
    const pxU = alto / (2 * T * d);
    const dx = (foco.region.x - ancho / 2) / pxU;
    const dy = -(foco.region.y - alto / 2) / pxU;
    objetivo.mira.set(anclaW.x - dx, anclaW.y - dy, anclaW.z);
    objetivo.pos.set(objetivo.mira.x, objetivo.mira.y, anclaW.z + d);
  }
  function anguloCercano(actual, meta) {
    let d = (meta - actual) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    return actual + d;
  }

  /* ---------- Interacción: girar con dedo o mouse ---------- */
  const punteros = new Set();
  lienzo.addEventListener('pointerdown', (e) => {
    punteros.add(e.pointerId);
    if (punteros.size > 1) { arrastrando = false; return; }
    arrastrando = true; ultimaX = e.clientX; ultimaY = e.clientY; vel.x = vel.y = 0;
    lienzo.setPointerCapture(e.pointerId);
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const dx = e.clientX - ultimaX, dy = e.clientY - ultimaY;
    ultimaX = e.clientX; ultimaY = e.clientY;
    rot.y += dx * 0.009; rot.x = MathUtils.clamp(rot.x + dy * 0.006, -0.7, 0.7);
    vel.y = dx * 0.009 * 60; vel.x = dy * 0.006 * 60;
    ultimoToque = tiempo;
  });
  const soltar = (e) => { punteros.delete(e.pointerId); arrastrando = false; ultimoToque = tiempo; };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);
  lienzo.addEventListener('lostpointercapture', soltar);

  /* ---------- Bucle ---------- */
  const v = new Vector3(), centro = new Vector3(), unidad = new Vector3(), camDir = new Vector3(), nW = new Vector3();
  const q = new Quaternion();
  let medFps = { n: 0, t: 0, etapa: 0 };
  let rafId = 0;

  function proyectar(vec) {
    v.copy(vec).project(camara);
    return [(v.x + 1) / 2 * ancho, (1 - v.y) / 2 * alto, v.z];
  }

  function cuadro(ahora) {
    rafId = requestAnimationFrame(cuadro);
    const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora; tiempo += dt;
    const k = 1 - Math.exp(-dt * 5.5);

    // Rendimiento adaptativo: si va lento, baja la resolución
    // Mide cada 2 s y baja la resolución por escalones (2 → 1,25 → 1 → 0,75) hasta ir fluido
    if (medFps.etapa < 3) {
      medFps.n++; medFps.t += dt;
      if (medFps.t > 2) {
        const fps = medFps.n / medFps.t;
        const escalones = [1.25, 1, 0.75];
        if (fps < 40 && dprMax > escalones[medFps.etapa]) { dprMax = escalones[medFps.etapa]; redimensionar(); medFps.etapa++; }
        else medFps.etapa = 3;
        medFps.n = 0; medFps.t = 0;
      }
    }

    // Rotación
    if (foco) {
      rot.x += (foco.zona.rot[0] - rot.x) * k;
      rot.y += (anguloCercano(rot.y, foco.zona.rot[1]) - rot.y) * k;
    } else if (!arrastrando) {
      rot.y += vel.y * dt; rot.x = MathUtils.clamp(rot.x + vel.x * dt, -0.7, 0.7);
      vel.x *= Math.pow(0.04, dt); vel.y *= Math.pow(0.04, dt);
      const inactivo = tiempo - ultimoToque > 2.5;
      if (inactivo && !reduceMov) {
        rot.y += 0.32 * dt;
        rot.x += (0.08 - rot.x) * (1 - Math.exp(-dt * 1.5));
      }
    }
    tel.rotation.set(rot.x, rot.y, 0, 'XYZ');

    // Flotación
    flotacion += ((foco || reduceMov ? 0 : 1) - flotacion) * k;
    raiz.position.y = Math.sin(tiempo * 1.3) * 0.07 * flotacion;
    raiz.rotation.z = Math.sin(tiempo * 0.9) * 0.025 * flotacion;
    sombra.scale.setScalar(1 - raiz.position.y * 0.6);

    // Tapa trasera transparente para zonas interiores
    const metaTapa = foco?.zona.interior ? 0.12 : 1;
    opacidadTapa += (metaTapa - opacidadTapa) * k;
    matTapa.opacity = opacidadTapa;
    matTapa.depthWrite = opacidadTapa > 0.98;

    // Cámara
    if (foco) calcularEnfoque();
    camara.position.lerp(objetivo.pos, k);
    camMira.lerp(objetivo.mira, k);
    camara.lookAt(camMira);

    escena.updateMatrixWorld();
    renderer.render(escena, camara);
    actualizarEtiquetas();
  }

  function actualizarEtiquetas() {
    capa.classList.add('lista');
    camDir.copy(camara.position);
    tel.getWorldQuaternion(q);
    specs.forEach((s) => {
      const aW = tmpV.copy(s._ancla).applyMatrix4(tel.matrixWorld);
      const [ax, ay] = proyectar(aW);
      nW.copy(s._normal).applyQuaternion(q);
      const haciaCam = camDir.copy(camara.position).sub(aW).normalize().dot(nW);
      // Solo se ven los puntos de la cara que mira al usuario
      const visible = !foco && !s._oculta && (s.zona === 'cuerpo' || haciaCam > 0.12);
      s._punto.style.transform = `translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px)`;
      if (s._visible !== visible) {
        s._visible = visible;
        s._punto.classList.toggle('visible', visible);
        s._punto.tabIndex = visible ? 0 : -1;
      }
    });
    if (foco) {
      const aW = tmpV.copy(foco.spec._ancla).applyMatrix4(tel.matrixWorld);
      const [ax, ay] = proyectar(aW);
      marcador.style.transform = `translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px)`;
    }
  }

  rafId = requestAnimationFrame(cuadro);

  /* ---------- API de la vista ---------- */
  return {
    enfocar(spec, region) {
      foco = { spec, zona: zonaDe(spec), region };
      ultimoToque = tiempo;
      marcador.style.setProperty('--c', cats[spec.categoria].color);
      marcador.classList.add('activo');
    },
    desenfocar() {
      foco = null;
      ultimoToque = tiempo;
      marcador.classList.remove('activo');
      encuadreGeneral();
    },
    filtrar() { /* las etiquetas se ocultan desde equipo.js; las líneas leen s._oculta */ },
    // Detiene el dibujo cuando la herramienta no está a la vista (ahorra batería)
    pausar() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } },
    reanudar() { if (!rafId) { previo = performance.now(); rafId = requestAnimationFrame(cuadro); } },
    destruir() {
      cancelAnimationFrame(rafId);
      capa.classList.remove('lista');
      capa.innerHTML = '';
      ro?.disconnect();
      window.removeEventListener('resize', redimensionar);
      marcador.classList.remove('activo');
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
    _debug: { camara, tel, get foco() { return foco; } }
  };
}
