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

// helper: update saved html for one entry
function updateFavoriteHtml(entryKey, newHtml) {
  const favorites = loadFavorites();
  const updated = favorites.map((f) =>
    makeEntryKey(f) === entryKey ? { ...f, html: newHtml } : f
  );
  saveFavorites(updated);
}

// ---------- HIGHLIGHT HELPERS ----------

/**
 * Apply or toggle a highlight with given color to the current selection.
 * - If selection is inside an existing highlight with the same color,
 *   that highlight span is removed (toggle off).
 * - Otherwise, selection is wrapped in a new highlight span.
 */
function applyHighlightToSelection(scriptureEl, entryKey, color) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    alert("Select some text in the scripture first.");
    return;
  }

  const range = sel.getRangeAt(0);

  // Make sure selection is inside this scripture block
  if (!scriptureEl.contains(range.commonAncestorContainer)) {
    alert("Please highlight only text inside this scripture.");
    return;
  }

  // Check if selection is inside an existing highlight
  let node = range.commonAncestorContainer;
  while (node && node !== scriptureEl) {
    if (
      node.nodeType === 1 &&
      node.dataset &&
      node.dataset.userHighlight === "true"
    ) {
      // inside a highlight span
      const span = node;
      if (span.dataset.color === color) {
        // toggle OFF this highlight
        const parent = span.parentNode;
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);

        sel.removeAllRanges();
        updateFavoriteHtml(entryKey, scriptureEl.innerHTML);
        return;
      }
      break;
    }
    node = node.parentNode;
  }

  // Otherwise, create a new highlight span
  const span = document.createElement("span");
  span.className = "user-highlight";
  span.dataset.userHighlight = "true";
  span.dataset.color = color;
  span.style.backgroundColor = color;

  try {
    range.surroundContents(span);
  } catch (err) {
    console.error("Highlight error:", err);
    alert("Please highlight within a single verse or line.");
    return;
  }

  sel.removeAllRanges();
  updateFavoriteHtml(entryKey, scriptureEl.innerHTML);
}

/**
 * Remove highlights that intersect the current selection only.
 */
function clearSelectionHighlights(scriptureEl, entryKey) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    alert("Select highlighted text to clear.");
    return;
  }

  const range = sel.getRangeAt(0);

  if (!scriptureEl.contains(range.commonAncestorContainer)) {
    alert("Please select text inside this scripture.");
    return;
  }

  const spans = Array.from(
    scriptureEl.querySelectorAll('span[data-user-highlight="true"]')
  );

  let changed = false;

  spans.forEach((span) => {
    if (range.intersectsNode(span)) {
      const parent = span.parentNode;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
      changed = true;
    }
  });

  if (changed) {
    sel.removeAllRanges();
    updateFavoriteHtml(entryKey, scriptureEl.innerHTML);
  }
}

/**
 * Remove all user highlight spans for this scripture.
 */
function clearAllHighlights(scriptureEl, entryKey) {
  const spans = scriptureEl.querySelectorAll('span[data-user-highlight="true"]');
  spans.forEach((span) => {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });

  updateFavoriteHtml(entryKey, scriptureEl.innerHTML);
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

      <!-- Highlight tools row -->
      <div class="highlight-tools">
        <span class="highlight-label">Highlight:</span>
        <button class="highlight-color" data-color="#fff3a3" style="background:#fff3a3" aria-label="Yellow highlighter"></button>
        <button class="highlight-color" data-color="#ffd6e8" style="background:#ffd6e8" aria-label="Pink highlighter"></button>
        <button class="highlight-color" data-color="#d6f0ff" style="background:#d6f0ff" aria-label="Blue highlighter"></button>
        <button class="highlight-color" data-color="#d0ffd6" style="background:#d0ffd6" aria-label="Green highlighter"></button>
        <button class="clear-selection-btn" type="button">Clear selection</button>
        <button class="clear-all-btn" type="button">Clear all</button>
      </div>

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
    const colorButtons = article.querySelectorAll(".highlight-color");
    const clearSelectionBtn = article.querySelector(".clear-selection-btn");
    const clearAllBtn = article.querySelector(".clear-all-btn");

    // HTML scripture content
    if (fav.html) {
      scriptureEl.innerHTML = fav.html;
    } else if (fav.mode === "verse" && fav.verse) {
      scriptureEl.innerHTML = `<p><span class="verse-num">${fav.verse}</span> ${escapeHTML(
        fav.text || ""
      )}</p>`;
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

    // highlight color buttons: highlight or toggle selection with that color
    colorButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const color = btn.dataset.color || "#fff3a3";
        applyHighlightToSelection(scriptureEl, entryKey, color);
      });
    });

    // clear only current selection
    clearSelectionBtn.addEventListener("click", () => {
      clearSelectionHighlights(scriptureEl, entryKey);
    });

    // clear all highlights for this scripture
    clearAllBtn.addEventListener("click", () => {
      clearAllHighlights(scriptureEl, entryKey);
    });

    // remove scripture
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
