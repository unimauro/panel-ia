/* Panel IA — dashboard personal estático con cielo vivo.
   Sin frameworks ni backend: el estado del usuario vive en localStorage. */
"use strict";

const $ = (id) => document.getElementById(id);
const reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const store = {
  get(k, fallback) {
    try { const v = localStorage.getItem("panelia:" + k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(k, v) { localStorage.setItem("panelia:" + k, JSON.stringify(v)); },
};

/* ===================== Cielo vivo ===================== */
/* Paleta por hora: [hora, cieloAlto, cieloMedio, horizonte, acento].
   Entre puntos se interpola, así el cambio es continuo a lo largo del día. */
const SKY = [
  [0,    "#050714", "#0b1026", "#141a3a", "#8aa8ff"],
  [4.5,  "#0a0f2e", "#181c48", "#3a2650", "#a98cff"],
  [6,    "#16224e", "#45397a", "#d06a45", "#ffb36b"],
  [7.5,  "#173a66", "#2b5a96", "#8fb8d9", "#7cc3ff"],
  [12,   "#1d4472", "#2f6bb0", "#8cc6e8", "#66c6ff"],
  [16.5, "#28406e", "#4f5a9a", "#c98a5a", "#ffb36b"],
  [18.5, "#20204f", "#463069", "#c25a4a", "#ff9e7a"],
  [20,   "#0c1030", "#161a44", "#2a2258", "#a98cff"],
  [22,   "#060816", "#0c1128", "#161c3e", "#8aa8ff"],
  [24,   "#050714", "#0b1026", "#141a3a", "#8aa8ff"],
];

function hexLerp(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function skyUpdate() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  let i = 0;
  while (SKY[i + 1][0] < h) i++;
  const [h0, ...c0] = SKY[i], [h1, ...c1] = SKY[i + 1];
  const t = (h - h0) / (h1 - h0);
  const [top, mid, low, accent] = c0.map((c, j) => hexLerp(c, c1[j], t));
  const R = document.documentElement.style;
  R.setProperty("--sky-top", top);
  R.setProperty("--sky-mid", mid);
  R.setProperty("--sky-low", low);
  R.setProperty("--accent", accent);
  const [ar, ag, ab] = [1, 3, 5].map((k) => parseInt(accent.slice(k, k + 2), 16));
  R.setProperty("--glow", `rgba(${ar},${ag},${ab},0.35)`);

  // Sol (6–18 h) o luna (resto) recorriendo un arco por el cielo
  const isDay = h >= 6 && h < 18.5;
  const p = isDay ? (h - 6) / 12.5 : ((h + 24 - 18.5) % 24) / 11.5;
  const sun = $("sun");
  sun.style.left = 8 + p * 84 + "%";
  sun.style.top = 62 - Math.sin(p * Math.PI) * 48 + "%";
  sun.style.opacity = isDay ? 1 : 0.55;

  // Saludo según franja horaria
  $("greeting").textContent =
    h < 5 ? "Madrugada productiva" :
    h < 12 ? "Buenos días" :
    h < 19 ? "Buenas tardes" : "Buenas noches";

  starsDraw(h);
}

/* Estrellas: solo de noche, con parpadeo suave */
const starsState = { list: [], night: 0 };
function starsInit() {
  const c = $("stars");
  c.width = innerWidth; c.height = innerHeight;
  starsState.list = Array.from({ length: 130 }, () => ({
    x: Math.random(), y: Math.random() * 0.8,
    r: Math.random() * 1.4 + 0.4, tw: Math.random() * Math.PI * 2,
  }));
}
function starsDraw(h) {
  // visibles de 19 a 6, con transición de una hora en cada borde
  starsState.night = h < 5 ? 1 : h < 6.5 ? (6.5 - h) / 1.5 : h < 18.5 ? 0 : h < 20 ? (h - 18.5) / 1.5 : 1;
  const c = $("stars"), x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  if (starsState.night <= 0) return;
  const t = Date.now() / 900;
  for (const s of starsState.list) {
    const a = starsState.night * (reducedMotion ? 0.8 : 0.45 + 0.55 * Math.abs(Math.sin(t + s.tw)));
    x.globalAlpha = a;
    x.fillStyle = "#dfe6ff";
    x.beginPath();
    x.arc(s.x * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
}
starsInit();
addEventListener("resize", starsInit);
if (!reducedMotion) setInterval(() => starsDraw((new Date().getHours()) + new Date().getMinutes() / 60), 150);

/* ===================== Clima (Open-Meteo, sin API key) ===================== */
const WMO = {
  0: ["☀️", "despejado"], 1: ["🌤️", "casi despejado"], 2: ["⛅", "parcialmente nublado"],
  3: ["☁️", "nublado"], 45: ["🌫️", "niebla"], 48: ["🌫️", "niebla"],
  51: ["🌦️", "llovizna"], 53: ["🌦️", "llovizna"], 55: ["🌦️", "llovizna"],
  61: ["🌧️", "lluvia"], 63: ["🌧️", "lluvia"], 65: ["🌧️", "lluvia fuerte"],
  71: ["❄️", "nieve"], 73: ["❄️", "nieve"], 75: ["❄️", "nieve"],
  80: ["🌧️", "chubascos"], 81: ["🌧️", "chubascos"], 82: ["⛈️", "chubascos fuertes"],
  95: ["⛈️", "tormenta"], 96: ["⛈️", "tormenta"], 99: ["⛈️", "tormenta"],
};

function weatherLoad(lat, lon) {
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`)
    .then((r) => r.json())
    .then((d) => {
      const cur = d.current;
      const [icon, desc] = WMO[cur.weather_code] || ["🌡️", ""];
      const night = (() => { const h = new Date().getHours(); return h < 6 || h >= 19; })();
      $("w-icon").textContent = night && cur.weather_code <= 1 ? "🌙" : icon;
      $("w-temp").textContent = Math.round(cur.temperature_2m) + "°C";
      $("w-desc").textContent = desc;
      $("weather").hidden = false;
    })
    .catch(() => { /* sin clima no pasa nada, el panel sigue */ });
}
// Intenta ubicación real; si no hay permiso en 4 s, usa Lima
{
  let done = false;
  const fallback = setTimeout(() => { if (!done) { done = true; weatherLoad(-12.05, -77.04); } }, 4000);
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (!done) { done = true; clearTimeout(fallback); weatherLoad(pos.coords.latitude, pos.coords.longitude); } },
      () => { if (!done) { done = true; clearTimeout(fallback); weatherLoad(-12.05, -77.04); } },
      { timeout: 3500 }
    );
  }
}

/* ===================== Reloj y calendario ===================== */
function tickClock() {
  const now = new Date();
  const [hh, mm, ss] = now.toLocaleTimeString("es-PE", { hour12: false }).split(":");
  $("clock-time").innerHTML = `${hh}<span class="colon">:</span>${mm}<span class="colon">:</span>${ss}`;
  $("clock-date").textContent = now.toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function renderCalendar() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  $("cal-month").textContent = now.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  const start = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
  const daysIn = new Date(y, m + 1, 0).getDate();
  const daysPrev = new Date(y, m, 0).getDate();
  let html = ["L", "M", "X", "J", "V", "S", "D"].map((d) => `<div class="dow">${d}</div>`).join("");
  for (let i = 0; i < 42; i++) {
    const day = i - start + 1;
    if (day < 1) html += `<div class="day out">${daysPrev + day}</div>`;
    else if (day > daysIn) {
      if (i % 7 === 0) break; // no pintar una fila entera de relleno
      html += `<div class="day out">${day - daysIn}</div>`;
    } else html += `<div class="day${day === now.getDate() ? " today" : ""}">${day}</div>`;
  }
  $("cal").innerHTML = html;
}

tickClock();
setInterval(tickClock, 1000);
renderCalendar();
skyUpdate();
setInterval(skyUpdate, 60000);

/* ===================== Pomodoro ===================== */
const pomo = {
  cfg: store.get("pomo", { focus: 25, break: 5 }),
  phase: "focus",
  remaining: 0,
  timer: null,
  running: false,
};
pomo.remaining = pomo.cfg.focus * 60;
$("pomo-focus").value = pomo.cfg.focus;
$("pomo-break").value = pomo.cfg.break;

function pomoRender() {
  const mm = String(Math.floor(pomo.remaining / 60)).padStart(2, "0");
  const ss = String(pomo.remaining % 60).padStart(2, "0");
  const t = `${mm}:${ss}`;
  $("pomo-time").textContent = t;
  $("focus-time").textContent = t;
  const label = pomo.phase === "focus" ? "Focus" : "Descanso";
  $("pomo-phase").textContent = label;
  $("focus-phase").textContent = label;
  $("pomo-phase").classList.toggle("break", pomo.phase !== "focus");
  document.title = pomo.running ? `${t} · Panel IA` : "Panel IA — dashboard personal";
}

function pomoBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; gain.gain.value = 0.15;
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch { /* sin audio disponible */ }
}

function pomoTick() {
  pomo.remaining--;
  if (pomo.remaining <= 0) {
    pomoBeep();
    pomo.phase = pomo.phase === "focus" ? "break" : "focus";
    pomo.remaining = (pomo.phase === "focus" ? pomo.cfg.focus : pomo.cfg.break) * 60;
  }
  pomoRender();
}

$("pomo-start").addEventListener("click", () => {
  pomo.running = !pomo.running;
  if (pomo.running) {
    pomo.timer = setInterval(pomoTick, 1000);
    $("pomo-start").textContent = "⏸ Pausar";
  } else {
    clearInterval(pomo.timer);
    $("pomo-start").textContent = "▶ Iniciar";
  }
  pomoRender();
});

$("pomo-reset").addEventListener("click", () => {
  clearInterval(pomo.timer);
  pomo.running = false;
  pomo.phase = "focus";
  pomo.remaining = pomo.cfg.focus * 60;
  $("pomo-start").textContent = "▶ Iniciar";
  pomoRender();
});

for (const id of ["pomo-focus", "pomo-break"]) {
  $(id).addEventListener("change", () => {
    pomo.cfg.focus = Math.max(1, +$("pomo-focus").value || 25);
    pomo.cfg.break = Math.max(1, +$("pomo-break").value || 5);
    store.set("pomo", pomo.cfg);
    if (!pomo.running) {
      pomo.remaining = (pomo.phase === "focus" ? pomo.cfg.focus : pomo.cfg.break) * 60;
      pomoRender();
    }
  });
}

$("pomo-full").addEventListener("click", () => {
  $("focus-overlay").hidden = false;
  if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
});
$("focus-exit").addEventListener("click", () => {
  $("focus-overlay").hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
});
pomoRender();

/* ===================== Música ===================== */
const music = {
  audio: new Audio(),
  files: [],
  index: -1,
  repeat: false,
  mode: store.get("vizmode", 0), // 0 = barras (Winamp), 1 = onda (WMP)
  actx: null, analyser: null,
};

function musicLoad(i) {
  if (!music.files.length) return;
  music.index = (i + music.files.length) % music.files.length;
  const f = music.files[music.index];
  music.audio.src = URL.createObjectURL(f);
  $("music-track").textContent = f.name.replace(/\.[^.]+$/, "");
  musicRenderList();
  musicPlay();
}

function musicPlay() {
  if (!music.actx) {
    music.actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = music.actx.createMediaElementSource(music.audio);
    music.analyser = music.actx.createAnalyser();
    music.analyser.fftSize = 256;
    src.connect(music.analyser);
    music.analyser.connect(music.actx.destination);
    drawViz();
  }
  music.actx.resume();
  music.audio.play();
  $("m-play").textContent = "⏸";
}

$("m-files").addEventListener("change", (e) => {
  music.files = [...e.target.files];
  if (music.files.length) musicLoad(0);
});
$("m-play").addEventListener("click", () => {
  if (music.index < 0) return;
  if (music.audio.paused) musicPlay();
  else { music.audio.pause(); $("m-play").textContent = "▶"; }
});
$("m-prev").addEventListener("click", () => musicLoad(music.index - 1));
$("m-next").addEventListener("click", () => musicLoad(music.index + 1));
$("m-repeat").addEventListener("click", () => {
  music.repeat = !music.repeat;
  $("m-repeat").classList.toggle("on", music.repeat);
});
$("m-viz").addEventListener("click", () => {
  music.mode = (music.mode + 1) % 2;
  store.set("vizmode", music.mode);
});
music.audio.addEventListener("ended", () => {
  if (music.repeat) { music.audio.currentTime = 0; music.audio.play(); }
  else musicLoad(music.index + 1);
});

function musicRenderList() {
  $("playlist").innerHTML = music.files
    .map((f, i) => `<li class="${i === music.index ? "current" : ""}" data-i="${i}">${i === music.index ? "▶ " : ""}${f.name}</li>`)
    .join("");
}
$("playlist").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-i]");
  if (li) musicLoad(+li.dataset.i);
});

function drawViz() {
  const canvas = $("viz"), ctx2 = canvas.getContext("2d");
  canvas.width = canvas.clientWidth;
  const W = canvas.width, H = canvas.height;
  const data = new Uint8Array(music.analyser.frequencyBinCount);
  ctx2.clearRect(0, 0, W, H);
  if (music.mode === 0) {
    // Barras estilo Winamp: verde → amarillo → rojo
    music.analyser.getByteFrequencyData(data);
    const bars = 48, step = Math.floor(data.length / bars), bw = W / bars;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const h = v * H;
      const grad = ctx2.createLinearGradient(0, H, 0, H - h);
      grad.addColorStop(0, "#00e800");
      grad.addColorStop(0.7, "#e8e800");
      grad.addColorStop(1, "#e80000");
      ctx2.fillStyle = grad;
      ctx2.fillRect(i * bw + 1, H - h, bw - 2, h);
    }
  } else {
    // Onda estilo Windows Media Player
    music.analyser.getByteTimeDomainData(data);
    ctx2.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8aa8ff";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * W;
      const y = (data[i] / 255) * H;
      i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
    }
    ctx2.stroke();
  }
  requestAnimationFrame(drawViz);
}

/* ===================== Noticias IA ===================== */
let newsItems = [];
let newsFilter = "all";

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `hace ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function renderNews() {
  const items = newsItems.filter((n) => newsFilter === "all" || n.lang === newsFilter);
  $("news-list").innerHTML = items.length
    ? items.map((n) => `<li><span class="src">${n.source}</span>
        <a href="${n.url}" target="_blank" rel="noopener">${n.title}</a>
        <span class="ago">${timeAgo(n.published)}</span></li>`).join("")
    : '<li class="muted">Sin noticias en este filtro.</li>';
}

fetch("data/news.json")
  .then((r) => r.json())
  .then((d) => {
    newsItems = d.items || [];
    $("news-updated").textContent = `· actualizado ${timeAgo(d.updated)}`;
    renderNews();
  })
  .catch(() => { $("news-list").innerHTML = '<li class="muted">No se pudo cargar data/news.json</li>'; });

$("news-chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  newsFilter = chip.dataset.f;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderNews();
});

/* ===================== Kanban ===================== */
/* Edición 100% inline: el formulario se expande dentro de la tarjeta. */
const COLS = [
  { id: "todo", name: "Por hacer" },
  { id: "doing", name: "En curso" },
  { id: "done", name: "Hecho" },
];
let board = store.get("kanban", { cards: [] });
let editing = null; // id de tarjeta en edición, o "new:<col>"

function kanbanSave() { store.set("kanban", board); }

function esc(s) {
  return (s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function kformHTML(card, col) {
  const c = card || { title: "", desc: "", dod: "" };
  return `<div class="kform">
    <input class="kf-title" placeholder="Título" value="${esc(c.title)}">
    <textarea class="kf-desc" placeholder="Descripción">${esc(c.desc)}</textarea>
    <textarea class="kf-dod" placeholder="Definition of Done">${esc(c.dod)}</textarea>
    <div class="row">
      <button class="btn small primary kf-save" data-col="${col}" data-id="${card ? card.id : ""}">✓ Guardar</button>
      <button class="btn small kf-cancel">✕ Cancelar</button>
      ${card ? `<button class="btn small danger kf-del" data-id="${card.id}">🗑</button>` : ""}
    </div>
  </div>`;
}

function renderKanban() {
  $("kanban").innerHTML = COLS.map((col, ci) => {
    const cards = board.cards.filter((c) => c.col === col.id);
    return `<div class="kcol" data-col="${col.id}">
      <h3>${col.name} <span>${cards.length}</span></h3>
      ${cards.map((c) => editing === c.id ? `<div class="kcard">${kformHTML(c, col.id)}</div>` : `
        <div class="kcard" data-id="${c.id}">
          <div class="kcard-title" data-edit="${c.id}">${esc(c.title)}</div>
          ${c.desc ? `<div class="kcard-desc">${esc(c.desc)}</div>` : ""}
          ${c.dod ? `<div class="kcard-dod">${esc(c.dod)}</div>` : ""}
          <div class="kcard-actions">
            ${ci > 0 ? `<button class="btn small kmove" data-id="${c.id}" data-dir="-1">◀</button>` : ""}
            ${ci < COLS.length - 1 ? `<button class="btn small kmove" data-id="${c.id}" data-dir="1">▶</button>` : ""}
            <button class="btn small" data-edit="${c.id}">✏️</button>
          </div>
        </div>`).join("")}
      ${editing === "new:" + col.id
        ? `<div class="kcard">${kformHTML(null, col.id)}</div>`
        : `<button class="btn small kadd" data-col="${col.id}">＋ Añadir tarjeta</button>`}
    </div>`;
  }).join("");
}

$("kanban").addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest(".kadd")) { editing = "new:" + t.closest(".kadd").dataset.col; renderKanban(); return; }
  if (t.dataset.edit) { editing = t.dataset.edit; renderKanban(); return; }
  if (t.closest(".kf-cancel")) { editing = null; renderKanban(); return; }
  const del = t.closest(".kf-del");
  if (del) {
    board.cards = board.cards.filter((c) => c.id !== del.dataset.id);
    editing = null; kanbanSave(); renderKanban(); return;
  }
  const save = t.closest(".kf-save");
  if (save) {
    const form = save.closest(".kform");
    const data = {
      title: form.querySelector(".kf-title").value.trim(),
      desc: form.querySelector(".kf-desc").value.trim(),
      dod: form.querySelector(".kf-dod").value.trim(),
    };
    if (!data.title) return;
    if (save.dataset.id) {
      Object.assign(board.cards.find((c) => c.id === save.dataset.id), data);
    } else {
      board.cards.push({ id: "c" + Date.now(), col: save.dataset.col, ...data });
    }
    editing = null; kanbanSave(); renderKanban(); return;
  }
  const mv = t.closest(".kmove");
  if (mv) {
    const card = board.cards.find((c) => c.id === mv.dataset.id);
    const idx = COLS.findIndex((c) => c.id === card.col) + Number(mv.dataset.dir);
    card.col = COLS[Math.min(COLS.length - 1, Math.max(0, idx))].id;
    kanbanSave(); renderKanban();
  }
});

renderKanban();
