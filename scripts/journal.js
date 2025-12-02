// scripts/journal.js

// ---------- DOM ELEMENTS ----------
const yearSpans = document.querySelectorAll("#year");
const journalList = document.querySelector("#journalList");

// keys
const FAVORITES_KEY = "soulsFavorites";
const NOTES_KEY = "soulsNotes";

// ---------- INIT ----------
init();

function init() {
  setCurrentYear();
  const savedEntries = loadFavorites();

  if (!savedEntries.length) {
    journalList.innerHTML = `
      <p class="empty-message">
        You don't have any saved scriptures yet. Go to the Home page,
        generate a scripture, and click <strong>Add to Journal</strong>.
      </p>`;
    return;
  }

  renderJournalEntries(savedEntries);
}

// ---------- UTILITIES ----------
function setCurrentYear() {
  const year = new Date().getFullYear();
  yearSpans.forEach((span) => (span.textContent = year));
}

function loadFavorites() {
  const stored = localStorage.getItem(FAVORITES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveFavorites(arr) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
}

function loadNotes() {
  const stored = localStorage.getItem(NOTES_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveNotes(n) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(n));
}

function makeEntryKey(fav) {
  return `${fav.volume}|${fav.reference}`;
}

function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, (ch) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[ch] || ch;
  });
}

// ---------- RENDER ----------
function renderJournalEntries(favorites) {
  const notes = loadNotes();
  journalList.innerHTML = "";

  favorites.forEach((fav, index) => {
    const entryKey = makeEntryKey(fav);
    const savedNote = notes[entryKey] || "";

    const article = document.createElement("article");
    article.className = "journal-card";

    article.innerHTML = `
      <p class="journal-reference">
        <span class="journal-index">#${index + 1}</span>
        ${escapeHTML(fav.reference)} (${escapeHTML(fav.volume)})
      </p>

      <div class="journal-scripture"></div>

      <div class="journal-controls-row">
        <button class="add-journal-btn">Add Journal ▸</button>
        <button class="unsave-btn">Remove</button>
      </div>

      <div class="journal-notes-wrapper">
        <textarea class="journal-notes" placeholder="Write your thoughts here..." hidden></textarea>
        <button class="save-notes-btn" hidden>Save Journal</button>
        <p class="journal-status" aria-live="polite"></p>
      </div>
    `;

    const scriptureEl = article.querySelector(".journal-scripture");
    const toggleBtn = article.querySelector(".add-journal-btn");
    const unsaveBtn = article.querySelector(".unsave-btn");
    const textarea = article.querySelector(".journal-notes");
    const saveBtn = article.querySelector(".save-notes-btn");
    const status = article.querySelector(".journal-status");

    // HTML scripture content
    if (fav.html) {
      scriptureEl.innerHTML = fav.html;
    } else if (fav.mode === "verse" && fav.verse) {
      scriptureEl.innerHTML = `<p><span class="verse-num">${fav.verse}</span> ${escapeHTML(fav.text)}</p>`;
    } else {
      scriptureEl.textContent = fav.text || "";
    }

    // notes
    textarea.value = savedNote;

    toggleBtn.addEventListener("click", () => {
      const show = textarea.hidden;
      textarea.hidden = !show;
      saveBtn.hidden = !show;
      toggleBtn.textContent = show ? "Hide Journal ▲" : "Add Journal ▸";
    });

    saveBtn.addEventListener("click", () => {
      const updated = loadNotes();
      updated[entryKey] = textarea.value.trim();
      saveNotes(updated);

      status.textContent = "Saved!";
      setTimeout(() => (status.textContent = ""), 1200);
    });

    unsaveBtn.addEventListener("click", () => {
      if (!window.confirm("Remove this scripture from your journal?")) return;

      let updatedFavs = loadFavorites().filter(
        (f) => makeEntryKey(f) !== entryKey
      );
      saveFavorites(updatedFavs);

      const updatedNotes = loadNotes();
      delete updatedNotes[entryKey];
      saveNotes(updatedNotes);

      renderJournalEntries(updatedFavs);
    });

    journalList.appendChild(article);
  });
}
