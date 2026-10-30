/* ============================================================
   MESA DE EXHIBICIÓN 3D (geometría propia, sin marcas)
   Superficie con puntas redondeadas, panel de luz central,
   cajón de madera, patas, habladores, equipos y luz azul.
   ============================================================ */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Shape, Path,
  ExtrudeGeometry, BoxGeometry, PlaneGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, HemisphereLight, DirectionalLight,
  CanvasTexture, SRGBColorSpace, Vector3, MathUtils, AdditiveBlending
} from './vendor/three.min.js?v=20261030g';

const FOV = 34;
const T = Math.tan(MathUtils.degToRad(FOV / 2));
const L = 7.2, W = 1.9, ALTO = 1.0;

/* Puntos de cada zona (ancla) y cómo se ve al enfocarla */
export const VISTAS_MESA = {
  superficie: { ancla: [-2.25, ALTO + 0.08, 0.5], az: 0.32, el: 0.78, dist: 3.4 },
  panel: { ancla: [0, ALTO + 0.55, 0.12], az: 0.0, el: 0.22, dist: 3.4 },
  habladores: { ancla: [1.5, ALTO + 0.14, 0.86], az: -0.3, el: 0.42, dist: 2.7 },
  luz: { ancla: [3.55, ALTO - 0.13, 0.15], az: -1.1, el: 0.2, dist: 3.0 },
  madera: { ancla: [0.7, 0.62, 0.52], az: 0.18, el: 0.12, dist: 3.6 },
  base: { ancla: [-2.9, 0.42, 0.66], az: 0.62, el: 0.14, dist: 3.2 }
};

