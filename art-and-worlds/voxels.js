import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('demo-voxels');
const controlsHost = document.getElementById('controls-voxels');
if (!canvas || !controlsHost) throw new Error('voxels demo: canvas or controls container missing');

// ---------- seeded PRNG ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- seeded classic Perlin 2D ----------
function makePerlin(rand) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y) => {
    const u = (h & 1) === 0 ? x : -x;
    const v = (h & 2) === 0 ? y : -y;
    return u + v;
  };
  return function (x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const A = perm[X] + Y, B = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[A], x, y),       grad(perm[B], x - 1, y),       u),
      lerp(grad(perm[A + 1], x, y-1), grad(perm[B + 1], x - 1, y-1), u),
      v
    );
  };
}

function fbm(noise, x, z, octaves) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// ---------- palettes ----------
const PALETTES = {
  'grass':  { grass:'#4c9a2a', dirt:'#6b4423', stone:'#6e6e6e', sand:'#e8d27a', snow:'#ffffff', water:'#3a8ec9' },
  'desert': { grass:'#d9a86b', dirt:'#8b5a2b', stone:'#a67c52', sand:'#f3d699', snow:'#f9e7b5', water:'#66c2c2' },
  'tundra': { grass:'#a7c5bd', dirt:'#5c6b63', stone:'#888c8d', sand:'#c2d1cc', snow:'#ffffff', water:'#7ba8c4' },
  'mars':   { grass:'#c25c3a', dirt:'#6b2a1b', stone:'#8a3a23', sand:'#dd8b66', snow:'#f1c0a7', water:'#774136' },
};
const BG = 0xf7f4ef;

// ---------- state ----------
const state = {
  seed: (Math.random() * 1e9) | 0,
  chunkSize: 24,
  height: 14,
  noiseScale: 0.08,
  octaves: 3,
  waterLevel: 3,
  palette: 'grass',
  autoRotate: true,
};

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
camera.position.set(30, 26, 30);

const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.enablePan = false;
orbit.minDistance = 8;
orbit.maxDistance = 120;
orbit.maxPolarAngle = Math.PI * 0.49;

const terrainGroup = new THREE.Group();
scene.add(terrainGroup);

// baked face shading -> we use MeshBasicMaterial (no lighting)
const SHADE_TOP = 1.00;
const SHADE_SIDE = 0.78;
const SHADE_SIDE_DIM = 0.65; // two directions darker for fake directional look

// ---------- terrain build ----------
function disposeGroup(group) {
  for (const child of group.children) {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
  }
  group.clear();
}

function rebuildTerrain() {
  disposeGroup(terrainGroup);

  const noise = makePerlin(mulberry32(state.seed ^ 0x9e3779b9));
  const pal = PALETTES[state.palette] || PALETTES.grass;
  const N = state.chunkSize | 0;
  const H = state.height | 0;
  const waterY = Math.max(0, Math.min(H - 1, state.waterLevel | 0));
  const snowThreshold = Math.max(waterY + 2, Math.floor(H * 0.78));
  const s = state.noiseScale;

  // heightmap
  const heights = new Int32Array(N * N);
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      const n = fbm(noise, x * s, z * s, state.octaves);
      const t = Math.max(0, Math.min(1, (n + 0.7) / 1.4));
      heights[z * N + x] = Math.max(1, Math.min(H - 1, Math.round(t * (H - 1))));
    }
  }

  function voxelColor(y, topY) {
    if (y === topY) {
      if (topY <= waterY) return pal.sand;
      if (topY >= snowThreshold) return pal.snow;
      return pal.grass;
    }
    const depth = topY - y;
    if (depth <= 2) return pal.dirt;
    return pal.stone;
  }

  const positions = [];
  const colors = [];
  const indices = [];
  const tmpColor = new THREE.Color();

  function pushFace(x, y, z, corners, shade, colorHex) {
    tmpColor.set(colorHex);
    const r = tmpColor.r * shade, g = tmpColor.g * shade, b = tmpColor.b * shade;
    const base = positions.length / 3;
    for (let i = 0; i < 4; i++) {
      positions.push(x + corners[i][0], y + corners[i][1], z + corners[i][2]);
      colors.push(r, g, b);
    }
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  const TOP    = [[0,1,0],[1,1,0],[1,1,1],[0,1,1]];
  const POS_X  = [[1,0,0],[1,0,1],[1,1,1],[1,1,0]];
  const NEG_X  = [[0,1,0],[0,1,1],[0,0,1],[0,0,0]];
  const POS_Z  = [[1,0,1],[0,0,1],[0,1,1],[1,1,1]];
  const NEG_Z  = [[0,0,0],[1,0,0],[1,1,0],[0,1,0]];

  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      const h = heights[z * N + x];
      const topY = h - 1;

      pushFace(x, topY, z, TOP, SHADE_TOP, voxelColor(topY, topY));

      const nPX = (x + 1 < N) ? heights[z * N + (x + 1)] : 0;
      const nNX = (x - 1 >= 0) ? heights[z * N + (x - 1)] : 0;
      const nPZ = (z + 1 < N) ? heights[(z + 1) * N + x] : 0;
      const nNZ = (z - 1 >= 0) ? heights[(z - 1) * N + x] : 0;

      for (let y = nPX; y < h; y++) pushFace(x, y, z, POS_X, SHADE_SIDE,     voxelColor(y, topY));
      for (let y = nNX; y < h; y++) pushFace(x, y, z, NEG_X, SHADE_SIDE_DIM, voxelColor(y, topY));
      for (let y = nPZ; y < h; y++) pushFace(x, y, z, POS_Z, SHADE_SIDE,     voxelColor(y, topY));
      for (let y = nNZ; y < h; y++) pushFace(x, y, z, NEG_Z, SHADE_SIDE_DIM, voxelColor(y, topY));
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeBoundingSphere();

  const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(-N / 2, 0, -N / 2);
  terrainGroup.add(mesh);

  if (waterY > 0) {
    const wg = new THREE.PlaneGeometry(N, N);
    const wm = new THREE.MeshBasicMaterial({
      color: pal.water, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    });
    const wmesh = new THREE.Mesh(wg, wm);
    wmesh.rotation.x = -Math.PI / 2;
    wmesh.position.set(0, waterY + 0.5, 0);
    terrainGroup.add(wmesh);
  }

  orbit.target.set(0, H * 0.35, 0);
  const dist = N * 1.35;
  const camAngle = Math.atan2(camera.position.z, camera.position.x);
  camera.position.set(Math.cos(camAngle) * dist, H * 1.6, Math.sin(camAngle) * dist);
  orbit.update();
}

