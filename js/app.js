/* Panel IA — dashboard personal estático. Sin frameworks, sin backend:
   todo el estado del usuario vive en localStorage. */
"use strict";

const $ = (id) => document.getElementById(id);
const store = {
  get(k, fallback) {
    try { const v = localStorage.getItem("panelia:" + k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(k, v) { localStorage.setItem("panelia:" + k, JSON.stringify(v)); },
};

/* ===================== Reloj y calendario ===================== */
function tickClock() {
  const now = new Date();
  $("clock-time").textContent = now.toLocaleTimeString("es-PE", { hour12: false });
  $("clock-date").textContent = now.toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function renderCalendar() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1);
  const start = (first.getDay() + 6) % 7; // lunes = 0
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
  ctx2.fillStyle = "#000";
  ctx2.fillRect(0, 0, W, H);
  if (music.mode === 0) {
    // Barras estilo Winamp: verde → amarillo → rojo con picos
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
    ctx2.strokeStyle = "#58a6ff";
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

function esc(s) {
  return (s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
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
