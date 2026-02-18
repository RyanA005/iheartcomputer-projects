// gen.js

const W = 32;
const H = 32;
const C = 3;
const IMAGESIZE = W * H * C;
const LATENT = 512;
const SHOWN = 15;

let w1, b1, w2, b2;
let emojis = [];
let latent = new Float32Array(LATENT);
let pca;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const slidersDiv = document.getElementById("sliders");
const select = document.getElementById("emojiSelect");

// make canvas large
const SCALE = 12;
canvas.width = W * SCALE;
canvas.height = H * SCALE;

// offscreen buffer for 32x32 render
const smallCanvas = document.createElement("canvas");
smallCanvas.width = W;
smallCanvas.height = H;
const smallCtx = smallCanvas.getContext("2d");

function tanh(x) {
  return Math.tanh(x);
}

async function loadModel() {
  const res = await fetch("model.bin");
  const buf = await res.arrayBuffer();
  const f = new Float32Array(buf);

  let o = 0;

  const w1_size = IMAGESIZE * LATENT;
  const b1_size = LATENT;
  const w2_size = LATENT * IMAGESIZE;
  const b2_size = IMAGESIZE;

  const expected = w1_size + b1_size + w2_size + b2_size;

  if (f.length !== expected) {
    console.error("Model size mismatch!");
    console.error("model floats:", f.length);
    console.error("expected floats:", expected);
    return;
  }

  w1 = f.subarray(o, o + w1_size);
  o += w1_size;

  b1 = f.subarray(o, o + b1_size);
  o += b1_size;

  w2 = f.subarray(o, o + w2_size);
  o += w2_size;

  b2 = f.subarray(o, o + b2_size);

  console.log("model loaded");
}

async function loadEmojis() {
  const res = await fetch("emojis.bin");
  const buf = await res.arrayBuffer();
  const f = new Float32Array(buf);

  const count = Math.floor(f.length / IMAGESIZE);

  for (let i = 0; i < count; i++) {
    emojis.push(f.slice(i * IMAGESIZE, (i + 1) * IMAGESIZE));
  }

  for (let i = 0; i < emojis.length; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = "emoji " + i;
    select.appendChild(opt);
  }
}

async function loadPCA() {
  const res = await fetch("pca.bin");
  const buf = await res.arrayBuffer();
  pca = new Float32Array(buf);
}

function encode(input) {
  const out = new Float32Array(LATENT);

  for (let j = 0; j < LATENT; j++) {
    let sum = b1[j];
    for (let i = 0; i < IMAGESIZE; i++) {
      sum += input[i] * w1[i * LATENT + j];
    }
    out[j] = tanh(sum);
  }

  return out;
}

function decode(z) {
  const out = new Float32Array(IMAGESIZE);

  for (let i = 0; i < IMAGESIZE; i++) {
    let sum = b2[i];
    for (let j = 0; j < LATENT; j++) {
      sum += z[j] * w2[j * IMAGESIZE + i];
    }
    out[i] = 0.5 * (tanh(sum) + 1);
  }

  return out;
}

function draw(image) {
  const img = smallCtx.createImageData(W, H);

  for (let i = 0; i < W * H; i++) {
    img.data[i * 4 + 0] = Math.max(0, Math.min(255, image[i * 3 + 0] * 255));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, image[i * 3 + 1] * 255));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, image[i * 3 + 2] * 255));
    img.data[i * 4 + 3] = 255;
  }

  smallCtx.putImageData(img, 0, 0);

  // scale up
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(smallCanvas, 0, 0, canvas.width, canvas.height);
}

function updateImage() {
  const img = decode(latent);
  draw(img);
}

function buildSliders() {
  // make the container a 3-column grid
  slidersDiv.style.display = "grid";
  slidersDiv.style.gridTemplateColumns = "1fr 1fr 1fr";
  slidersDiv.style.gap = "8px";

  for (let j = 0; j < SHOWN; j++) {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";

    const label = document.createElement("label");
    label.textContent = "PCA" + j;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = -5;
    slider.max = 5;
    slider.step = 0.1;
    slider.value = 0;
    slider.style.width = "100%";

    slider.addEventListener("input", () => {
		const v = parseFloat(slider.value);
		const base = encode(emojis[select.value]);

		for (let k = 0; k < LATENT; k++) {
		  latent[k] = base[k];
		}

		for (let i = 0; i < SHOWN; i++) {
		  const sliderVal = parseFloat(
			slidersDiv.querySelectorAll("input")[i].value
		  );
		  const comp = pca.subarray(i * LATENT, (i + 1) * LATENT);

		  for (let k = 0; k < LATENT; k++) {
			const SCALE = 1.0;
			latent[k] += sliderVal * comp[k] * SCALE;
		  }
		}
      updateImage();
    });

    container.appendChild(label);
    container.appendChild(slider);
    slidersDiv.appendChild(container);
  }
}

function loadEmoji(index) {
  const img = emojis[index];
  const encoded = encode(img);

  // copy into global latent buffer
  latent.set(encoded);

  // update sliders
  const inputs = slidersDiv.querySelectorAll("input");
  for (let j = 0; j < SHOWN; j++) {
    inputs[j].value = latent[j];
  }

  updateImage();
}

select.addEventListener("change", () => {
  loadEmoji(parseInt(select.value));
});

async function init() {
  await loadModel();
  await loadEmojis();
  await loadPCA();
  buildSliders();
  loadEmoji(0);
}

init();
