const initialCells = Array.from({ length: 25 }, () => ({ word: "待填写", short: "-", owner: "" }));
let cells = structuredClone(initialCells);
let mode = "edit";
let selectedCell = null;
let showWords = false;
const buzzerState = { blue: [false, false, false, false, false], red: [false, false, false, false, false] };

const board = document.querySelector("#hex-board");
const dialog = document.querySelector("#cell-dialog");
const wordInput = document.querySelector("#word-input");
const shortInput = document.querySelector("#short-input");
const copyImageButton = document.querySelector("#copy-image-button");

function renderBoard() {
  board.innerHTML = "";
  cells.forEach((cell, index) => {
    const row = Math.floor(index / 5);
    const column = index % 5;
    const blueAvailable = !buzzerState.blue[row];
    const redAvailable = !buzzerState.red[column];
    const button = document.createElement("button");
    button.className = `hex-cell ${cell.owner ? `claimed-${cell.owner}` : ""}`;
    if (showWords) button.classList.add("reveal-word");
    button.type = "button";
    const lights = cell.owner ? "" : `<span class="cell-lights" aria-label="抢答权"><i class="cell-light blue-light ${blueAvailable ? "" : "off"}"></i><i class="cell-light red-light ${redAvailable ? "" : "off"}"></i></span>`;
    const wordCls = `cell-word${cell.word.length >= 9 ? ' cell-word-small' : cell.word.length <= 3 ? ' cell-word-large' : ''}`;
    button.innerHTML = `<span class="cell-content"><span class="cell-short">${cell.short}</span><span class="${wordCls}">${cell.word}</span></span>${lights}`;
    button.addEventListener("click", () => handleCellClick(index));
    board.append(button);
  });
}

function handleCellClick(index) {
  if (mode === "edit") {
    selectedCell = index;
    wordInput.value = cells[index].word;
    shortInput.value = cells[index].short;
    dialog.showModal();
    return;
  }
  const next = { "": "red", red: "blue", blue: "" };
 cells[index].owner = next[cells[index].owner];
 renderBoard();
  saveState();
}

function renderBuzzers(team) {
  const container = document.querySelector(`#${team}-buzzers`);
  const labels = team === "blue" ? ["1行", "2行", "3行", "4行", "5行"] : ["1列", "2列", "3列", "4列", "5列"];
  container.innerHTML = "";
  labels.forEach((label, index) => {
    const button = document.createElement("button");
    button.className = `buzzer ${buzzerState[team][index] ? "used" : ""}`;
    button.textContent = label;
    button.type = "button";
    button.disabled = mode === "edit";
    button.addEventListener("click", () => {
      if (mode !== "play") return;
      buzzerState[team][index] = !buzzerState[team][index];
      renderBuzzers(team);
     renderBoard();
      saveState();
    });
    container.append(button);
  });
}

function setMode(nextMode) {
  mode = nextMode;
  if (mode === "play") showWords = false;
  document.body.classList.toggle("edit-mode", mode === "edit");
  document.body.classList.toggle("play-mode", mode === "play");
  document.querySelector("#toggle-word-btn").textContent = "查看词语";
  document.querySelectorAll(".mode-button").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
  renderBoard();
  renderBuzzers("blue");
  renderBuzzers("red");
}

document.querySelectorAll(".mode-button").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.querySelector("#cell-form").addEventListener("submit", event => {
  event.preventDefault();
  if (selectedCell === null) return;
  cells[selectedCell].word = wordInput.value.trim() || "待填写";
  cells[selectedCell].short = shortInput.value.trim().toUpperCase() || "-";
 dialog.close();
 renderBoard();
  saveState();
});
document.querySelector("#toggle-word-btn").addEventListener("click", () => {
  showWords = !showWords;
  document.querySelector("#toggle-word-btn").textContent = showWords ? "查看记号" : "查看词语";
  renderBoard();
});

document.querySelectorAll(".cancel-button, .icon-close").forEach(button => button.addEventListener("click", event => { event.preventDefault(); dialog.close(); }));
document.querySelector("#reset-button").addEventListener("click", () => {
  cells.forEach(cell => { cell.owner = ""; });
  buzzerState.blue.fill(false);
  buzzerState.red.fill(false);
  renderBoard();
  renderBuzzers("blue");
 renderBuzzers("red");
  saveState();
});

