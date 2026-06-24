const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('error-msg');
const countBadge = document.getElementById('count-badge');
const statusEl = document.getElementById('status');
const fpsDis = document.getElementById('fps-display');

// ── Warna per kelas objek ──
const classColors = {};
const palette = [
  '#00ffff', '#ff00ff', '#ffff00', '#00ff88',
  '#ff6600', '#ff0066', '#66ff00', '#0088ff'
];
let colorIdx = 0;

function getColor(cls) {
  if (!classColors[cls]) {
    classColors[cls] = palette[colorIdx % palette.length];
    colorIdx++;
  }
  return classColors[cls];
}

// ── FPS counter ──
let lastTime = performance.now();
let frameCount = 0;

function updateFPS() {
  frameCount++;
  const now = performance.now();
  const delta = now - lastTime;
  if (delta >= 1000) {
    const fps = Math.round(frameCount * 1000 / delta);
    frameCount = 0;
    lastTime = now;
    fpsDis.textContent = `${fps} FPS`;
  }
}

// ── Setup kamera ──
async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    return new Promise(resolve => (video.onloadedmetadata = resolve));
  } catch (e) {
    loading.style.display = 'none';
    errorMsg.style.display = 'flex';
    throw e;
  }
}

// ── Sesuaikan ukuran canvas dengan video ──
function resizeCanvas() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

// ── Gambar bounding box & label ──
function drawDetections(predictions) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  predictions.forEach(pred => {
    const [x, y, w, h] = pred.bbox;
    const color = getColor(pred.class);
    const conf = Math.round(pred.score * 100);
    const label = `${pred.class.toUpperCase()} ${conf}%`;

    // Kotak dengan glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;

    // Sudut aksen putih
    const cLen = 14;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y + cLen);         ctx.lineTo(x, y);         ctx.lineTo(x + cLen, y);         ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - cLen, y);     ctx.lineTo(x + w, y);     ctx.lineTo(x + w, y + cLen);     ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h - cLen);     ctx.lineTo(x, y + h);     ctx.lineTo(x + cLen, y + h);     ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - cLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cLen); ctx.stroke();

    // Background label
    ctx.font = 'bold 14px Courier New';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x, y - 24, tw + 12, 22);

    // Border label
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y - 24, tw + 12, 22);

    // Teks label
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillText(label, x + 6, y - 7);
    ctx.shadowBlur = 0;

    // Crosshair tengah
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

// ── Main ──
async function main() {
  await setupCamera();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  statusEl.textContent = 'MEMUAT MODEL...';

  let model;
  try {
    model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
  } catch (e) {
    statusEl.textContent = 'GAGAL MEMUAT MODEL';
    loading.style.display = 'none';
    return;
  }

  loading.style.display = 'none';
  statusEl.textContent = 'AKTIF · MENDETEKSI';

  async function detect() {
    resizeCanvas();
    const predictions = await model.detect(video);
    drawDetections(predictions);
    countBadge.textContent = `${predictions.length} OBJEK`;
    updateFPS();
    requestAnimationFrame(detect);
  }

  detect();
}

main();
  
