(() => {
  const canvas = document.getElementById('demo-flowfield');
  const controlsHost = document.getElementById('controls-flowfield');
  if (!canvas || !controlsHost) return;

  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;

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

  // ---------- palettes ----------
  const PALETTES = {
    'dusk':        ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
    'peach+teal':  ['#ffb5a7', '#fcd5ce', '#f8edeb', '#2ec4b6', '#1a535c'],
    'mono ink':    ['#111111', '#2a2a2a', '#444444', '#666666', '#888888'],
    'hobbs earth': ['#3a2e27', '#a67253', '#d9b08c', '#ffcb9a', '#5f7367', '#2c3e2f'],
  };
  const BG = '#f7f4ef';

  // ---------- state ----------
  const state = {
    seed: (Math.random() * 1e9) | 0,
    noiseScale: 0.005,
    curveCount: 600,
    curveLength: 220,
    lineWeight: 0.9,
    palette: 'dusk',
    animate: true,
    distortion: 'perlin',
  };

  let grid, gridW, gridH, resolution, leftX, topY, rightX, bottomY;
  let rand, noise, palette;
  let rafId = 0;
  let queued = [];

  // ---------- sizing ----------
  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function cssSize() {
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  // ---------- grid of angles ----------
  function buildGrid() {
    const { w, h } = cssSize();
    resolution = Math.max(3, Math.round(w * 0.01));
    leftX = Math.round(-w * 0.5);
    topY = Math.round(-h * 0.5);
    rightX = Math.round(w * 1.5);
    bottomY = Math.round(h * 1.5);
    gridW = Math.ceil((rightX - leftX) / resolution) + 1;
    gridH = Math.ceil((bottomY - topY) / resolution) + 1;
    grid = new Float32Array(gridW * gridH);

    const s = state.noiseScale * resolution;
    const mode = state.distortion;

    if (mode === 'row_random') {
      for (let row = 0; row < gridH; row++) {
        const a = rand() * TAU;
        const base = row * gridW;
        for (let col = 0; col < gridW; col++) grid[base + col] = a;
      }
      return;
    }

    let quant = 0;
    if (mode === 'quant_pi10') quant = Math.PI / 10;
    else if (mode === 'quant_pi4') quant = Math.PI / 4;

    for (let row = 0; row < gridH; row++) {
      const base = row * gridW;
      for (let col = 0; col < gridW; col++) {
        const n = noise(col * s, row * s); // roughly [-1, 1]
        let a = (n + 1) * Math.PI;         // map to [0, 2PI]
        if (quant) a = Math.round(a / quant) * quant;
        grid[base + col] = a;
      }
    }
  }

  function sampleAngle(x, y) {
    let col = ((x - leftX) / resolution) | 0;
    let row = ((y - topY) / resolution) | 0;
    if (col < 0) col = 0; else if (col >= gridW) col = gridW - 1;
    if (row < 0) row = 0; else if (row >= gridH) row = gridH - 1;
    return grid[row * gridW + col];
  }

  // ---------- curves ----------
  function drawCurve(sx, sy, color) {
    const { w } = cssSize();
    const stepLen = Math.max(0.75, w * 0.0015);
    const steps = state.curveLength | 0;
    let x = sx, y = sy;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = state.lineWeight;
    for (let i = 0; i < steps; i++) {
      const a = sampleAngle(x, y);
      x += Math.cos(a) * stepLen;
      y += Math.sin(a) * stepLen;
      if (x < leftX || x > rightX || y < topY || y > bottomY) break;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function queueCurves() {
    const { w, h } = cssSize();
    const n = state.curveCount | 0;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = {
        x: rand() * w,
        y: rand() * h,
        color: palette[(rand() * palette.length) | 0],
      };
    }
    queued = out;
  }

  function clear() {
    const { w, h } = cssSize();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
  }

  // ---------- main ----------
  function regenerate() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;

    rand = mulberry32(state.seed);
    noise = makePerlin(mulberry32(state.seed ^ 0x9e3779b9));
    palette = PALETTES[state.palette] || PALETTES.dusk;

    fitCanvas();
    buildGrid();
    clear();
    queueCurves();

    ctx.globalAlpha = 0.55;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (state.animate) {
      const perFrame = Math.max(4, Math.ceil(queued.length / 120));
      let i = 0;
      const tick = () => {
        const end = Math.min(queued.length, i + perFrame);
        for (; i < end; i++) {
          const c = queued[i];
          drawCurve(c.x, c.y, c.color);
        }
        rafId = i < queued.length ? requestAnimationFrame(tick) : 0;
      };
      rafId = requestAnimationFrame(tick);
    } else {
      for (let i = 0; i < queued.length; i++) {
        const c = queued[i];
        drawCurve(c.x, c.y, c.color);
      }
    }
  }

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
      regenerate();
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
      regenerate();
    });
    wrap.append(lab, sel);
    return wrap;
  }

  function makeCheckbox(label, key) {
    const wrap = document.createElement('div'); wrap.className = 'control inline';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!state[key];
    const lab = document.createElement('label');
    lab.textContent = label;
    lab.prepend(input);
    input.addEventListener('change', () => {
      state[key] = input.checked;
      regenerate();
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
        regenerate();
      }),
      makeRange('noise scale', 'noiseScale', 0.001, 0.02, 0.0005, v => v.toFixed(4)),
      makeRange('curve count', 'curveCount', 100, 2000, 10, v => (v | 0).toString()),
      makeRange('curve length', 'curveLength', 10, 500, 5, v => (v | 0).toString()),
      makeRange('line weight', 'lineWeight', 0.3, 4, 0.1, v => v.toFixed(1)),
      makeSelect('palette', 'palette',
        Object.keys(PALETTES).map(k => ({ value: k, label: k }))),
      makeSelect('distortion', 'distortion', [
        { value: 'perlin',     label: 'perlin (smooth)' },
        { value: 'quant_pi10', label: 'quantized pi/10' },
        { value: 'quant_pi4',  label: 'quantized pi/4' },
        { value: 'row_random', label: 'random per row' },
      ]),
      makeCheckbox('animate', 'animate'),
    );
  }

  // ---------- resize ----------
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(regenerate, 120);
  });

  // ---------- boot ----------
  buildControls();
  regenerate();
})();