copyImageButton.addEventListener("click", async () => {
  if (!window.html2canvas || !navigator.clipboard?.write || !window.ClipboardItem) {
    copyImageButton.textContent = "当前浏览器不支持";
    setTimeout(() => { copyImageButton.textContent = "复制截图"; }, 1800);
    return;
  }

  copyImageButton.disabled = true;
  copyImageButton.textContent = "生成中…";
  const hiddenForCapture = [...document.querySelectorAll(".mode-switch, .utility-actions, .timer-bar")];
  const originalDisplays = hiddenForCapture.map(element => element.style.display);
  hiddenForCapture.forEach(element => { element.style.display = "none"; });
  copyImageButton.style.display = "none";

  const captureArea = document.querySelector("#capture-area");
  const origCapturePad = captureArea.style.padding;
  const origCaptureOverflow = captureArea.style.overflow;
  captureArea.style.padding = "16px";
  captureArea.style.overflow = "visible";

  /* ── 将 <input> 换成同等样式的 <span>，解决 html2canvas 渲染 input 文字削顶问题 ── */
  const allInputs = captureArea.querySelectorAll("input");
  const inputSwaps = [];
  allInputs.forEach(input => {
    const span = document.createElement("span");
    span.textContent = input.value || input.placeholder || "";
    const cs = getComputedStyle(input);
    for (const p of ["fontFamily","fontSize","fontWeight","fontStyle","color",
                     "lineHeight","textAlign","letterSpacing",
                     "padding","paddingTop","paddingRight","paddingBottom","paddingLeft",
                     "borderBottom","borderBottomWidth","borderBottomStyle","borderBottomColor",
                     "background","backgroundColor","width","boxSizing","minWidth","margin",
                     "display"]) {
      const v = cs[p];
      if (v && v !== "none" && v !== "normal" || p === "fontWeight") span.style[p] = v;
    }
    span.style.display = "inline-block";
    span.style.border = "none";
    span.style.boxShadow = "none";
    span.style.outline = "none";
    input.parentNode.replaceChild(span, input);
    inputSwaps.push({ input, span });
  });

  const colorEls = captureArea.querySelectorAll(
    ".blue-card .team-heading, .red-card .team-heading, " +
    ".hex-cell.claimed-blue, .hex-cell.claimed-red, " +
    ".edge-north, .edge-south, .edge-west, .edge-east, " +
    ".blue-light, .red-light"
  );
  const origColors = [...colorEls].map(el => el.style.backgroundColor);

  const RED = "#c84239", BLUE = "#1769ae";
  colorEls.forEach(el => {
    if (el.classList.contains("off")) { el.style.backgroundColor = "transparent"; return; }
    const isBlue = el.matches(".claimed-blue, .edge-north, .edge-south, .blue-light") ||
                   el.closest(".blue-card");
    el.style.backgroundColor = isBlue ? BLUE : RED;
  });

  try {
    const canvas = await window.html2canvas(document.querySelector("#capture-area"), {
      backgroundColor: "#f5f4ef",
      scale: 2,
      useCORS: true
    });
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("无法生成图片");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    copyImageButton.textContent = "已复制";
    copyImageButton.classList.add("copied");
  } catch (error) {
    copyImageButton.textContent = "复制失败";
  } finally {
    captureArea.style.overflow = origCaptureOverflow;
    captureArea.style.padding = origCapturePad;
    inputSwaps.forEach(({ input, span }) => {
      if (span.parentNode) span.parentNode.replaceChild(input, span);
    });
    colorEls.forEach((el, i) => el.style.backgroundColor = origColors[i]);
    hiddenForCapture.forEach((element, index) => { element.style.display = originalDisplays[index]; });
    copyImageButton.style.display = "";
    copyImageButton.disabled = false;
    setTimeout(() => {
      copyImageButton.textContent = "复制截图";
      copyImageButton.classList.remove("copied");
    }, 1800);
  }
});

/* ── 词库 CSV 导入/导出 ── */
function parseCSVLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = false; }
      } else { cur += c; }
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ",") { result.push(cur); cur = ""; }
      else { cur += c; }
    }
  }
  result.push(cur);
  return result;
}

