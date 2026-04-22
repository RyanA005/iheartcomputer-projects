(() => {
  const canvas = document.getElementById('demo-fire');
  const controlsHost = document.getElementById('controls-fire');
  if (!canvas || !controlsHost) return;

  const ctx = canvas.getContext('2d', { alpha: false });

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
  let rand = mulberry32((Math.random() * 1e9) | 0);

  // ---------- heat palette LUT ----------
  const PALETTE = new Uint8ClampedArray(256 * 3);
  (function buildPalette() {
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let r = 0, g = 0, b = 0;
      if (t < 0.12) {
        const u = t / 0.12;
        r = u * 70; g = 0; b = u * 8;
      } else if (t < 0.38) {
        const u = (t - 0.12) / 0.26;
        r = 70 + u * 185; g = u * 55; b = 8 - u * 8;
      } else if (t < 0.7) {
        const u = (t - 0.38) / 0.32;
        r = 255; g = 55 + u * 170; b = u * 40;
      } else {
        const u = (t - 0.7) / 0.3;
        r = 255; g = 225 + u * 30; b = 40 + u * 215;
      }
      const k = i * 3;
      PALETTE[k] = r; PALETTE[k + 1] = g; PALETTE[k + 2] = b;
    }
  })();

  // ---------- constants ----------
  const BG_R = 10, BG_G = 8, BG_B = 14;
  const SMOKE_R = 90, SMOKE_G = 88, SMOKE_B = 96;
  const WOOD_R = 120, WOOD_G = 72, WOOD_B = 38;
  const WOOD_RING_R = 160, WOOD_RING_G = 98, WOOD_RING_B = 52;
  const WOOD_CHAR_R = 24, WOOD_CHAR_G = 18, WOOD_CHAR_B = 14;
  const SMOKE_THRESHOLD = 40;  // heat below this, still > 0, converts to smoke

  // ---------- state ----------
  const state = {
    seed: (Math.random() * 1e9) | 0,
    resolution: 240,
    logCount: 6,
    fuelPerLog: 280,
    heatDecay: 3,
    smokeDecay: 1,
    burnTemp: 215,
    ignition: 115,
    catchChance: 0.4,
    wind: 0,
    paused: false,
  };

  // ---------- grid ----------
  let W = 0, H = 0;
  let heat, fuel, fuelMax, smoke;
  let imgData;

  function setupGrid() {
    W = state.resolution | 0;
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.height / Math.max(1, rect.width);
    H = Math.max(30, Math.round(W * ratio));
    canvas.width = W;
    canvas.height = H;
    heat = new Uint8Array(W * H);
    fuel = new Uint16Array(W * H);
    fuelMax = new Uint16Array(W * H);
    smoke = new Uint8Array(W * H);
    imgData = ctx.createImageData(W, H);
  }

  function placeLog(x0, y0, len, thick, fuelAmt) {
    for (let yy = 0; yy < thick; yy++) {
      for (let xx = 0; xx < len; xx++) {
        const x = x0 + xx, y = y0 + yy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const idx = y * W + x;
        fuel[idx] = fuelAmt;
        fuelMax[idx] = fuelAmt;
      }
    }
  }

  function regenerateLogs() {
    rand = mulberry32(state.seed);
    fuel.fill(0); fuelMax.fill(0); heat.fill(0); smoke.fill(0);

    const logs = state.logCount | 0;
    const minY = Math.floor(H * 0.58);
    const maxY = H - 4;
    for (let i = 0; i < logs; i++) {
      const len = Math.max(4, Math.floor((0.10 + rand() * 0.28) * W));
      const thick = 2 + Math.floor(rand() * 3);
      const x0 = Math.floor(rand() * Math.max(1, W - len));
      const y0 = minY + Math.floor(rand() * Math.max(1, maxY - minY - thick));
      placeLog(x0, y0, len, thick, state.fuelPerLog);
    }

    // Kindling: small fast-burning patch near bottom-center, pre-lit.
    const kLen = Math.max(5, Math.floor(W * 0.07));
    const kThick = 2;
    const kX = Math.floor(W * 0.5 - kLen / 2);
    const kY = H - 4;
    placeLog(kX, kY, kLen, kThick, 40);
    for (let yy = 0; yy < kThick; yy++) {
      for (let xx = 0; xx < kLen; xx++) {
        const idx = (kY + yy) * W + (kX + xx);
        heat[idx] = 255;
      }
    }
  }

  // ---------- simulation tick ----------
  function tick() {
    const ignition = state.ignition | 0;
    const burnTemp = state.burnTemp | 0;
    const cool = state.heatDecay | 0;
    const smokeCool = state.smokeDecay | 0;
    const wind = state.wind | 0;

    // A) Fuel burning.
    //   - Cells already burning (heat >= ignition) reliably sustain burnTemp and consume 1 fuel/tick.
    //   - Cold fuel cells with a hot neighbor only catch with probability `catchChance` per tick
    //     (this is what makes spread gradual instead of instant).
    //   - Fuel exhaustion emits a smoke burst above.
    const catchChance = state.catchChance;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const f = fuel[i];
        if (f === 0) continue;
        if (heat[i] >= ignition) {
          heat[i] = burnTemp;
          fuel[i] = f - 1;
          if (fuel[i] === 0) {
            if (y > 0) smoke[i - W] = Math.min(255, smoke[i - W] + 200);
            smoke[i] = Math.min(255, smoke[i] + 140);
          }
        } else {
          let nh = 0;
          if (x > 0)     { const v = heat[i - 1]; if (v > nh) nh = v; }
          if (x < W - 1) { const v = heat[i + 1]; if (v > nh) nh = v; }
          if (y < H - 1) { const v = heat[i + W]; if (v > nh) nh = v; }
          if (y > 0)     { const v = heat[i - W]; if (v > nh) nh = v; }
          if (nh >= ignition && rand() < catchChance) {
            heat[i] = burnTemp;
          }
        }
      }
    }

    // B) Heat propagation (DOOM-style upward sweep).
    //    Extra cooling if there's no nearby fuel (flames starved of fuel die faster).
    for (let y = 0; y < H - 1; y++) {
      const rowHere = y * W;
      const rowBelow = (y + 1) * W;
      for (let x = 0; x < W; x++) {
        const r = rand();
        const windOffset = ((r * 3) | 0) - 1 + wind;
        let sx = x + windOffset;
        if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
        const srcIdx = rowBelow + sx;
        const src = heat[srcIdx];
        let decay = (rand() * (cool + 1)) | 0;
        // starvation: if source cell has no fuel and its neighbors don't either, add extra cooling
        if (src > 0 && fuel[srcIdx] === 0) {
          const leftIdx  = srcIdx - 1;
          const rightIdx = srcIdx + 1;
          const belowIdx = srcIdx + W;
          const noFuelLeft  = sx <= 0        || fuel[leftIdx]  === 0;
          const noFuelRight = sx >= W - 1    || fuel[rightIdx] === 0;
          const noFuelBelow = (y + 1) >= H - 1 || fuel[belowIdx] === 0;
          if (noFuelLeft && noFuelRight && noFuelBelow) decay += 1;
        }
        heat[rowHere + x] = src > decay ? src - decay : 0;
      }
    }
    // bottom row: flames at the very bottom cool normally (no source below)
    {
      const bottom = (H - 1) * W;
      for (let x = 0; x < W; x++) {
        if (fuel[bottom + x] > 0) continue; // burning fuel maintains its own heat in step A
        const d = (rand() * (cool + 2)) | 0;
        const h = heat[bottom + x];
        heat[bottom + x] = h > d ? h - d : 0;
      }
    }

    // C) Heat -> smoke conversion at dying embers (low heat, no fuel there).
    for (let i = 0, n = heat.length; i < n; i++) {
      const h = heat[i];
      if (h > 0 && h < SMOKE_THRESHOLD && fuel[i] === 0) {
        const add = (h * 0.9) | 0;
        const s = smoke[i] + add;
        smoke[i] = s > 255 ? 255 : s;
        heat[i] = 0;
      }
    }

    // D) Smoke propagation: rises, drifts with (extra) wind, decays.
    const smokeWind = wind + ((rand() < 0.5) ? 0 : (rand() < 0.5 ? -1 : 1));
    for (let y = 0; y < H - 1; y++) {
      const rowHere = y * W;
      const rowBelow = (y + 1) * W;
      for (let x = 0; x < W; x++) {
        const r = rand();
        const windOffset = ((r * 5) | 0) - 2 + smokeWind; // wider lateral spread than heat
        let sx = x + windOffset;
        if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
        const src = smoke[rowBelow + sx];
        const decay = (rand() * (smokeCool + 1)) | 0;
        smoke[rowHere + x] = src > decay ? src - decay : 0;
      }
    }
    // bottom row smoke decays in place (nothing below to shift from)
    {
      const bottom = (H - 1) * W;
      for (let x = 0; x < W; x++) {
        const d = (rand() * (smokeCool + 2)) | 0;
        const s = smoke[bottom + x];
        smoke[bottom + x] = s > d ? s - d : 0;
      }
    }
  }

  // ---------- render ----------
  function render() {
    const data = imgData.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const h = heat[i];
        const f = fuel[i];
        const fMax = fuelMax[i];
        const s = smoke[i];
        const k = i * 4;

        let r, g, b;

        if (fMax > 0) {
          // wood base: char as fuel depletes; ring pattern for a little texture
          const char = fMax > 0 ? 1 - (f / fMax) : 1;
          const ring = ((x * 37 + y * 53) & 7) === 0;
          const wr = ring ? WOOD_RING_R : WOOD_R;
          const wg = ring ? WOOD_RING_G : WOOD_G;
          const wb = ring ? WOOD_RING_B : WOOD_B;
          const baseR = wr + (WOOD_CHAR_R - wr) * char;
          const baseG = wg + (WOOD_CHAR_G - wg) * char;
          const baseB = wb + (WOOD_CHAR_B - wb) * char;
          if (f === 0) {
            // fully consumed: let heat/smoke show through.
            r = baseR; g = baseG; b = baseB;
          } else {
            r = baseR; g = baseG; b = baseB;
          }
          if (h > 20) {
            const a = Math.min(1, h / 200);
            const pk = h * 3;
            r = r + (PALETTE[pk]     - r) * a;
            g = g + (PALETTE[pk + 1] - g) * a;
            b = b + (PALETTE[pk + 2] - b) * a;
          }
          if (f === 0 && s > 0 && h === 0) {
            const a = s / 255;
            r = r + (SMOKE_R - r) * a;
            g = g + (SMOKE_G - g) * a;
            b = b + (SMOKE_B - b) * a;
          }
        } else if (h > 0) {
          const pk = h * 3;
          r = PALETTE[pk]; g = PALETTE[pk + 1]; b = PALETTE[pk + 2];
          if (s > 0) {
            const a = (s / 255) * 0.5; // smoke dims flame slightly
            r = r + (SMOKE_R - r) * a;
            g = g + (SMOKE_G - g) * a;
            b = b + (SMOKE_B - b) * a;
          }
        } else if (s > 0) {
          const a = s / 255;
          r = BG_R + (SMOKE_R - BG_R) * a;
          g = BG_G + (SMOKE_G - BG_G) * a;
          b = BG_B + (SMOKE_B - BG_B) * a;
        } else {
          r = BG_R; g = BG_G; b = BG_B;
        }

        data[k] = r | 0;
        data[k + 1] = g | 0;
        data[k + 2] = b | 0;
        data[k + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // ---------- interaction ----------
  let pointerDown = false;
  function igniteAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const cx = Math.floor(((clientX - rect.left) / rect.width) * W);
    const cy = Math.floor(((clientY - rect.top) / rect.height) * H);
    const R = Math.max(3, Math.floor(W * 0.022));
    const R2 = R * R;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R2) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        heat[y * W + x] = 255;
      }
    }
  }
  canvas.addEventListener('pointerdown', (e) => {
    pointerDown = true;
    canvas.setPointerCapture(e.pointerId);
    igniteAt(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointerDown) igniteAt(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerup', (e) => {
    pointerDown = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointercancel', () => { pointerDown = false; });

  // ---------- main loop ----------
  function loop() {
    if (!state.paused) tick();
    render();
    requestAnimationFrame(loop);
  }

  // ---------- resize ----------
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { setupGrid(); regenerateLogs(); }, 120);
  });

  // ---------- controls ----------
  function makeRange(label, key, min, max, step, fmt, onChange) {
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
      if (onChange) onChange();
    });
    wrap.append(lab, input);
    return wrap;
  }

  function makeSelect(label, key, options, onChange) {
    const wrap = document.createElement('div'); wrap.className = 'control';
    const lab = document.createElement('label');
    const name = document.createElement('span'); name.textContent = label;
    lab.append(name);
    const sel = document.createElement('select');
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.value; o.textContent = opt.label;
      if (String(opt.value) === String(state[key])) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      const raw = sel.value;
      const num = Number(raw);
      state[key] = Number.isFinite(num) && String(num) === raw ? num : raw;
      if (onChange) onChange();
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
    input.addEventListener('change', () => { state[key] = input.checked; });
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
      makeButton('regenerate logs', () => {
        state.seed = (Math.random() * 1e9) | 0;
        regenerateLogs();
      }),
      makeRange('log count',    'logCount',   2,   15,  1,   v => (v | 0).toString(), regenerateLogs),
      makeRange('fuel per log', 'fuelPerLog', 40,  400, 10,  v => (v | 0).toString(), regenerateLogs),
      makeRange('heat decay',   'heatDecay',  0,   5,   1,   v => (v | 0).toString()),
      makeRange('smoke decay',  'smokeDecay', 0,   4,   1,   v => (v | 0).toString()),
      makeRange('burn temp',    'burnTemp',   120, 255, 5,   v => (v | 0).toString()),
      makeRange('ignition',     'ignition',   40,  180, 5,   v => (v | 0).toString()),
      makeRange('catch chance', 'catchChance', 0.005, 1, 0.005, v => (v * 100).toFixed(1) + '%'),
      makeRange('wind',         'wind',      -3,   3,   1,   v => (v | 0).toString()),
      makeSelect('resolution', 'resolution', [
        { value: 120, label: '120 (coarse)' },
        { value: 180, label: '180' },
        { value: 240, label: '240 (default)' },
        { value: 320, label: '320 (fine)' },
      ], () => { setupGrid(); regenerateLogs(); }),
      makeCheckbox('paused', 'paused'),
    );
  }

  // ---------- boot ----------
  setupGrid();
  regenerateLogs();
  buildControls();
  requestAnimationFrame(loop);
})();