function estadio(largo, ancho, f = new Shape()) {
  const r = ancho / 2, x = largo / 2 - r;
  f.moveTo(-x, -r); f.lineTo(x, -r);
  f.absarc(x, 0, r, -Math.PI / 2, Math.PI / 2, false);
  f.lineTo(-x, r);
  f.absarc(-x, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return f;
}

function texturaPanel() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 340;
  const g = c.getContext('2d');
  g.fillStyle = '#1E5EFF'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#28B4FF'; g.beginPath(); g.arc(960, 40, 150, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#BFD6FF'; g.beginPath(); g.arc(40, 320, 90, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = '700 74px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('Equipos a cuotas', c.width / 2, 130);
  ['#FFFFFF', '#28B4FF', '#BFD6FF'].forEach((col, i) => {
    g.fillStyle = col; const x = 180 + i * 240;
    g.beginPath(); g.roundRect ? g.roundRect(x, 180, 200, 100, 22) : g.rect(x, 180, 200, 100); g.fill();
    g.fillStyle = '#0A1A3F'; g.font = '700 46px system-ui, sans-serif'; g.fillText(['$', '%', '+'][i], x + 100, 248);
  });
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
function texturaSombra() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 32, 4, 128, 32, 128);
  r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 64);
  return new CanvasTexture(c);
}
function texturaHablador() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 84;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 84);
  g.fillStyle = '#1E5EFF'; g.fillRect(0, 0, 128, 18);
  g.fillStyle = '#0B1B2B'; g.font = '700 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('$ —', 64, 62);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function construirMesa() {
  const mesa = new Group();
  const blanco = new MeshStandardMaterial({ color: 0xF6F8F8, roughness: .22, metalness: .05 });
  const blancoMate = new MeshStandardMaterial({ color: 0xE9EEF0, roughness: .5 });
  const madera = new MeshStandardMaterial({ color: 0xCDB89A, roughness: .62 });
  const oscuro = new MeshStandardMaterial({ color: 0x0E1520, roughness: .3, metalness: .4 });
  const luzMat = new MeshBasicMaterial({ color: 0x28B4FF });

  // Superficie (estadio extruido)
  const tapa = new Mesh(new ExtrudeGeometry(estadio(L, W), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 24 }), blanco);
  tapa.rotation.x = -Math.PI / 2; tapa.position.y = ALTO - 0.1; mesa.add(tapa);

  // Luz azul del borde (anillo bajo la tapa)
  const anillo = estadio(L - 0.08, W - 0.08);
  anillo.holes.push(estadio(L - 0.2, W - 0.2, new Path()));
  const luz = new Mesh(new ExtrudeGeometry(anillo, { depth: 0.035, bevelEnabled: false, curveSegments: 24 }), luzMat);
  luz.rotation.x = -Math.PI / 2; luz.position.y = ALTO - 0.15; mesa.add(luz);

  // Cajón central de madera y franja de madera bajo la tapa
  const cajon = new Mesh(new BoxGeometry(2.6, ALTO - 0.16, 1.0), madera); cajon.position.set(0, (ALTO - 0.16) / 2, 0); mesa.add(cajon);
  const franja = new Mesh(new BoxGeometry(L - 2.2, 0.06, W - 0.5), madera); franja.position.set(0, ALTO - 0.13, 0); mesa.add(franja);

  // Patas en los extremos
  [-2.9, 2.9].forEach((x) => {
    const pata = new Mesh(new BoxGeometry(0.16, ALTO - 0.16, 1.3), blancoMate); pata.position.set(x, (ALTO - 0.16) / 2, 0); mesa.add(pata);
    const pie = new Mesh(new BoxGeometry(0.4, 0.04, 1.36), oscuro); pie.position.set(x, 0.02, 0); mesa.add(pie);
  });

  // Panel de luz central
  const soporte = new Mesh(new BoxGeometry(0.5, 0.1, 0.22), blanco); soporte.position.set(0, ALTO + 0.05, 0); mesa.add(soporte);
  const marco = new Mesh(new BoxGeometry(2.3, 0.78, 0.18), blanco); marco.position.set(0, ALTO + 0.49, 0); mesa.add(marco);
  const texPanel = texturaPanel();
  [0.092, -0.092].forEach((z, i) => {
    const pantalla = new Mesh(new PlaneGeometry(2.14, 0.66), new MeshBasicMaterial({ map: texPanel }));
    pantalla.position.set(0, ALTO + 0.49, z); if (i) pantalla.rotation.y = Math.PI; mesa.add(pantalla);
  });

  // Puestos de exhibición: marcos de luz, equipos y habladores
  const marcoLuz = new MeshBasicMaterial({ color: 0x28B4FF });
  const acrilico = new MeshStandardMaterial({ color: 0xDDEBFF, roughness: .05, transparent: true, opacity: .35 });
  const texHab = texturaHablador();
  const habMat = new MeshBasicMaterial({ map: texHab });
  const xs = [-3.0, -2.25, -1.5, 1.5, 2.25, 3.0];
  [-0.5, 0.5].forEach((z) => xs.forEach((x, k) => {
    if (Math.abs(x) > 2.9 && Math.abs(z) > 0.4) return; // las puntas redondeadas no tienen puesto
    const y = ALTO + 0.006;
    [[0.34, 0.02, 0, -0.27], [0.34, 0.02, 0, 0.27], [0.02, 0.56, -0.17, 0], [0.02, 0.56, 0.17, 0]].forEach(([w, d, dx, dz]) => {
      const b = new Mesh(new BoxGeometry(w, 0.006, d), marcoLuz); b.position.set(x + dx, y, z + dz); mesa.add(b);
    });
    if ((k + (z > 0 ? 1 : 0)) % 3 !== 2) {
      const tel = new Mesh(new BoxGeometry(0.22, 0.018, 0.44), oscuro); tel.position.set(x, ALTO + 0.015, z); tel.rotation.y = (k % 2 ? .06 : -.05); mesa.add(tel);
      const pant = new Mesh(new PlaneGeometry(0.19, 0.4), new MeshBasicMaterial({ color: [0x1E5EFF, 0x28B4FF, 0x4F46E5, 0xBFD6FF][(k + (z > 0 ? 2 : 0)) % 4] }));
      pant.rotation.x = -Math.PI / 2; pant.position.set(x, ALTO + 0.025, z); pant.rotation.z = tel.rotation.y; mesa.add(pant);
    }
    // Hablador inclinado hacia el cliente
    const sz = Math.sign(z);
    const hab = new Group(); hab.position.set(x, ALTO + 0.07, z + sz * 0.36); hab.rotation.x = sz * -0.35;
    const placa = new Mesh(new BoxGeometry(0.26, 0.15, 0.012), acrilico); hab.add(placa);
    const etiqueta = new Mesh(new PlaneGeometry(0.22, 0.12), habMat); etiqueta.position.z = sz * 0.007; if (sz < 0) etiqueta.rotation.y = Math.PI; hab.add(etiqueta);
    mesa.add(hab);
  }));

  // Punto de luz que recorre el borde (firma visual)
  const destello = new Mesh(new SphereGeometry(0.08, 16, 12), new MeshBasicMaterial({ color: 0x28B4FF }));
  const halo = new Mesh(new SphereGeometry(0.16, 16, 12), new MeshBasicMaterial({ color: 0x28B4FF, transparent: true, opacity: .3, blending: AdditiveBlending, depthWrite: false }));
  destello.add(halo); mesa.add(destello);

  return { mesa, luzMat, destello };
}

