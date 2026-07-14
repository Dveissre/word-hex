const initialCells = Array.from({ length: 25 }, () => ({ word: "待填写", short: "D3", owner: "" }));
let cells = structuredClone(initialCells);
let mode = "edit";
let selectedCell = null;
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
    button.type = "button";
    button.innerHTML = `<span class="cell-content"><span class="cell-short">${cell.short}</span><span class="cell-word">${cell.word}</span></span><span class="cell-lights" aria-label="抢答权"><i class="cell-light blue-light ${blueAvailable ? "" : "off"}"></i><i class="cell-light red-light ${redAvailable ? "" : "off"}"></i></span>`;
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
    });
    container.append(button);
  });
}

function setMode(nextMode) {
  mode = nextMode;
  document.body.classList.toggle("edit-mode", mode === "edit");
  document.body.classList.toggle("play-mode", mode === "play");
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
  cells[selectedCell].short = shortInput.value.trim().toUpperCase() || "D3";
  dialog.close();
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
});

copyImageButton.addEventListener("click", async () => {
  if (!window.html2canvas || !navigator.clipboard?.write || !window.ClipboardItem) {
    copyImageButton.textContent = "当前浏览器不支持";
    setTimeout(() => { copyImageButton.textContent = "复制截图"; }, 1800);
    return;
  }

  copyImageButton.disabled = true;
  copyImageButton.textContent = "生成中…";
  const hiddenForCapture = [...document.querySelectorAll(".mode-switch, .utility-actions")];
  const originalDisplays = hiddenForCapture.map(element => element.style.display);
  hiddenForCapture.forEach(element => { element.style.display = "none"; });
  copyImageButton.style.display = "none";

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
      cells[r * 5 + cl].short = p[3].trim().toUpperCase() || "D3";
    }
    renderBoard();
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

setMode("edit");
