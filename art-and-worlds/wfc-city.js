(() => {
  const canvas = document.getElementById('demo-wfc');
  const controlsHost = document.getElementById('controls-wfc');
  if (!canvas || !controlsHost) return;

  const wrapCtrl = typeof wrapPresenterNotes === 'function' ? wrapPresenterNotes : (el) => el;
  const ctx = canvas.getContext('2d', { alpha: false });

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

  /**
   * Top-down city: roads (r) and grass (g). Tiles 12–20 are houses / props: same gggg
   * sockets as grass (they sit in parks) but are a separate WFC class with lower weights.
   * Rule: no two 12–20 may be edge-adjacent (4-neighbor exclusion), so lots stay spaced
   * instead of a solid mass.
   *
   * Spritesheet: one row, 21×16. Default: images/wfc-tiles.png
   */
  const WFC_TILES_URL = 'images/wfc-tiles.png';
  const SPRITE_TILE_PX = 16;

  const TILES = [
    { id: 0, name: 'grass', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 20, rgb: [120, 168, 92] },
    { id: 1, name: 'road_h', n: 'g', e: 'r', s: 'g', w: 'r', wgt: 4, rgb: [74, 74, 78] },
    { id: 2, name: 'road_v', n: 'r', e: 'g', s: 'r', w: 'g', wgt: 4, rgb: [68, 68, 72] },
    { id: 3, name: 'road_x', n: 'r', e: 'r', s: 'r', w: 'r', wgt: 0.6, rgb: [58, 58, 64] },
    { id: 4, name: 'cap_n', n: 'g', e: 'r', s: 'r', w: 'r', wgt: 1.2, rgb: [70, 70, 76] },
    { id: 5, name: 'cap_s', n: 'r', e: 'r', s: 'g', w: 'r', wgt: 1.2, rgb: [70, 70, 76] },
    { id: 6, name: 'cap_e', n: 'r', e: 'g', s: 'r', w: 'r', wgt: 1.2, rgb: [70, 70, 76] },
    { id: 7, name: 'cap_w', n: 'r', e: 'r', s: 'r', w: 'g', wgt: 1.2, rgb: [70, 70, 76] },
    { id: 8, name: 'corner_ne', n: 'g', e: 'g', s: 'r', w: 'r', wgt: 1.5, rgb: [66, 66, 72] },
    { id: 9, name: 'corner_nw', n: 'g', e: 'r', s: 'r', w: 'g', wgt: 1.5, rgb: [66, 66, 72] },
    { id: 10, name: 'corner_se', n: 'r', e: 'g', s: 'g', w: 'r', wgt: 1.5, rgb: [66, 66, 72] },
    { id: 11, name: 'corner_sw', n: 'r', e: 'r', s: 'g', w: 'g', wgt: 1.5, rgb: [66, 66, 72] },
    { id: 12, name: 'bld', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.45, rgb: [118, 86, 72] },
    { id: 13, name: 'bld_N', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.5, rgb: [128, 92, 78] },
    { id: 14, name: 'bld_S', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.5, rgb: [128, 92, 78] },
    { id: 15, name: 'bld_E', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.5, rgb: [128, 92, 78] },
    { id: 16, name: 'bld_W', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.5, rgb: [128, 92, 78] },
    { id: 17, name: 'bld_NE', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.45, rgb: [122, 88, 74] },
    { id: 18, name: 'bld_NW', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.45, rgb: [122, 88, 74] },
    { id: 19, name: 'bld_SE', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.45, rgb: [122, 88, 74] },
    { id: 20, name: 'bld_SW', n: 'g', e: 'g', s: 'g', w: 'g', wgt: 0.45, rgb: [122, 88, 74] },
  ];

  const N = TILES.length;
  const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };

  function socketOk(a, dir, b) {
    return TILES[a][dir] === TILES[b][OPP[dir]];
  }

  function buildCompatMasks() {
    const maskN = new Uint16Array(N * N);
    const maskE = new Uint16Array(N * N);
    const maskS = new Uint16Array(N * N);
    const maskW = new Uint16Array(N * N);
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        const i = a * N + b;
        if (socketOk(a, 'n', b)) maskN[i] = 1;
        if (socketOk(a, 'e', b)) maskE[i] = 1;
        if (socketOk(a, 's', b)) maskS[i] = 1;
        if (socketOk(a, 'w', b)) maskW[i] = 1;
      }
    }
    return { maskN, maskE, maskS, maskW };
  }

  const { maskN, maskE, maskS, maskW } = buildCompatMasks();

  function validateSockets() {
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        if (socketOk(a, 'e', b) !== !!maskE[a * N + b]) throw new Error('maskE mismatch');
        if (socketOk(a, 's', b) !== !!maskS[a * N + b]) throw new Error('maskS mismatch');
      }
    }
  }
  validateSockets();

  const state = {
    seed: (Math.random() * 1e9) | 0,
    gridW: 36,
    stepsPerFrame: 48,
    animate: true,
    showUncertainty: false,
  };

  let rand = mulberry32(state.seed);
  let GW = 0;
  let GH = 0;
  /** Uint32 bitmasks (N > 16), length GW*GH; bit i = tile i allowed */
  let wave = null;
  let collapsed = null;
  let solving = false;
  let rafId = 0;
  /** optional: HTMLImageElement — default WFC_TILES_URL */
  let spriteSheet = null;

  const allMask = N >= 32 ? 0xffffffff : ((1 << N) - 1) >>> 0;

  /** Settlement tiles: houses / props. Edge-adjacent to each other (4-way) is forbidden. */
  const HOUSE_LO = 12;
  const HOUSE_HI = 20;
  const HOUSE_MASK = (((1 << (HOUSE_HI + 1)) - 1) ^ ((1 << HOUSE_LO) - 1)) >>> 0;

  function isHouseTile(t) {
    return t >= HOUSE_LO && t <= HOUSE_HI;
  }

  function hasCollapsedHouseNeighbor(x, y) {
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const j = idx(nx, ny);
      if (!collapsed[j]) continue;
      if (isHouseTile(lowestBit(wave[j]))) return true;
    }
    return false;
  }

  function applyHouseExclusionToMask(m, x, y) {
    if (!hasCollapsedHouseNeighbor(x, y)) return m >>> 0;
    return (m & ~HOUSE_MASK) >>> 0;
  }

  /** When a house/prop is placed, 4-neighbors can no longer be any 12–20. */
  function stripHouseOptionsFromUncollapsedNeighborsOf(hx, hy, queue) {
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nx = hx + dx;
      const ny = hy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const j = idx(nx, ny);
      if (collapsed[j]) continue;
      const w0 = wave[j] >>> 0;
      if (!(w0 & HOUSE_MASK)) continue;
      const w1 = (w0 & ~HOUSE_MASK) >>> 0;
      if (w1 === 0) return false;
      if (w1 !== w0) {
        wave[j] = w1;
        queue.push(j);
      }
    }
    return true;
  }

  function popcountMask(m) {
    let c = 0;
    let v = m >>> 0;
    while (v) {
      v &= v - 1;
      c++;
    }
    return c;
  }

  function bitWeightSum(mask) {
    const m = mask >>> 0;
    let s = 0;
    for (let t = 0; t < N; t++) {
      if (m & (1 << t)) s += TILES[t].wgt;
    }
    return s;
  }

  function pickWeightedTile(mask, r) {
    const m = mask >>> 0;
    let sum = bitWeightSum(m);
    if (sum <= 0) return -1;
    let x = r * sum;
    for (let t = 0; t < N; t++) {
      if (m & (1 << t)) {
        x -= TILES[t].wgt;
        if (x <= 0) return t;
      }
    }
    for (let t = N - 1; t >= 0; t--) {
      if (m & (1 << t)) return t;
    }
    return -1;
  }

  function idx(x, y) {
    return y * GW + x;
  }

  function gridHeightForWidth(gw) {
    return Math.max(8, Math.round((gw * 9) / 16));
  }

  function initWave() {
    GW = Math.max(8, state.gridW | 0);
    GH = gridHeightForWidth(GW);
    const len = GW * GH;
    wave = new Uint32Array(len);
    collapsed = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const x = i % GW;
      const y = (i / GW) | 0;
      const border = x === 0 || y === 0 || x === GW - 1 || y === GH - 1;
      if (border) {
        wave[i] = 1;
        collapsed[i] = 1;
      } else {
        wave[i] = allMask;
        collapsed[i] = 0;
      }
    }
    const borderQueue = [];
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        if (collapsed[idx(x, y)]) borderQueue.push(idx(x, y));
      }
    }
    propagate(borderQueue);
  }

  function constrainFromNeighbor(x, y, nx, ny, dirFromMeToNeighbor) {
    const i = idx(x, y);
    const j = idx(nx, ny);
    if (collapsed[j]) {
      const tj = lowestBit(wave[j]);
      let mask = 0;
      for (let ta = 0; ta < N; ta++) {
        if (!((wave[i] >>> 0) & (1 << ta))) continue;
        const ok =
          dirFromMeToNeighbor === 'n'
            ? maskN[ta * N + tj]
            : dirFromMeToNeighbor === 'e'
              ? maskE[ta * N + tj]
              : dirFromMeToNeighbor === 's'
                ? maskS[ta * N + tj]
                : maskW[ta * N + tj];
        if (ok) mask |= 1 << ta;
      }
      mask >>>= 0;
      if (mask !== (wave[i] >>> 0)) {
        wave[i] = mask;
        return true;
      }
      return false;
    }

    const neighborMask = wave[j] >>> 0;
    let newMask = 0;
    for (let ta = 0; ta < N; ta++) {
      if (!((wave[i] >>> 0) & (1 << ta))) continue;
      const row =
        dirFromMeToNeighbor === 'n'
          ? maskN
          : dirFromMeToNeighbor === 'e'
            ? maskE
            : dirFromMeToNeighbor === 's'
              ? maskS
              : maskW;
      let okAny = false;
      for (let tb = 0; tb < N; tb++) {
        if (neighborMask & (1 << tb)) {
          if (row[ta * N + tb]) {
            okAny = true;
            break;
          }
        }
      }
      if (okAny) newMask |= 1 << ta;
    }
    newMask >>>= 0;
    if (newMask !== (wave[i] >>> 0)) {
      wave[i] = newMask;
      return true;
    }
    return false;
  }

  function lowestBit(m) {
    const m2 = m >>> 0;
    if (m2 === 0) return 0;
    const low = m2 & -m2;
    return 31 - Math.clz32(low);
  }

  function propagate(queue) {
    while (queue.length) {
      const cur = queue.pop();
      const x = cur % GW;
      const y = (cur / GW) | 0;
      if (x > 0 && constrainFromNeighbor(x - 1, y, x, y, 'e')) queue.push(idx(x - 1, y));
      if (x < GW - 1 && constrainFromNeighbor(x + 1, y, x, y, 'w')) queue.push(idx(x + 1, y));
      if (y > 0 && constrainFromNeighbor(x, y - 1, x, y, 's')) queue.push(idx(x, y - 1));
      if (y < GH - 1 && constrainFromNeighbor(x, y + 1, x, y, 'n')) queue.push(idx(x, y + 1));
    }
  }

  function findMinEntropyCell() {
    let best = -1;
    let bestCount = 999;
    for (let i = 0; i < wave.length; i++) {
      if (collapsed[i]) continue;
      const c = popcountMask(wave[i]);
      if (c === 0) return { i, count: 0 };
      if (c < bestCount) {
        bestCount = c;
        best = i;
        if (bestCount <= 1) break;
      }
    }
    return { i: best, count: bestCount };
  }

  function stepOnce() {
    const { i, count } = findMinEntropyCell();
    if (i < 0) return 'done';
    if (count === 0) return 'contradiction';

    const x = i % GW;
    const y = (i / GW) | 0;
    const mask = applyHouseExclusionToMask(wave[i] >>> 0, x, y);
    if (popcountMask(mask) === 0) return 'contradiction';
    const choice = pickWeightedTile(mask, rand());
    if (choice < 0) return 'contradiction';

    wave[i] = (1 << choice) >>> 0;
    collapsed[i] = 1;
    const queue = [i];
    propagate(queue);
    if (isHouseTile(choice)) {
      if (!stripHouseOptionsFromUncollapsedNeighborsOf(x, y, queue)) return 'contradiction';
    }
    propagate(queue);
    return 'ok';
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.width * (9 / 16)));
    canvas.style.height = cssH + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
  }

  function draw() {
    if (!wave) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#0d1114';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < GH; y++) {
      const py0 = Math.floor((y * H) / GH);
      const py1 = Math.floor(((y + 1) * H) / GH);
      const ph = py1 - py0;
      for (let x = 0; x < GW; x++) {
        const i = idx(x, y);
        const m = wave[i];
        const px0 = Math.floor((x * W) / GW);
        const px1 = Math.floor(((x + 1) * W) / GW);
        const pw = px1 - px0;

        if (state.showUncertainty && !collapsed[i]) {
          const c = popcountMask(m);
          const t = 1 - (c - 1) / (N - 1);
          const u = (40 + t * 50) | 0;
          ctx.fillStyle = `rgb(${u},${(u * 0.85) | 0},${(u * 1.05) | 0})`;
          ctx.fillRect(px0, py0, pw, ph);
          continue;
        }

        if (popcountMask(m) === 1) {
          const t = lowestBit(m);
          const sw = SPRITE_TILE_PX;
          const sheetW = spriteSheet && spriteSheet.complete ? spriteSheet.naturalWidth : 0;
          const hasSprite = sheetW >= (t + 1) * sw;
          if (spriteSheet && spriteSheet.complete && hasSprite) {
            ctx.drawImage(spriteSheet, t * sw, 0, sw, sw, px0, py0, pw, ph);
          } else {
            const [r, g, b] = TILES[t].rgb;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(px0, py0, pw, ph);
          }
        } else {
          const c = popcountMask(m);
          const v = (35 + (N - c) * 8) | 0;
          ctx.fillStyle = `rgb(${v},${v},${(v + 18) | 0})`;
          ctx.fillRect(px0, py0, pw, ph);
        }
      }
    }
  }

  function cancelSolve() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    solving = false;
  }

  function runSolveLoop() {
    solving = true;
    const batch = Math.max(1, state.stepsPerFrame | 0);

    function frame() {
      if (!solving) return;
      for (let k = 0; k < batch; k++) {
        const st = stepOnce();
        if (st === 'contradiction') {
          solving = false;
          rafId = 0;
          state.seed = (state.seed + 0x9e3779b9) >>> 0;
          startGenerate();
          return;
        }
        if (st === 'done') {
          solving = false;
          rafId = 0;
          draw();
          return;
        }
      }
      draw();
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function startGenerate() {
    cancelSolve();
    rand = mulberry32(state.seed);
    initWave();
    resizeCanvas();

    if (!state.animate) {
      const maxAttempts = 400;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        while (true) {
          const st = stepOnce();
          if (st === 'done') {
            draw();
            return;
          }
          if (st === 'contradiction') break;
        }
        state.seed = (state.seed + 0x9e3779b9) >>> 0;
        rand = mulberry32(state.seed);
        initWave();
      }
      draw();
      return;
    }

    solving = true;
    rafId = requestAnimationFrame(runSolveLoop);
  }

  /** @param {string} url - e.g. images/wfc-tiles.png (tiles are always 16×16 in the sheet). */
  function loadSpritesheet(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      spriteSheet = img;
      draw();
    };
    img.onerror = () => {
      if (typeof url === 'string' && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      }
      spriteSheet = null;
      draw();
    };
    img.src = url;
  }

  function clearSpritesheet() {
    spriteSheet = null;
    draw();
  }

  // ---------- controls ----------
  function makeRange(label, key, min, max, step, fmt, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'control';
    const lab = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = label;
    const val = document.createElement('span');
    val.className = 'val';
    lab.append(name, val);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = state[key];
    const sync = () => {
      val.textContent = fmt ? fmt(state[key]) : String(state[key]);
    };
    sync();
    input.addEventListener('input', () => {
      state[key] = parseFloat(input.value);
      sync();
      if (onChange) onChange();
    });
    wrap.append(lab, input);
    return wrap;
  }

  function makeCheckbox(label, key, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'control inline';
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
    const wrap = document.createElement('div');
    wrap.className = 'control';
    const spacer = document.createElement('label');
    spacer.innerHTML = '&nbsp;';
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
      wrapCtrl(
        makeButton('regenerate', () => {
          state.seed = (Math.random() * 1e9) | 0;
          startGenerate();
        }),
        {
          html: `<p>Re-seeds the RNG and rebuilds the grid. Rim is grass. Houses (ids 12–20) may not sit directly next to another house (4-way); after one is placed, those options are removed from neighbors.</p>
<pre class="pseudo">rim ← grass
repeat:
  pick min-entropy cell; if neighbor is a collapsed house, drop 12–20 from mask
  collapse → propagate sockets
  if choice is house: strip 12–20 from uncollapsed 4-neighbors; propagate</pre>`,
        },
      ),
      wrapCtrl(
        makeRange('grid width', 'gridW', 16, 56, 2, (v) => String(v | 0), () => {
          startGenerate();
        }),
        { html: `<p>Interior width in cells. Height scales with the 16:9 canvas so the block stays readable.</p>` },
      ),
      wrapCtrl(
        makeRange('steps / frame', 'stepsPerFrame', 1, 200, 1, (v) => String(v | 0), () => {}),
        { html: `<p>How many collapse+propagation rounds run per animation frame when “animate collapse” is on. Higher finishes faster; lower is easier to follow.</p>` },
      ),
      wrapCtrl(
        makeCheckbox('animate collapse', 'animate', () => {
          startGenerate();
        }),
        { html: `<p>When off, the solver runs to completion immediately (still retries on contradiction).</p>` },
      ),
      wrapCtrl(
        makeCheckbox('show uncertainty', 'showUncertainty', () => draw()),
        { html: `<p>Colors unresolved cells by how many tile options remain (darker = more possibilities).</p>` },
      ),
    );
  }

  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      resizeCanvas();
      draw();
    }, 120);
  });

  globalThis.wfcCityLoadSpritesheet = (url) => loadSpritesheet(url);
  globalThis.wfcCityClearSpritesheet = clearSpritesheet;

  initWave();
  resizeCanvas();
  buildControls();

  loadSpritesheet(WFC_TILES_URL);

  if (state.animate) {
    runSolveLoop();
  } else {
    startGenerate();
  }
})();
