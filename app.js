// app.js

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "notes_app_v1";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Format: "16 Januari 2025, 13:30 WIB"
function formatDateTimeWIB(isoString) {
  const dt = new Date(isoString);

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Convert to WIB without Intl: add +7 hours then use UTC getters
  const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDate();
  const monthName = months[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();
  const hh = pad2(wib.getUTCHours());
  const mm = pad2(wib.getUTCMinutes());

  return `${day} ${monthName} ${year}, ${hh}:${mm} WIB`;
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uid() {
  // simple unique id
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ===== State =====
let notes = loadNotes();

// ===== DOM =====
const noteForm = $("noteForm");
const titleInput = $("titleInput");
const tagInput = $("tagInput");
const contentInput = $("contentInput");

const notesList = $("notesList");
const searchInput = $("searchInput");
const sortSelect = $("sortSelect");
const clearAllBtn = $("clearAllBtn");

// ===== Render =====
function getFilteredSortedNotes() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  const sort = sortSelect?.value || "terbaru";

  let filtered = [...notes];

  if (q) {
    filtered = filtered.filter((n) => {
      const t = (n.title || "").toLowerCase();
      const c = (n.content || "").toLowerCase();
      const tg = (n.tag || "").toLowerCase();
      return t.includes(q) || c.includes(q) || tg.includes(q);
    });
  }

  filtered.sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    return sort === "terlama" ? at - bt : bt - at;
  });

  return filtered;
}

function render() {
  const data = getFilteredSortedNotes();

  if (!notesList) return;

  if (data.length === 0) {
    notesList.innerHTML = `
      <div class="w-full h-fit bg-white border border-slate-200 p-6 rounded-xl">
        <p class="text-[13px] text-slate-500">
          Belum ada note. Tambahin dulu ya 👆
        </p>
      </div>
    `;
    return;
  }

  notesList.innerHTML = data
    .map((n) => {
      const title = escapeHtml(n.title);
      const content = escapeHtml(n.content).replaceAll("\n", "<br/>");
      const tag = (n.tag || "").trim();
      const tagHtml = tag
        ? `
        <div class="w-fit h-fit px-[4px] py-[2px] text-[13px] bg-slate-200 rounded">
          <p>#${escapeHtml(tag)}</p>
        </div>`
        : "";

      return `
      <div class="w-full h-fit bg-white border border-slate-200 p-6 rounded-xl" data-note-id="${
        n.id
      }">
        <div class="flex flex-col w-full h-fit gap-8">

          <div class="flex w-full justify-between h-fit gap-4">
            <div class="flex flex-col w-full h-fit gap-2">
              <div class="flex flex-col w-full h-fit">
                <h2 class="font-bold break-words">${title}</h2>
                <p class="text-[13px] text-slate-400 w-full">
                  ${formatDateTimeWIB(n.createdAt)}
                </p>
              </div>
              ${tagHtml}
            </div>

            <div class="flex h-fit w-fit gap-2 shrink-0">
              <button
                class="bg-white border border-yellow-600 w-full h-fit py-[8px] px-[12px] rounded-xl text-[13px]"
                data-action="edit"
              >
                Edit
              </button>
              <button
                class="bg-white border border-red-600 w-full h-fit py-[8px] px-[12px] rounded-xl text-[13px]"
                data-action="delete"
              >
                Hapus
              </button>
            </div>
          </div>

          <div class="flex justify-between w-full h-fit">
            <p class="text-[13px] text-justify text-slate-800 break-words">
              ${content}
            </p>
          </div>

        </div>
      </div>
    `;
    })
    .join("");
}

// ===== CRUD =====
function addNote({ title, tag, content }) {
  const note = {
    id: uid(),
    title: title.trim(),
    tag: (tag || "").trim(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  notes.unshift(note); // default newest first
  saveNotes(notes);
  render();
}

function deleteNote(id) {
  notes = notes.filter((n) => n.id !== id);
  saveNotes(notes);
  render();
}

function editNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  // simple prompt-based edit
  const newTitle = prompt("Edit judul:", note.title);
  if (newTitle === null) return;

  const newTag = prompt("Edit tag (opsional):", note.tag || "");
  if (newTag === null) return;

  const newContent = prompt("Edit isi catatan:", note.content);
  if (newContent === null) return;

  const t = newTitle.trim();
  const c = newContent.trim();

  if (!t || !c) {
    alert("Judul dan isi tidak boleh kosong.");
    return;
  }

  note.title = t;
  note.tag = (newTag || "").trim();
  note.content = c;

  saveNotes(notes);
  render();
}

function clearAll() {
  if (notes.length === 0) return;
  const ok = confirm("Yakin mau hapus semua note?");
  if (!ok) return;
  notes = [];
  saveNotes(notes);
  render();
}

// ===== Events =====
noteForm?.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleInput.value;
  const tag = tagInput.value;
  const content = contentInput.value;

  if (!title.trim() || !content.trim()) return;

  addNote({ title, tag, content });

  // reset form
  noteForm.reset();
  titleInput.focus();
});

notesList?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const card = e.target.closest("[data-note-id]");
  if (!card) return;

  const id = card.getAttribute("data-note-id");
  const action = btn.getAttribute("data-action");

  if (action === "delete") deleteNote(id);
  if (action === "edit") editNote(id);
});

searchInput?.addEventListener("input", render);
sortSelect?.addEventListener("change", render);
clearAllBtn?.addEventListener("click", clearAll);

// ===== Init =====
render();
