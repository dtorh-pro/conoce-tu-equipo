/* ============================================================
   ZONAS DEL TELÉFONO
   Cada especificación del JSON apunta a una "zona".
   - ancla:  punto del modelo 3D (coordenadas locales del teléfono)
   - normal: hacia dónde "mira" esa superficie (para atenuar líneas ocultas)
   - rot:    giro del teléfono al enfocar [x, y] en radianes
   - dist:   distancia de la cámara al acercarse (menor = más cerca)
   - interior: true = se vuelve transparente la tapa trasera
   - d2:     posición en la versión 2D (lado y % del dibujo)
   ============================================================ */
const PI = Math.PI;

export const ZONAS = {
  'pantalla':               { ancla: [0.15, 0.25, 0.135],  normal: [0, 0, 1],   rot: [0, 0],        dist: 7.2, d2: { lado: 'frente',  x: 50, y: 45 } },
  'pantalla-sistema':       { ancla: [0, -1.25, 0.135],    normal: [0, 0, 1],   rot: [0, 0],        dist: 4.6, d2: { lado: 'frente',  x: 50, y: 78 } },
  'camara-frontal':         { ancla: [0, 1.86, 0.135],     normal: [0, 0, 1],   rot: [0.12, 0],     dist: 3.0, d2: { lado: 'frente',  x: 50, y: 6 } },
  'camara-trasera':         { ancla: [-0.42, 1.38, -0.17], normal: [0, 0, -1],  rot: [0.08, PI],    dist: 3.4, d2: { lado: 'reverso', x: 70, y: 18 } },
  'interior-procesador':    { ancla: [0.36, 1.12, -0.03],  normal: [0, 0, -1],  rot: [0, PI],       dist: 3.6, interior: true, d2: { lado: 'reverso', x: 32, y: 28 } },
  'interior-ram':           { ancla: [0.36, 1.66, -0.03],  normal: [0, 0, -1],  rot: [0, PI],       dist: 3.6, interior: true, d2: { lado: 'reverso', x: 32, y: 14 } },
  'interior-almacenamiento':{ ancla: [-0.3, 0.74, -0.03],  normal: [0, 0, -1],  rot: [0, PI],       dist: 3.6, interior: true, d2: { lado: 'reverso', x: 64, y: 37 } },
  'interior-bateria':       { ancla: [0, -0.85, -0.07],    normal: [0, 0, -1],  rot: [0, PI],       dist: 5.6, interior: true, d2: { lado: 'reverso', x: 50, y: 68 } },
  'parlantes':              { ancla: [0.58, -2.07, 0],     normal: [0, -1, 0],  rot: [-1.05, 0],    dist: 3.4, d2: { lado: 'frente',  x: 74, y: 99 } },
  'borde-superior':         { ancla: [0, 2.07, 0],         normal: [0, 1, 0],   rot: [1.05, 0],     dist: 3.6, d2: { lado: 'reverso', x: 50, y: 1 } },
  'lateral-sim':            { ancla: [-1.04, 0.9, 0],      normal: [-1, 0, 0],  rot: [0, 1.15],     dist: 3.2, d2: { lado: 'frente',  x: 0,  y: 30 } },
  'lateral-huella':         { ancla: [1.05, 0.35, 0],      normal: [1, 0, 0],   rot: [0, -1.15],    dist: 3.2, d2: { lado: 'frente',  x: 100, y: 41 } },
  'cuerpo':                 { ancla: [0.98, -1.78, 0.1],   normal: [0.7, -0.3, 0.6], rot: [-0.25, -0.6], dist: 6.4, d2: { lado: 'frente', x: 94, y: 93 } }
};

export const ZONA_POR_DEFECTO = 'pantalla';
export function zonaDe(spec) { return ZONAS[spec.zona] || ZONAS[ZONA_POR_DEFECTO]; }
