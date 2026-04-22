(() => {
  const canvas = document.getElementById('demo-room');
  const controlsHost = document.getElementById('controls-room');
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
  let rand = mulberry32(0);

  // ---------- palette codes ----------
  // Architecture
  const VOID = 0, STONE = 1, PAPER = 2, WOOD = 3, BEAM = 4;
  // Bed (3x2): pillow, mattress, footboard | legL, frame, legR
  const BED_A = 10, BED_B = 11, BED_C = 12, BED_D = 13, BED_E = 14, BED_F = 15;
  // Bookshelf (1x4): top, shelf1, shelf2, bottom
  const BK_G = 20, BK_H = 21, BK_I = 22, BK_J = 23;
  // Table + chairs (4x2): chair-L-top, table-TL, table-TR, chair-R-top | chair-L-bot, table-BL, table-BR, chair-R-bot
  const T_K = 30, T_L = 31, T_M = 32, T_N = 33, T_O = 34, T_P = 35, T_Q = 36, T_R = 37;
  // Plant (1x2): leaves | pot
  const PL_S = 40, PL_T = 41;
  // Picture (2x2): TL, TR | BL, BR
  const PC_U = 50, PC_V = 51, PC_W = 52, PC_X = 53;
  // Lamp (1x2): cord | shade
  const LM_Y = 60, LM_Z = 61;
  // Fireplace (3x3): mantel LMR | fire LMR | hearth LMR
  const FP_1 = 70, FP_2 = 71, FP_3 = 72, FP_4 = 73, FP_5 = 74, FP_6 = 75, FP_7 = 76, FP_8 = 77, FP_9 = 78;
  // Clock (1x1)
  const CLK_0 = 80;
  // Window (2x2): TL, TR | BL, BR
  const WN_EX = 90, WN_HA = 91, WN_DO = 92, WN_PC = 93;

  const WILD = 255;
  const CODE = {
    '.': VOID, 'S': STONE, 'P': PAPER, 'W': WOOD, 'C': BEAM,
    'a': BED_A, 'b': BED_B, 'c': BED_C, 'd': BED_D, 'e': BED_E, 'f': BED_F,
    'g': BK_G, 'h': BK_H, 'i': BK_I, 'j': BK_J,
    'k': T_K, 'l': T_L, 'm': T_M, 'n': T_N, 'o': T_O, 'p': T_P, 'q': T_Q, 'r': T_R,
    's': PL_S, 't': PL_T,
    'u': PC_U, 'v': PC_V, 'w': PC_W, 'x': PC_X,
    'y': LM_Y, 'z': LM_Z,
    '1': FP_1, '2': FP_2, '3': FP_3, '4': FP_4, '5': FP_5, '6': FP_6, '7': FP_7, '8': FP_8, '9': FP_9,
    '0': CLK_0,
    '!': WN_EX, '#': WN_HA, '$': WN_DO, '%': WN_PC,
    '*': WILD,
  };

  // ---------- MJ-style engine (same shape as prior demos) ----------
  function encodeRows(rows) {
    const h = rows.length, w = rows[0].length;
    const d = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      if (row.length !== w) throw new Error('rule rows must be same width');
      for (let x = 0; x < w; x++) {
        const c = CODE[row[x]];
        if (c === undefined) throw new Error('unknown rule char: ' + row[x]);
        d[y * w + x] = c;
      }
    }
    return { w, h, d };
  }

  function rotateCW(g) {
    const nw = g.h, nh = g.w;
    const d = new Uint8Array(nw * nh);
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        d[x * nw + (g.h - 1 - y)] = g.d[y * g.w + x];
      }
    }
    return { w: nw, h: nh, d };
  }

  function compileRule(rule) {
    const basep = encodeRows(rule.pattern);
    const baseq = encodeRows(rule.replacement);
    if (basep.w !== baseq.w || basep.h !== baseq.h) {
      throw new Error('pattern and replacement must be same size');
    }
    const variants = [{ p: basep, q: baseq }];
    const rots = Math.max(1, Math.min(4, rule.rotations | 0));
    let p = basep, q = baseq;
    for (let i = 1; i < rots; i++) {
      p = rotateCW(p);
      q = rotateCW(q);
      variants.push({ p, q });
    }
    return {
      variants,
      maxFires: rule.maxFires == null ? Infinity : rule.maxFires,
      firesLeft: rule.maxFires == null ? Infinity : rule.maxFires,
      label: rule.label || '',
    };
  }

  function patternMatches(grid, gW, p, mx, my) {
    const pw = p.w, ph = p.h, pd = p.d;
    for (let py = 0; py < ph; py++) {
      const gy = my + py;
      for (let px = 0; px < pw; px++) {
        const pc = pd[py * pw + px];
        if (pc === WILD) continue;
        if (grid[gy * gW + (mx + px)] !== pc) return false;
      }
    }
    return true;
  }

  function findAllMatches(grid, gW, gH, p) {
    const out = [];
    const maxY = gH - p.h;
    const maxX = gW - p.w;
    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x <= maxX; x++) {
        if (patternMatches(grid, gW, p, x, y)) out.push({ x, y });
      }
    }
    return out;
  }

  function applyVariant(grid, gW, v, match) {
    const q = v.q;
    const qw = q.w, qh = q.h, qd = q.d;
    for (let qy = 0; qy < qh; qy++) {
      for (let qx = 0; qx < qw; qx++) {
        const c = qd[qy * qw + qx];
        if (c === WILD) continue;
        grid[(match.y + qy) * gW + (match.x + qx)] = c;
      }
    }
  }

  function stepRules(grid, gW, gH, rules) {
    for (let ri = 0; ri < rules.length; ri++) {
      const rule = rules[ri];
      if (rule.firesLeft <= 0) continue;
      const all = [];
      for (let vi = 0; vi < rule.variants.length; vi++) {
        const ms = findAllMatches(grid, gW, gH, rule.variants[vi].p);
        for (let k = 0; k < ms.length; k++) all.push({ v: vi, m: ms[k] });
      }
      if (all.length > 0) {
        const pick = all[(rand() * all.length) | 0];
        applyVariant(grid, gW, rule.variants[pick.v], pick.m);
        rule.firesLeft -= 1;
        return ri;
      }
    }
    return -1;
  }

  // ---------- ruleset ----------
  //
  // Order: biggest / most constrained pieces first so they can claim floor
  // or wall space before smaller pieces fill it in. Each rule's replacement
  // overwrites the wallpaper / floor cells it occupies, which prevents later
  // rules from matching there.
  //
  // `opts.density` (0.25..2.5) scales the maxFires of multi-fire decor
  // rules so the user can dial the room from spartan to cluttered.
  // `opts.include` is an object of per-piece toggles.
  function makeRules(opts) {
    const density = opts && opts.density != null ? opts.density : 1;
    const inc = (opts && opts.include) || {};
    const on = (k) => inc[k] !== false; // default on
    const scale = (n) => Math.max(0, Math.round(n * density));
    const rules = [];

    if (on('fireplace')) rules.push(compileRule({
      label: 'fireplace',
      pattern:     ['PPP', 'PPP', 'PPP', 'WWW'],
      replacement: ['123', '456', '789', 'WWW'],
      rotations: 1, maxFires: 1,
    }));

    if (on('bookshelves')) {
      rules.push(compileRule({
        label: 'bookshelf-L',
        pattern:     ['SP', 'SP', 'SP', 'SW'],
        replacement: ['Sg', 'Sh', 'Si', 'Sj'],
        rotations: 1, maxFires: 1,
      }));
      rules.push(compileRule({
        label: 'bookshelf-R',
        pattern:     ['PS', 'PS', 'PS', 'WS'],
        replacement: ['gS', 'hS', 'iS', 'jS'],
        rotations: 1, maxFires: 1,
      }));
    }

    if (on('window')) rules.push(compileRule({
      label: 'window',
      pattern:     ['PP', 'PP', 'PP', 'PP'],
      replacement: ['PP', '!#', '$%', 'PP'],
      rotations: 1, maxFires: scale(2),
    }));

    if (on('bed')) rules.push(compileRule({
      label: 'bed',
      pattern:     ['PPP', 'WWW'],
      replacement: ['abc', 'def'],
      rotations: 1, maxFires: 1,
    }));

    if (on('table')) rules.push(compileRule({
      label: 'table',
      pattern:     ['PPPP', 'WWWW'],
      replacement: ['klmn', 'opqr'],
      rotations: 1, maxFires: 1,
    }));

    rules.push(compileRule({
      label: 'picture',
      pattern:     ['PP', 'PP'],
      replacement: ['uv', 'wx'],
      rotations: 1, maxFires: scale(3),
    }));

    rules.push(compileRule({
      label: 'plant',
      pattern:     ['P', 'P', 'W'],
      replacement: ['s', 't', 'W'],
      rotations: 1, maxFires: scale(2),
    }));

    rules.push(compileRule({
      label: 'lamp',
      pattern:     ['C', 'P', 'P'],
      replacement: ['C', 'y', 'z'],
      rotations: 1, maxFires: scale(2),
    }));

    rules.push(compileRule({
      label: 'clock',
      pattern:     ['PPP', 'PPP', 'PPP'],
      replacement: ['PPP', 'P0P', 'PPP'],
      rotations: 1, maxFires: 1,
    }));

    return rules;
  }

  // ---------- constants ----------
  const TILE = 22;
  // Room height is fixed at 12 tiles; width is the only size knob.
  const ROOM_H = 12;
  // Grid width is state-driven so the user can resize the room.
  let GRID_W = 26;
  const GRID_H = ROOM_H;

  const state = {
    seed: (Math.random() * 1e9) | 0,
    speed: 14,
    roomW: 26,
    density: 1.0,
    paused: false,
    include: {
      fireplace: true,
      bookshelves: true,
      bed: true,
      table: true,
      window: true,
    },
  };

  // ---------- seed-driven color palette ----------
  // Each regeneration picks a cohesive color scheme so repeat runs look
  // visually distinct without any tile being ugly.
  const WALLPAPER_COLORS = [
    { base: '#cfd9c3', dot: '#b3c1a3' }, // sage
    { base: '#d6c7a6', dot: '#b9a983' }, // cream
    { base: '#c5cfdc', dot: '#a4b1c4' }, // sky
    { base: '#d7c3cd', dot: '#bba1ac' }, // rose
    { base: '#c9bfda', dot: '#ac9fc3' }, // lavender
    { base: '#b9c8b5', dot: '#96aa92' }, // moss
  ];
  const FLOOR_COLORS = [
    { plank: '#9a6a3b', dark: '#6e4824', knot: '#4d3217' }, // oak
    { plank: '#7a4a28', dark: '#4d2d17', knot: '#2e1a0c' }, // walnut
    { plank: '#b88558', dark: '#8a5f3a', knot: '#5d3c20' }, // pine
    { plank: '#62402a', dark: '#3a2616', knot: '#1f130a' }, // dark cherry
  ];
  const BLANKET_COLORS = [
    { body: '#b14754', pat: '#7a2a36' }, // red
    { body: '#3e6a9a', pat: '#294c74' }, // blue
    { body: '#5a8a4a', pat: '#3d6632' }, // green
    { body: '#8a5a9a', pat: '#5f3d70' }, // purple
    { body: '#c88a3a', pat: '#8f5e20' }, // mustard
  ];
  const BOOK_COLORS = [
    ['#8a3a3a', '#2a4a7a', '#3a7a3a', '#8a6a2a', '#6a3a7a'],
    ['#7a2a2a', '#2a5a8a', '#4a6a3a', '#9a7a3a', '#5a2a5a'],
    ['#8a5a2a', '#3a5a6a', '#5a3a3a', '#7a6a3a', '#3a6a5a'],
  ];
  let palette = {
    wall: WALLPAPER_COLORS[0],
    floor: FLOOR_COLORS[0],
    blanket: BLANKET_COLORS[0],
    books: BOOK_COLORS[0],
  };
  function pickPalette() {
    palette = {
      wall:    WALLPAPER_COLORS[(rand() * WALLPAPER_COLORS.length) | 0],
      floor:   FLOOR_COLORS[(rand() * FLOOR_COLORS.length) | 0],
      blanket: BLANKET_COLORS[(rand() * BLANKET_COLORS.length) | 0],
      books:   BOOK_COLORS[(rand() * BOOK_COLORS.length) | 0],
    };
  }

  // ---------- state ----------
  let grid = new Uint8Array(GRID_W * GRID_H);
  let rules = makeRules();
  let rewritesBuffer = 0;
  let lastT = performance.now();
  let lastRuleFired = -1;
  let phase = 'running';
  let doneFlashT = 0;

  // ---------- seeding ----------
  //
  // Lay down outer stone frame, a ceiling beam row, a wood floor row, and
  // fill the interior with wallpaper. Rules will then carve furniture
  // into the wallpaper.
  function seedRoom() {
    grid.fill(VOID);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        let c;
        if (x === 0 || x === GRID_W - 1 || y === 0 || y === GRID_H - 1) c = STONE;
        else if (y === 1) c = BEAM;
        else if (y === GRID_H - 2) c = WOOD;
        else c = PAPER;
        grid[y * GRID_W + x] = c;
      }
    }
  }

  // ---------- rendering helpers ----------
  function rect(x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  }
  function px(x, y, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  }

  // Deterministic 2-bit hash for subtle tile variance.
  function hash2(x, y) {
    return (((x * 0x9e3779b1) ^ (y * 0x85ebca77) ^ state.seed) >>> 0) & 3;
  }

  // ---------- architecture tiles ----------
  function drawVoid(X, Y) { rect(X, Y, TILE, TILE, '#0a0810'); }

  function drawStone(X, Y, gx, gy) {
    rect(X, Y, TILE, TILE, '#3a3742');
    // brick mortar pattern: two courses per tile, offset every other row
    const rowOffset = (gy & 1) ? (TILE >> 1) : 0;
    ctx.fillStyle = '#262430';
    ctx.fillRect(X, Y + (TILE >> 1) - 1, TILE, 1);
    ctx.fillRect(X + ((rowOffset) % TILE), Y, 1, (TILE >> 1));
    ctx.fillRect(X + ((rowOffset + (TILE >> 1)) % TILE), Y + (TILE >> 1), 1, (TILE >> 1));
    // speckles
    const h = hash2(gx, gy);
    ctx.fillStyle = '#4a4654';
    ctx.fillRect(X + 3 + (h & 1) * 6, Y + 3 + ((h >> 1) & 1) * 6, 2, 2);
  }

  function drawBeam(X, Y, gx) {
    rect(X, Y, TILE, TILE, '#6b4a2b');
    rect(X, Y, TILE, 2, '#855e38');
    rect(X, Y + TILE - 2, TILE, 2, '#4a311b');
    // wood grain
    ctx.fillStyle = '#57391f';
    ctx.fillRect(X, Y + 6, TILE, 1);
    ctx.fillRect(X, Y + 12, TILE, 1);
    // occasional peg
    if ((gx & 3) === 1) {
      ctx.fillStyle = '#2f1d0e';
      ctx.fillRect(X + 4, Y + 9, 2, 2);
      ctx.fillRect(X + TILE - 6, Y + 9, 2, 2);
    }
  }

  function drawPaper(X, Y, gx, gy) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // tiny dotted motif
    ctx.fillStyle = palette.wall.dot;
    const parity = ((gx + gy) & 1);
    if (parity === 0) {
      ctx.fillRect(X + 4, Y + 4, 2, 2);
      ctx.fillRect(X + TILE - 6, Y + TILE - 6, 2, 2);
    } else {
      ctx.fillRect(X + 10, Y + 10, 2, 2);
    }
    // subtle top edge highlight so upper wall feels lit
    if (gy === 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(X, Y, TILE, 3);
    }
  }

  function drawWood(X, Y, gx) {
    rect(X, Y, TILE, TILE, palette.floor.plank);
    // plank dividers every 2 tiles
    if ((gx & 1) === 0) {
      ctx.fillStyle = palette.floor.dark;
      ctx.fillRect(X, Y, 1, TILE);
    }
    // top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(X, Y, TILE, 2);
    // bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(X, Y + TILE - 2, TILE, 2);
    // occasional knot
    if (((gx * 7 + state.seed) & 7) === 3) {
      ctx.fillStyle = palette.floor.knot;
      ctx.fillRect(X + 7, Y + 6, 3, 2);
    }
  }

  // ---------- bed (3x2) ----------
  // layout: [a b c]  pillow / mattress / footboard
  //         [d e f]  legL  / frame    / legR
  function drawBedTop(X, Y, kind) {
    // wallpaper behind so we don't leave gaps near edges
    rect(X, Y, TILE, TILE, palette.wall.base);
    // pillow (a) / mattress (b) / foot (c)
    if (kind === 'pillow') {
      // pillow
      rect(X + 2, Y + 6, TILE - 4, TILE - 10, '#f2ead7');
      rect(X + 2, Y + 6, TILE - 4, 2, '#ffffff');
      rect(X + 2, Y + TILE - 6, TILE - 4, 2, '#b8ae97');
      // headboard peek
      rect(X + 1, Y + 4, TILE - 2, 3, '#3d2416');
    } else if (kind === 'mattress') {
      rect(X + 1, Y + 4, TILE - 2, TILE - 6, palette.blanket.body);
      rect(X + 1, Y + 4, TILE - 2, 2, 'rgba(255,255,255,0.18)');
      rect(X + 1, Y + TILE - 4, TILE - 2, 2, palette.blanket.pat);
      // quilt pattern dots
      ctx.fillStyle = palette.blanket.pat;
      ctx.fillRect(X + 5, Y + 9, 2, 2);
      ctx.fillRect(X + 11, Y + 13, 2, 2);
      ctx.fillRect(X + 15, Y + 9, 2, 2);
    } else if (kind === 'foot') {
      rect(X + 1, Y + 4, TILE - 2, TILE - 6, palette.blanket.body);
      rect(X + 1, Y + 4, TILE - 2, 2, 'rgba(255,255,255,0.18)');
      // footboard
      rect(X + 1, Y + 4, 3, TILE - 6, '#3d2416');
      rect(X + 2, Y + 5, 1, TILE - 8, '#5a3720');
    }
  }
  function drawBedBot(X, Y, kind) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // frame across
    rect(X, Y + 1, TILE, 6, '#3d2416');
    rect(X, Y + 1, TILE, 2, '#5a3720');
    rect(X, Y + 6, TILE, 1, '#1c1008');
    // legs (left / right only)
    if (kind === 'legL') {
      rect(X + 2, Y + 7, 3, TILE - 8, '#3d2416');
      rect(X + 2, Y + 7, 1, TILE - 8, '#5a3720');
    } else if (kind === 'legR') {
      rect(X + TILE - 5, Y + 7, 3, TILE - 8, '#3d2416');
      rect(X + TILE - 4, Y + 7, 1, TILE - 8, '#5a3720');
    }
  }

  // ---------- bookshelf (1x4) ----------
  function drawShelfCell(X, Y, row, gx, gy) {
    rect(X, Y, TILE, TILE, '#3d2416');
    rect(X, Y, 2, TILE, '#5a3720');
    rect(X + TILE - 2, Y, 2, TILE, '#2a180d');
    rect(X, Y, TILE, 2, '#5a3720');
    rect(X, Y + TILE - 2, TILE, 2, '#2a180d');
    // books or cabinet
    if (row === 3) {
      // bottom cabinet
      rect(X + 3, Y + 3, TILE - 6, TILE - 6, '#5a3a22');
      rect(X + 3, Y + 3, TILE - 6, 2, '#7a5232');
      // knobs
      ctx.fillStyle = '#d9a94a';
      ctx.fillRect(X + (TILE >> 1) - 2, Y + (TILE >> 1), 2, 2);
    } else {
      // books row
      const books = palette.books;
      const slotY = Y + 3;
      const slotH = TILE - 6;
      let bx = X + 3;
      let i = (gy * 5 + state.seed) & 7;
      while (bx < X + TILE - 3) {
        const bw = 2 + ((i & 1) ? 1 : 2); // 2 or 3 wide
        if (bx + bw > X + TILE - 3) break;
        const color = books[(i + gy + bx) % books.length];
        rect(bx, slotY, bw, slotH, color);
        rect(bx, slotY, bw, 1, 'rgba(255,255,255,0.2)');
        rect(bx, slotY + slotH - 1, bw, 1, 'rgba(0,0,0,0.3)');
        bx += bw + 1;
        i++;
      }
      // shelf board
      rect(X + 2, Y + TILE - 3, TILE - 4, 1, '#2a180d');
    }
  }

  // ---------- table + chairs (4x2) ----------
  // top row: k(chairL-top) l(tbl-TL) m(tbl-TR) n(chairR-top)
  // bot row: o(chairL-bot) p(tbl-BL) q(tbl-BR) r(chairR-bot)
  function drawChairTop(X, Y, side) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // chair back
    const bx = side === 'L' ? X + 4 : X + TILE - 8;
    rect(bx, Y + 4, 4, TILE - 4, '#6a4225');
    rect(bx, Y + 4, 4, 2, '#8a5f36');
    rect(bx + 3, Y + 4, 1, TILE - 4, '#3d2416');
    // cross rail
    rect(bx - 1, Y + TILE - 6, 6, 2, '#6a4225');
  }
  function drawChairBot(X, Y, side) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // seat
    const sxStart = side === 'L' ? X + 2 : X;
    rect(sxStart, Y + 2, TILE - 2, 5, '#8a5f36');
    rect(sxStart, Y + 2, TILE - 2, 1, '#a67942');
    rect(sxStart, Y + 6, TILE - 2, 1, '#3d2416');
    // front + back leg
    const legFront = side === 'L' ? X + 3 : X + TILE - 5;
    const legBack = side === 'L' ? X + TILE - 4 : X + 2;
    rect(legFront, Y + 7, 2, TILE - 7, '#6a4225');
    rect(legBack, Y + 7, 2, TILE - 7, '#6a4225');
  }
  function drawTableTop(X, Y, side) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // table top spans both cells — draw one half
    rect(X, Y + 8, TILE, 5, '#8a5f36');
    rect(X, Y + 8, TILE, 1, '#a67942');
    rect(X, Y + 12, TILE, 1, '#3d2416');
    // little item on table if left half
    if (side === 'L') {
      // teacup
      rect(X + 8, Y + 3, 5, 5, '#f2ead7');
      rect(X + 8, Y + 3, 5, 1, '#ffffff');
      rect(X + 12, Y + 4, 2, 3, '#d4c9af');
      // steam
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(X + 9, Y + 1, 1, 1);
      ctx.fillRect(X + 11, Y + 0, 1, 1);
    } else {
      // book
      rect(X + 5, Y + 4, 8, 4, palette.books[0]);
      rect(X + 5, Y + 4, 8, 1, 'rgba(255,255,255,0.3)');
      rect(X + 5, Y + 7, 8, 1, 'rgba(0,0,0,0.3)');
    }
  }
  function drawTableBot(X, Y, side) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // apron
    rect(X, Y, TILE, 3, '#6a4225');
    // leg — on outer side of pair so the two table cells together show 2 legs
    const legX = side === 'L' ? X + 2 : X + TILE - 5;
    rect(legX, Y + 3, 3, TILE - 3, '#6a4225');
    rect(legX, Y + 3, 1, TILE - 3, '#8a5f36');
  }

  // ---------- plant (1x2) ----------
  function drawPlantTop(X, Y) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // leafy crown
    const cx = X + (TILE >> 1);
    const cy = Y + TILE - 4;
    ctx.fillStyle = '#3d6a2a';
    ctx.fillRect(cx - 7, cy - 8, 14, 8);
    ctx.fillStyle = '#4f8a38';
    ctx.fillRect(cx - 6, cy - 9, 4, 4);
    ctx.fillRect(cx, cy - 10, 4, 5);
    ctx.fillRect(cx + 4, cy - 7, 3, 3);
    ctx.fillStyle = '#2a4a1d';
    ctx.fillRect(cx - 5, cy - 3, 3, 2);
    ctx.fillRect(cx + 2, cy - 4, 3, 2);
    // tiny flowers
    ctx.fillStyle = '#e9d968';
    ctx.fillRect(cx - 3, cy - 7, 1, 1);
    ctx.fillRect(cx + 3, cy - 8, 1, 1);
  }
  function drawPlantBot(X, Y) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // terracotta pot
    const pw = TILE - 8;
    rect(X + 4, Y + 2, pw, 3, '#c96c3a');
    rect(X + 4, Y + 2, pw, 1, '#e3834a');
    rect(X + 5, Y + 5, pw - 2, TILE - 9, '#a85228');
    rect(X + 5, Y + 5, 1, TILE - 9, '#c96c3a');
    rect(X + 5 + pw - 3, Y + 5, 1, TILE - 9, '#7a361a');
  }

  // ---------- picture (2x2) ----------
  // The whole picture sits inside the 2x2 tile region with a 3px inset on
  // every outer edge. Each cell draws its quarter.
  function drawPicCell(X, Y, part) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    const left = (part === 'tl' || part === 'bl');
    const top  = (part === 'tl' || part === 'tr');
    const fx = left ? X + 3 : X;
    const fy = top  ? Y + 3 : Y;
    const fw = TILE - 3;
    const fh = TILE - 3;
    // gold frame base
    rect(fx, fy, fw, fh, '#b0883a');
    // frame highlights / shadows on the true outer edges only
    if (top)  rect(fx, fy, fw, 2, '#e3c578');
    if (!top) rect(fx, fy + fh - 2, fw, 2, '#7a5a22');
    if (left) rect(fx, fy, 2, fh, '#e3c578');
    if (!left) rect(fx + fw - 2, fy, 2, fh, '#7a5a22');
    // interior image (inset 2 inside frame)
    const ix = fx + (left ? 2 : 0);
    const iy = fy + (top  ? 2 : 0);
    const iw = fw - 2;
    const ih = fh - 2;
    rect(ix, iy, iw, ih, '#6a8cb5');
    if (part === 'tr') rect(X + TILE - 8, Y + 7, 3, 3, '#f3e89b');
    if (part === 'tl') { rect(X + TILE - 9, Y + 9, 5, 2, '#e4eef7'); rect(X + TILE - 8, Y + 8, 3, 1, '#e4eef7'); }
    if (!top) {
      ctx.fillStyle = '#3e5c38';
      ctx.fillRect(ix, iy + ih - 5, iw, 5);
      ctx.fillStyle = '#567a48';
      if (part === 'bl') ctx.fillRect(ix + 2, iy + ih - 7, 6, 3);
      if (part === 'br') ctx.fillRect(ix + 1, iy + ih - 6, 7, 2);
    }
  }

  // ---------- lamp (1x2 from ceiling) ----------
  function drawLampCord(X, Y) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    const cx = X + (TILE >> 1);
    rect(cx, Y, 1, TILE, '#2a2028');
  }
  function drawLampShade(X, Y) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    const cx = X + (TILE >> 1);
    rect(cx, Y, 1, 3, '#2a2028');
    // warm glow aura (under shade)
    ctx.fillStyle = 'rgba(255, 215, 122, 0.22)';
    ctx.fillRect(X + 2, Y + 10, TILE - 4, TILE - 10);
    // shade body (trapezoid approximated with three rows)
    rect(X + 6, Y + 4, TILE - 12, 2, '#3a2f24');
    rect(X + 5, Y + 6, TILE - 10, 2, '#7a5c3a');
    rect(X + 4, Y + 8, TILE - 8, 2, '#a37b4a');
    rect(X + 3, Y + 10, TILE - 6, 1, '#4a3720');
    // bulb glow visible below shade
    rect(X + (TILE >> 1) - 2, Y + 11, 4, 2, '#ffe9a6');
    px(cx, Y + 12, '#fff3c5');
  }

  // ---------- fireplace (3x3) ----------
  function drawFPMantel(X, Y, pos, gx) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // mantel shelf spanning all three cells
    rect(X, Y + TILE - 6, TILE, 3, '#6a4a30');
    rect(X, Y + TILE - 6, TILE, 1, '#8a6540');
    rect(X, Y + TILE - 3, TILE, 2, '#3d2416');
    // chimney column above
    rect(X + 1, Y, TILE - 2, TILE - 7, '#6a5a55');
    rect(X + 1, Y, 2, TILE - 7, '#8a7a74');
    rect(X + TILE - 3, Y, 2, TILE - 7, '#4a3d39');
    // brick lines
    ctx.fillStyle = '#4a3d39';
    ctx.fillRect(X + 1, Y + 5, TILE - 2, 1);
    ctx.fillRect(X + 1, Y + 10, TILE - 2, 1);
    // trinket on the mantel (middle cell only)
    if (pos === 'M') {
      // candle
      rect(X + (TILE >> 1) - 1, Y + TILE - 11, 2, 5, '#f2ead7');
      rect(X + (TILE >> 1), Y + TILE - 13, 1, 2, '#ffb347');
    }
  }
  function drawFPFire(X, Y, pos) {
    // fire chamber interior — dark void + flames
    rect(X, Y, TILE, TILE, palette.wall.base);
    // outer hearth stones frame
    const leftStone = pos === 'L';
    const rightStone = pos === 'R';
    if (leftStone) {
      rect(X, Y, 5, TILE, '#4a3d39');
      rect(X, Y, 2, TILE, '#6a5a55');
      rect(X + 4, Y, 1, TILE, '#2a2028');
    }
    if (rightStone) {
      rect(X + TILE - 5, Y, 5, TILE, '#4a3d39');
      rect(X + TILE - 2, Y, 2, TILE, '#2a2028');
      rect(X + TILE - 5, Y, 1, TILE, '#6a5a55');
    }
    // black hearth void
    const innerX = leftStone ? X + 5 : X;
    const innerW = (leftStone ? -5 : 0) + (rightStone ? -5 : 0) + TILE;
    rect(innerX, Y, innerW, TILE, '#0a0810');
    // flames (middle cell draws the biggest fire)
    if (pos === 'M') {
      ctx.fillStyle = '#c94a2a';
      ctx.fillRect(X + 4, Y + 6, TILE - 8, TILE - 8);
      ctx.fillStyle = '#e78736';
      ctx.fillRect(X + 5, Y + 8, TILE - 10, TILE - 11);
      ctx.fillStyle = '#f9d046';
      ctx.fillRect(X + (TILE >> 1) - 2, Y + 10, 4, TILE - 13);
      ctx.fillStyle = '#fff2ae';
      ctx.fillRect(X + (TILE >> 1) - 1, Y + 13, 2, TILE - 16);
    } else {
      // small embers in side cells
      ctx.fillStyle = '#c94a2a';
      if (leftStone) ctx.fillRect(innerX + 2, Y + TILE - 6, 4, 2);
      if (rightStone) ctx.fillRect(innerX + innerW - 6, Y + TILE - 6, 4, 2);
    }
  }
  function drawFPHearth(X, Y, pos) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    // stone base
    rect(X, Y, TILE, TILE - 4, '#5a5053');
    rect(X, Y, TILE, 2, '#7a7074');
    rect(X, Y + TILE - 6, TILE, 1, '#3a3037');
    // mortar line
    ctx.fillStyle = '#3a3037';
    ctx.fillRect(X, Y + 7, TILE, 1);
    if (pos === 'M') ctx.fillRect(X + (TILE >> 1), Y, 1, 7);
    else if (pos === 'L') ctx.fillRect(X + TILE - 4, Y, 1, 7);
    else ctx.fillRect(X + 4, Y, 1, 7);
    // ember glow on the floor just in front
    if (pos === 'M') {
      ctx.fillStyle = 'rgba(255,130,60,0.25)';
      ctx.fillRect(X, Y + TILE - 3, TILE, 3);
    }
  }

  // ---------- clock (1x1) ----------
  function drawClock(X, Y) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    const cx = X + (TILE >> 1);
    const cy = Y + (TILE >> 1);
    // wood ring
    rect(cx - 7, cy - 7, 14, 14, '#6a4225');
    rect(cx - 6, cy - 6, 12, 12, '#f2ead7');
    rect(cx - 6, cy - 6, 12, 1, '#c8bfa3');
    rect(cx - 6, cy + 5, 12, 1, '#a39a80');
    // tick marks
    ctx.fillStyle = '#3d2416';
    ctx.fillRect(cx - 1, cy - 6, 2, 1); // 12
    ctx.fillRect(cx + 5, cy - 1, 1, 2); // 3
    ctx.fillRect(cx - 1, cy + 5, 2, 1); // 6
    ctx.fillRect(cx - 6, cy - 1, 1, 2); // 9
    // hands
    ctx.fillRect(cx, cy - 4, 1, 4); // minute
    ctx.fillRect(cx, cy, 4, 1); // hour
    // centerdot
    ctx.fillStyle = '#a83434';
    ctx.fillRect(cx, cy, 1, 1);
  }

  // ---------- window (2x2) ----------
  // A single 2x2 window drawn a quarter at a time. Sky + clouds + sun +
  // distant hills are split across the 4 quadrants for a landscape feel.
  function drawWindow(X, Y, part) {
    rect(X, Y, TILE, TILE, palette.wall.base);
    const frameCol = '#6a4a2a';
    const hlCol    = '#8a6540';
    const shCol    = '#3d2416';
    const skyTop   = '#9bc4e8';
    const skyBot   = '#b9d6ee';
    const left = (part === 'tl' || part === 'bl');
    const top  = (part === 'tl' || part === 'tr');
    // outer frame on outer edges only (2px)
    if (top)   rect(X, Y, TILE, 2, frameCol);
    if (!top)  rect(X, Y + TILE - 2, TILE, 2, frameCol);
    if (left)  rect(X, Y, 2, TILE, frameCol);
    if (!left) rect(X + TILE - 2, Y, 2, TILE, frameCol);
    // frame light/shadow accents
    if (top)  rect(X, Y + 1, TILE, 1, hlCol);
    if (left) rect(X + 1, Y, 1, TILE, hlCol);
    if (!top) rect(X, Y + TILE - 1, TILE, 1, shCol);
    if (!left) rect(X + TILE - 1, Y, 1, TILE, shCol);
    // pane: fill the cell interior with sky (minus frame/mullion area)
    const px0 = left ? X + 2 : X;
    const py0 = top  ? Y + 2 : Y;
    const pw  = TILE - 2;
    const ph  = TILE - 2;
    // gradient sky (two horizontal bands)
    rect(px0, py0, pw, Math.max(0, Math.floor(ph / 2)), skyTop);
    rect(px0, py0 + Math.floor(ph / 2), pw, ph - Math.floor(ph / 2), skyBot);
    // mullion cross: 2px wide on the inner edges (i.e. toward cell seam)
    if (left)  rect(X + TILE - 2, Y, 2, TILE, frameCol);
    if (!left) rect(X, Y, 2, TILE, frameCol);
    if (top)   rect(X, Y + TILE - 2, TILE, 2, frameCol);
    if (!top)  rect(X, Y, TILE, 2, frameCol);
    // decorations per quadrant
    if (part === 'tl') {
      rect(X + 6, Y + 8, 6, 2, '#e4eef7');
      rect(X + 7, Y + 7, 4, 1, '#e4eef7');
    } else if (part === 'tr') {
      rect(X + 4, Y + 6, 4, 4, '#f8e4a0');
      rect(X + 3, Y + 7, 1, 2, '#f8e4a0');
      rect(X + 8, Y + 7, 1, 2, '#f8e4a0');
    } else {
      // distant hills
      rect(px0, py0 + ph - 6, pw, 4, '#7a9a6a');
      rect(px0, py0 + ph - 3, pw, 1, '#5c7a4f');
      if (part === 'bl') rect(X + 6, Y + 8, 8, 3, '#6a8e5c');
      if (part === 'br') rect(X + 2, Y + 9, 10, 3, '#6a8e5c');
    }
  }

  // ---------- draw dispatch ----------
  function drawCell(code, X, Y, gx, gy) {
    switch (code) {
      case VOID:  drawVoid(X, Y); return;
      case STONE: drawStone(X, Y, gx, gy); return;
      case PAPER: drawPaper(X, Y, gx, gy); return;
      case WOOD:  drawWood(X, Y, gx); return;
      case BEAM:  drawBeam(X, Y, gx); return;
      case BED_A: drawBedTop(X, Y, 'pillow'); return;
      case BED_B: drawBedTop(X, Y, 'mattress'); return;
      case BED_C: drawBedTop(X, Y, 'foot'); return;
      case BED_D: drawBedBot(X, Y, 'legL'); return;
      case BED_E: drawBedBot(X, Y, 'frame'); return;
      case BED_F: drawBedBot(X, Y, 'legR'); return;
      case BK_G:  drawShelfCell(X, Y, 0, gx, gy); return;
      case BK_H:  drawShelfCell(X, Y, 1, gx, gy); return;
      case BK_I:  drawShelfCell(X, Y, 2, gx, gy); return;
      case BK_J:  drawShelfCell(X, Y, 3, gx, gy); return;
      case T_K:   drawChairTop(X, Y, 'L'); return;
      case T_L:   drawTableTop(X, Y, 'L'); return;
      case T_M:   drawTableTop(X, Y, 'R'); return;
      case T_N:   drawChairTop(X, Y, 'R'); return;
      case T_O:   drawChairBot(X, Y, 'L'); return;
      case T_P:   drawTableBot(X, Y, 'L'); return;
      case T_Q:   drawTableBot(X, Y, 'R'); return;
      case T_R:   drawChairBot(X, Y, 'R'); return;
      case PL_S:  drawPlantTop(X, Y); return;
      case PL_T:  drawPlantBot(X, Y); return;
      case PC_U:  drawPicCell(X, Y, 'tl'); return;
      case PC_V:  drawPicCell(X, Y, 'tr'); return;
      case PC_W:  drawPicCell(X, Y, 'bl'); return;
      case PC_X:  drawPicCell(X, Y, 'br'); return;
      case LM_Y:  drawLampCord(X, Y); return;
      case LM_Z:  drawLampShade(X, Y); return;
      case FP_1:  drawFPMantel(X, Y, 'L', gx); return;
      case FP_2:  drawFPMantel(X, Y, 'M', gx); return;
      case FP_3:  drawFPMantel(X, Y, 'R', gx); return;
      case FP_4:  drawFPFire(X, Y, 'L'); return;
      case FP_5:  drawFPFire(X, Y, 'M'); return;
      case FP_6:  drawFPFire(X, Y, 'R'); return;
      case FP_7:  drawFPHearth(X, Y, 'L'); return;
      case FP_8:  drawFPHearth(X, Y, 'M'); return;
      case FP_9:  drawFPHearth(X, Y, 'R'); return;
      case CLK_0: drawClock(X, Y); return;
      case WN_EX: drawWindow(X, Y, 'tl'); return;
      case WN_HA: drawWindow(X, Y, 'tr'); return;
      case WN_DO: drawWindow(X, Y, 'bl'); return;
      case WN_PC: drawWindow(X, Y, 'br'); return;
      default:    rect(X, Y, TILE, TILE, '#ff00ff'); return;
    }
  }

  function currentStage() {
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (r.firesLeft <= 0) continue;
      for (let vi = 0; vi < r.variants.length; vi++) {
        if (findAllMatches(grid, GRID_W, GRID_H, r.variants[vi].p).length > 0) return r.label;
      }
    }
    return 'done';
  }

  function render() {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const c = grid[y * GRID_W + x];
        drawCell(c, x * TILE, y * TILE, x, y);
      }
    }

    const label = phase === 'done' ? 'done' : currentStage();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 8, 150, 22);
    ctx.fillStyle = '#ffd77a';
    ctx.font = '12px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('placing: ' + label, 16, 19);

    if (phase === 'done' && doneFlashT > 0) {
      const a = Math.min(1, doneFlashT) * 0.22;
      ctx.fillStyle = 'rgba(255,215,122,' + a.toFixed(3) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ---------- update loop ----------
  function update(dt) {
    if (phase === 'running') {
      rewritesBuffer += state.speed * dt;
      let safety = 256;
      while (rewritesBuffer >= 1 && safety-- > 0) {
        rewritesBuffer -= 1;
        const ri = stepRules(grid, GRID_W, GRID_H, rules);
        if (ri >= 0) {
          lastRuleFired = ri;
        } else {
          phase = 'done';
          doneFlashT = 1;
          rewritesBuffer = 0;
          break;
        }
      }
    } else if (phase === 'done') {
      doneFlashT = Math.max(0, doneFlashT - dt * 1.2);
    }
  }

  function loop() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (!state.paused) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ---------- lifecycle ----------
  function fitCanvas() {
    canvas.width = GRID_W * TILE;
    canvas.height = GRID_H * TILE;
  }

  function regenerate() {
    // Width is the only adjustable dimension; reallocate the grid on change.
    const newW = state.roomW | 0;
    if (newW !== GRID_W || grid.length !== newW * GRID_H) {
      GRID_W = newW;
      grid = new Uint8Array(GRID_W * GRID_H);
      fitCanvas();
    }
    rand = mulberry32(state.seed);
    pickPalette();
    rules = makeRules({ density: state.density, include: state.include });
    seedRoom();
    rewritesBuffer = 0;
    lastRuleFired = -1;
    phase = 'running';
    doneFlashT = 0;
  }

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

  function makeIncludeCheckbox(label, key) {
    const wrap = document.createElement('div'); wrap.className = 'control inline';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!state.include[key];
    const lab = document.createElement('label');
    lab.textContent = label;
    lab.prepend(input);
    input.addEventListener('change', () => {
      state.include[key] = input.checked;
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
      makeRange('speed',      'speed',   1, 60, 1, v => (v | 0) + '/s'),
      makeRange('room width', 'roomW',   16, 34, 1, v => (v | 0) + ' tiles', regenerate),
      makeRange('density',    'density', 0.25, 2.5, 0.05, v => v.toFixed(2) + 'x', regenerate),
      makeCheckbox('paused', 'paused'),
      makeIncludeCheckbox('fireplace',   'fireplace'),
      makeIncludeCheckbox('bookshelves', 'bookshelves'),
      makeIncludeCheckbox('bed',         'bed'),
      makeIncludeCheckbox('table',       'table'),
      makeIncludeCheckbox('window',      'window'),
    );
  }

  // ---------- boot ----------
  fitCanvas();
  buildControls();
  regenerate();
  requestAnimationFrame(loop);
})();