function exportCSV() {
  const rows = ["行,列,词语,缩写"];
  cells.forEach((cell, i) => {
    const r = Math.floor(i / 5) + 1, c = (i % 5) + 1;
    const esc = v => (v.includes(",") || v.includes('"')) ? '"' + v.replace(/"/g, '""') + '"' : v;
    rows.push(`${r},${c},${esc(cell.word)},${esc(cell.short)}`);
  });
  const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  const now = new Date();
  const ymd = now.getFullYear() + String(now.getMonth()+1).padStart(2,"0") + String(now.getDate()).padStart(2,"0");
  const hms = String(now.getHours()).padStart(2,"0") + String(now.getMinutes()).padStart(2,"0");
  a.href = url; a.download = "wordlist-" + ymd + hms + ".csv";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importCSV(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split("\n").filter(l => l.trim());
    for (let i = 1; i < lines.length; i++) {
      const p = parseCSVLine(lines[i]);
      if (p.length < 4) continue;
      const r = parseInt(p[0]) - 1, cl = parseInt(p[1]) - 1;
      if (r < 0 || r > 4 || cl < 0 || cl > 4) continue;
      cells[r * 5 + cl].word = p[2].trim() || "待填写";
      cells[r * 5 + cl].short = p[3].trim().toUpperCase() || "-";
    }
   renderBoard();
    saveState();
  };
  reader.readAsText(file);
}

document.querySelector("#export-csv-button").addEventListener("click", exportCSV);
document.querySelector("#import-csv-button").addEventListener("click", () =>
  document.querySelector("#import-csv-input").click());
document.querySelector("#import-csv-input").addEventListener("change", e => {
  if (e.target.files.length) importCSV(e.target.files[0]);
  e.target.value = "";
});

/* ── localStorage 持久化 ── */
function saveState() {
  const bi = document.querySelectorAll(".blue-card .team-input");
  const ri = document.querySelectorAll(".red-card .team-input");
  const state = {
    cells, buzzerState,
    blueDesc: bi[0]?.value || "", blueGuess: bi[1]?.value || "",
    redDesc: ri[0]?.value || "", redGuess: ri[1]?.value || "",
    host: document.querySelector(".match-host input")?.value || "",
    matchTitle: document.querySelector(".match-title-line input")?.value || ""
  };
  try { localStorage.setItem("wordhex_state", JSON.stringify(state)); } catch (e) {}
}

function restoreState() {
  try {
    const raw = localStorage.getItem("wordhex_state");
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state.cells) cells = state.cells;
    if (state.buzzerState) Object.assign(buzzerState, state.buzzerState);
    const bi = document.querySelectorAll(".blue-card .team-input");
    const ri = document.querySelectorAll(".red-card .team-input");
    if (bi[0]) bi[0].value = state.blueDesc || "";
    if (bi[1]) bi[1].value = state.blueGuess || "";
    if (ri[0]) ri[0].value = state.redDesc || "";
    if (ri[1]) ri[1].value = state.redGuess || "";
    const hi = document.querySelector(".match-host input");
    const ti = document.querySelector(".match-title-line input");
    if (hi) hi.value = state.host || "";
    if (ti) ti.value = state.matchTitle || "";
  } catch (e) {}
}

document.querySelectorAll(".team-input, .match-host input, .match-title-line input")
  .forEach(el => el.addEventListener("input", saveState));

document.querySelector("#reset-all-button").addEventListener("click", () => {
  cells = structuredClone(initialCells);
  buzzerState.blue.fill(false);
  buzzerState.red.fill(false);
  document.querySelectorAll(".team-input, .match-host input, .match-title-line input").forEach(el => el.value = "");
  localStorage.removeItem("wordhex_state");
  renderBoard();
  renderBuzzers("blue");
  renderBuzzers("red");
});

/* ── 倒计时 ── */
let timerRemaining = 60, timerDuration = 60, timerRunning = false, timerInterval = null;

function updateTimer() {
  const d = document.querySelector("#timer-digits");
  const m = Math.floor(timerRemaining / 60), s = timerRemaining % 60;
  d.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  if (timerRemaining === 0) { d.classList.add("timer-warning"); d.classList.remove("timer-flash"); return; }
  const thresh = timerDuration === 60 ? 10 : 5;
  const warn = timerRunning && timerRemaining <= thresh;
  d.classList.toggle("timer-warning", warn);
  d.classList.toggle("timer-flash", warn);
}

function startTimer(duration) {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerDuration = duration;
  timerRemaining = duration;
  timerRunning = true;
  document.querySelectorAll(".timer-seg[data-duration]").forEach(b =>
    b.classList.toggle("active", parseInt(b.dataset.duration) === duration));
  const digits = document.querySelector("#timer-digits");
  digits.classList.remove("timer-warning", "timer-flash");
  updateTimer();
  timerInterval = setInterval(() => {
    if (timerRemaining <= 0) { clearInterval(timerInterval); timerInterval = null; timerRunning = false; return; }
    timerRemaining--;
    if (timerDuration === 60 && timerRemaining === 30)
      document.querySelector(".timer-bar").classList.add("timer-midflash");
      setTimeout(() => document.querySelector(".timer-bar")?.classList.remove("timer-midflash"), 100);
    if (timerRemaining === 0) { timerRunning = false; clearInterval(timerInterval); timerInterval = null; }
    updateTimer();
  }, 1000);
}

function resetTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerRunning = false;
  timerRemaining = timerDuration;
  document.querySelector("#timer-digits").classList.remove("timer-warning", "timer-flash");
  document.querySelector(".timer-bar")?.classList.remove("timer-midflash");
  document.querySelectorAll(".timer-seg[data-duration]").forEach(b => b.classList.remove("active"));
  updateTimer();
}

document.querySelectorAll(".timer-seg[data-duration]").forEach(b =>
  b.addEventListener("click", () => startTimer(parseInt(b.dataset.duration))));
document.querySelector("#timer-reset").addEventListener("click", resetTimer);

restoreState();
setMode("edit");
