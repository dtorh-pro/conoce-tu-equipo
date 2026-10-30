// Solo las piezas de Three.js que usan las escenas (bundle liviano)
export {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Shape, Path,
  ExtrudeGeometry, ShapeGeometry, BoxGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, HemisphereLight, DirectionalLight,
  CanvasTexture, SRGBColorSpace, Vector3, Matrix4, Euler, Quaternion, MathUtils,
  AdditiveBlending, DoubleSide
} from 'three';
