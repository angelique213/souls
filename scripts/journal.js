// scripts/journal.js

// ---------- DOM ELEMENTS ----------
const yearSpans = document.querySelectorAll("#year");
const journalList = document.querySelector("#journalList");

const FAVORITES_KEY = "soulsFavorites";
const NOTES_KEY = "soulsNotes";

// ---------- INIT ----------
init();

function init() {
  setCurrentYear();

  const favorites = loadFavorites();

  if (!favorites.length) {
    journalList.innerHTML = `
      <p class="empty-message">
        You don't have any favorites yet. Go to the Home page,
        generate a scripture, and click <strong>Add to Favorites</strong>.
      </p>
    `;
    return;
  }

  renderJournalEntries(favorites);
}

// ---------- UTILITIES ----------
function setCurrentYear() {
  const year = new Date().getFullYear();
  yearSpans.forEach(span => (span.textContent = year));
}

function loadFavorites() {
  const stored = localStorage.getItem(FAVORITES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (err) {
    console.error("Error parsing favorites:", err);
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
  } catch (err) {
    console.error("Error parsing notes:", err);
    return {};
  }
}

function saveNotes(notesObj) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notesObj));
}

function makeEntryKey(fav) {
  return `${fav.volume}|${fav.reference}`;
}

function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, ch => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
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
        <button class="unsave-btn">Unsave</button>
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

    // ---- Scripture content with verse numbers ----
    if (fav.html) {
      // New favorites: already formatted with <span class="verse-num">
      scriptureEl.innerHTML = fav.html;
    } else if (fav.mode === "verse" && fav.verse) {
      // Old single-verse favorites
      scriptureEl.innerHTML = `<p><span class="verse-num">${escapeHTML(
        String(fav.verse)
      )}</span> ${escapeHTML(fav.text || "")}</p>`;
    } else {
      // Old chapter favorites without html
      scriptureEl.textContent = fav.text || "";
    }

    // ---- Notes ----
    textarea.value = savedNote;

    toggleBtn.addEventListener("click", () => {
      const willShow = textarea.hidden;
      textarea.hidden = !willShow;
      saveBtn.hidden = !willShow;
      toggleBtn.textContent = willShow ? "Hide Journal ▲" : "Add Journal ▸";
    });

    saveBtn.addEventListener("click", () => {
      const updatedNotes = loadNotes();
      updatedNotes[entryKey] = textarea.value.trim();
      saveNotes(updatedNotes);

      status.textContent = "Saved!";
      setTimeout(() => (status.textContent = ""), 1200);
    });

    // ---- Unsave ----
    unsaveBtn.addEventListener("click", () => {
      const confirmDelete = window.confirm(
        "Are you sure you want to unsave this scripture?"
      );
      if (!confirmDelete) return;

      let updatedFavs = loadFavorites();
      updatedFavs = updatedFavs.filter(f => makeEntryKey(f) !== entryKey);
      saveFavorites(updatedFavs);

      const updatedNotes = loadNotes();
      delete updatedNotes[entryKey];
      saveNotes(updatedNotes);

      renderJournalEntries(updatedFavs);
    });

    journalList.appendChild(article);
  });
}