// ---------- resize ----------
function resize() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
const ro = new ResizeObserver(resize);
ro.observe(canvas);
window.addEventListener('resize', resize);

// ---------- controls ----------
function makeRange(label, key, min, max, step, fmt) {
  const wrap = document.createElement('div'); wrap.className = 'control';
  const lab = document.createElement('label');
  const name = document.createElement('span'); name.textContent = label;
  const val = document.createElement('span'); val.className = 'val';
  lab.append(name, val);
  const input = document.createElement('input');
  input.type = 'range'; input.min = min; input.max = max; input.step = step;
  input.value = state[key];
  const sync = () => { val.textContent = fmt ? fmt(state[key]) : state[key]; };
  sync();
  input.addEventListener('input', () => {
    state[key] = parseFloat(input.value);
    sync();
    rebuildTerrain();
  });
  wrap.append(lab, input);
  return wrap;
}

function makeSelect(label, key, options) {
  const wrap = document.createElement('div'); wrap.className = 'control';
  const lab = document.createElement('label');
  const name = document.createElement('span'); name.textContent = label;
  lab.append(name);
  const sel = document.createElement('select');
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value; o.textContent = opt.label;
    if (opt.value === state[key]) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    state[key] = sel.value;
    rebuildTerrain();
  });
  wrap.append(lab, sel);
  return wrap;
}

function makeCheckbox(label, key, onChange) {
  const wrap = document.createElement('div'); wrap.className = 'control inline';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!state[key];
  const lab = document.createElement('label');
  lab.textContent = label;
  lab.prepend(input);
  input.addEventListener('change', () => {
    state[key] = input.checked;
    if (onChange) onChange();
  });
  wrap.append(lab);
  return wrap;
}

function makeButton(label, onClick) {
  const wrap = document.createElement('div'); wrap.className = 'control';
  const spacer = document.createElement('label'); spacer.innerHTML = '&nbsp;';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  wrap.append(spacer, btn);
  return wrap;
}

function buildControls() {
  controlsHost.innerHTML = '';
  controlsHost.append(
    makeButton('regenerate', () => {
      state.seed = (Math.random() * 1e9) | 0;
      rebuildTerrain();
    }),
    makeRange('chunk size',   'chunkSize',  8,  48, 1,    v => (v | 0).toString()),
    makeRange('max height',   'height',     4,  28, 1,    v => (v | 0).toString()),
    makeRange('noise scale',  'noiseScale', 0.02, 0.25, 0.005, v => v.toFixed(3)),
    makeRange('octaves',      'octaves',    1,  5,  1,    v => (v | 0).toString()),
    makeRange('water level',  'waterLevel', 0,  12, 1,    v => (v | 0).toString()),
    makeSelect('palette', 'palette', Object.keys(PALETTES).map(k => ({ value: k, label: k }))),
    makeCheckbox('auto-rotate', 'autoRotate'),
  );
}

// ---------- loop ----------
function animate() {
  requestAnimationFrame(animate);
  orbit.autoRotate = state.autoRotate;
  orbit.autoRotateSpeed = 0.8;
  orbit.update();
  renderer.render(scene, camera);
}

// ---------- boot ----------
resize();
buildControls();
rebuildTerrain();
animate();