/** Posición sobre el borde del estadio para t ∈ [0,1) */
function puntoBorde(t, out) {
  const r = (W - 0.08) / 2, x = (L - 0.08) / 2 - r;
  const recto = 2 * x, curva = Math.PI * r, total = 2 * recto + 2 * curva;
  let d = (t % 1) * total;
  if (d < recto) return out.set(-x + d, ALTO - 0.13, r);
  d -= recto;
  if (d < curva) { const a = Math.PI / 2 - d / r; return out.set(x + Math.cos(a) * r, ALTO - 0.13, Math.sin(a) * r); }
  d -= curva;
  if (d < recto) return out.set(x - d, ALTO - 0.13, -r);
  d -= recto;
  const a = -Math.PI / 2 - d / r; return out.set(-x + Math.cos(a) * r, ALTO - 0.13, Math.sin(a) * r);
}

export function crearMesa3D({ contenedor, lienzo, capaPins, zonas, alElegir }) {
  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  let dprMax = matchMedia('(pointer: coarse)').matches ? 1.75 : 2;

  const escena = new Scene();
  const camara = new PerspectiveCamera(FOV, 1, 0.1, 100);
  escena.add(new HemisphereLight(0xffffff, 0x33406A, 1.8));
  const sol = new DirectionalLight(0xffffff, 2.0); sol.position.set(3, 7, 5); escena.add(sol);
  const relleno = new DirectionalLight(0xBFD4FF, 0.9); relleno.position.set(-5, 3, -4); escena.add(relleno);

  const raiz = new Group(); escena.add(raiz);
  const { mesa, luzMat, destello } = construirMesa();
  raiz.add(mesa);
  const sombra = new Mesh(new PlaneGeometry(L + 1.6, W + 1.6), new MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.001; raiz.add(sombra);

  /* Pines HTML de cada zona */
  capaPins.innerHTML = '';
  const pins = zonas.filter((z) => VISTAS_MESA[z.id]).map((z) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pin'; b.dataset.zona = z.id;
    b.innerHTML = `<span class="pin-punto" aria-hidden="true"></span><span class="pin-txt"></span>`;
    b.querySelector('.pin-txt').textContent = z.corto;
    b.setAttribute('aria-label', z.nombre);
    b.addEventListener('click', () => alElegir(z.id));
    capaPins.appendChild(b);
    return { z, b, v: new Vector3(...VISTAS_MESA[z.id].ancla) };
  });

  /* Estado de cámara */
  let ancho = 1, alto = 1, foco = null;
  let rotY = -0.1, velRot = 0, arrastre = null, ultimoToque = -10, tiempo = 0, previo = performance.now();
  const cam = { az: 0, el: 0.42, dist: 10, mira: new Vector3(0, 0.8, 0) };
  const meta = { az: 0, el: 0.42, dist: 10, mira: new Vector3(0, 0.8, 0), rot: -0.18 };

  function distanciaGeneral() {
    const asp = ancho / alto;
    return Math.max((L + 1.1) / (2 * T * asp), 3.2 / (2 * T)) * 1.02;
  }
  function redimensionar() {
    const r = contenedor.getBoundingClientRect();
    ancho = Math.max(1, r.width); alto = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprMax));
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto; camara.updateProjectionMatrix();
    if (!foco) { meta.dist = distanciaGeneral(); meta.el = 0.42; meta.az = 0; meta.mira.set(0, 0.85, 0); }
  }
  let ro = null;
  if ('ResizeObserver' in window) { ro = new ResizeObserver(redimensionar); ro.observe(contenedor); } else window.addEventListener('resize', redimensionar);
  redimensionar();
  Object.assign(cam, { az: meta.az, el: meta.el + 0.25, dist: meta.dist * 1.25 }); cam.mira.copy(meta.mira);

  /* Girar con dedo o mouse (solo horizontal; el desplazamiento vertical mueve la página) */
  lienzo.addEventListener('pointerdown', (e) => { arrastre = { x: e.clientX, y: e.clientY, activo: false }; });
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x;
    if (!arrastre.activo && Math.abs(dx) > 6) { arrastre.activo = true; try { lienzo.setPointerCapture(e.pointerId); } catch { /* */ } }
    if (arrastre.activo) { rotY += dx * 0.008; velRot = dx * 0.008 * 60; arrastre.x = e.clientX; ultimoToque = tiempo; }
  });
  const soltar = () => { arrastre = null; ultimoToque = tiempo; };
  lienzo.addEventListener('pointerup', soltar); lienzo.addEventListener('pointercancel', soltar);

  /* Bucle */
  const v = new Vector3(), pos = new Vector3(), tmp = new Vector3();
  let rafId = 0, medicion = { n: 0, t: 0, etapa: 0 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cuadro(ahora) {
    rafId = requestAnimationFrame(cuadro);
    const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora; tiempo += dt;
    const k = 1 - Math.exp(-dt * 4.5);
    if (medicion.etapa < 2) {
      medicion.n++; medicion.t += dt;
      if (medicion.t > 2) { if (medicion.n / medicion.t < 40) { dprMax = [1.25, 1][medicion.etapa]; redimensionar(); medicion.etapa++; } else medicion.etapa = 2; medicion.n = 0; medicion.t = 0; }
    }
    if (foco) {
      const d = ((meta.rot - rotY) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      rotY += d * k;
    } else if (!arrastre?.activo) {
      rotY += velRot * dt; velRot *= Math.pow(0.05, dt);
      // En reposo, la mesa se mece suavemente para mostrar sus lados
      if (tiempo - ultimoToque > 3 && !reduce) rotY += (-0.1 + Math.sin(tiempo * 0.2) * 0.3 - rotY) * k * 0.25;
    }
    raiz.rotation.y = rotY;
    cam.az += (meta.az - cam.az) * k; cam.el += (meta.el - cam.el) * k; cam.dist += (meta.dist - cam.dist) * k;
    cam.mira.lerp(meta.mira, k);
    camara.position.set(cam.mira.x + Math.sin(cam.az) * Math.cos(cam.el) * cam.dist, cam.mira.y + Math.sin(cam.el) * cam.dist, cam.mira.z + Math.cos(cam.az) * Math.cos(cam.el) * cam.dist);
    camara.lookAt(cam.mira);

    // Luz del borde: respira y un destello la recorre
    const pulso = 0.85 + 0.15 * Math.sin(tiempo * 2.2);
    luzMat.color.setRGB(0.13 * pulso, 0.83 * pulso, 0.93 * pulso);
    puntoBorde(reduce ? 0.1 : tiempo * 0.06, destello.position);

    raiz.updateMatrixWorld();
    renderer.render(escena, camara);

    // Pines
    pins.forEach((p) => {
      pos.copy(p.v).applyMatrix4(raiz.matrixWorld);
      v.copy(pos).project(camara);
      const x = (v.x + 1) / 2 * ancho, y = (1 - v.y) / 2 * alto;
      const detras = p.v.z > 0.3 && Math.cos(rotY) < -0.15;
      const ocultar = (foco && foco !== p.z.id) || v.z > 1 || detras;
      // Dentro del recuadro, aunque la zona quede cerca del borde
      const w = p.b.offsetWidth || 34;
      const px = Math.max(4, Math.min(ancho - w - 4, x - 16)), py = Math.max(4, Math.min(alto - 38, y - 17));
      p.b.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      p.b.classList.toggle('oculto', ocultar);
      p.b.classList.toggle('activo', foco === p.z.id);
    });
  }
  rafId = requestAnimationFrame(cuadro);

  return {
    enfocar(id) {
      const z = VISTAS_MESA[id]; if (!z) return;
      foco = id; meta.rot = 0; meta.az = z.az; meta.el = z.el; meta.dist = z.dist * Math.max(1, 1.15 / (ancho / alto)) ;
      meta.mira.set(...z.ancla);
    },
    desenfocar() {
      foco = null; ultimoToque = tiempo;
      meta.dist = distanciaGeneral(); meta.el = 0.42; meta.az = 0; meta.mira.set(0, 0.85, 0);
    },
    pausar() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } },
    reanudar() { if (!rafId) { previo = performance.now(); rafId = requestAnimationFrame(cuadro); } },
    destruir() { cancelAnimationFrame(rafId); ro?.disconnect(); renderer.dispose(); renderer.forceContextLoss?.(); }
  };
}
