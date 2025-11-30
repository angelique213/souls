// scripts/main.js
import { loadAllScriptures } from "./data.js";

// ---------- STATE ----------
let verses = [];
let chapters = [];
let currentScripture = null;

// ---------- DOM ELEMENTS ----------
const yearSpans = document.querySelectorAll("#year");
const bookSelect = document.querySelector("#bookSelect");
const modeSelect = document.querySelector("#modeSelect");
const generateBtn = document.querySelector("#generateBtn");
const scriptureTextEl = document.querySelector("#scriptureText");
const scriptureRefEl = document.querySelector("#scriptureRef");
const copyBtn = document.querySelector("#copyBtn");
const favoriteBtn = document.querySelector("#favoriteBtn"); // "Add to Journal" button

// ---------- INIT ----------
init();

async function init() {
  setCurrentYear();

  try {
    const data = await loadAllScriptures();
    verses = data.verses;
    chapters = data.chapters;

    populateScriptureSelect();
    wireEvents();
  } catch (err) {
    console.error(err);
    showMessage(
      "There was a problem loading the scriptures. Please try again later."
    );
  }
}

// ---------- UTILITIES ----------
function setCurrentYear() {
  const year = new Date().getFullYear();
  yearSpans.forEach((span) => (span.textContent = year));
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * For chapters: build the same HTML we show on Home
 * (each verse with a number).
 */
function buildChapterHtml(entry) {
  if (!entry) return "";

  const matchingVerses = verses
    .filter(
      (v) =>
        v.volume === entry.volume &&
        v.book === entry.book &&
        Number(v.chapter) === Number(entry.chapter)
    )
    .sort((a, b) => Number(a.verse) - Number(b.verse));

  if (!matchingVerses.length) {
    return escapeHtml(entry.text || "");
  }

  return matchingVerses
    .map(
      (v) =>
        `<p><span class="verse-num">${v.verse}</span> ${escapeHtml(
          v.text || ""
        )}</p>`
    )
    .join("");
}

function populateScriptureSelect() {
  const options = [
    { value: "Book of Mormon", label: "Book of Mormon" },
    { value: "Bible", label: "Bible" },
    { value: "Doctrine and Covenants", label: "Doctrine and Covenants" },
  ];

  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    bookSelect.appendChild(option);
  });
}

function wireEvents() {
  if (generateBtn) generateBtn.addEventListener("click", handleGenerate);
  if (copyBtn) copyBtn.addEventListener("click", handleCopy);
  if (favoriteBtn) favoriteBtn.addEventListener("click", handleSaveToJournal);
}

// ---------- CORE LOGIC ----------
function handleGenerate() {
  const selectedCollection = bookSelect.value;
  const selectedMode = modeSelect.value;

  if (!selectedCollection && !selectedMode) {
    showMessage("Please choose a scripture collection and mode.");
    return;
  } else if (!selectedCollection) {
    showMessage("Please choose a scripture collection.");
    return;
  } else if (!selectedMode) {
    showMessage("Please choose chapter or verse.");
    return;
  }

  let matches = [];

  if (selectedMode === "verse") {
    matches = filterByCollection(verses, selectedCollection);
  } else if (selectedMode === "chapter") {
    matches = filterByCollection(chapters, selectedCollection);
  }

  if (matches.length === 0) {
    showMessage("No scriptures found yet for that combination.");
    return;
  }

  const randomIndex = Math.floor(Math.random() * matches.length);
  const picked = matches[randomIndex];

  currentScripture = {
    ...picked,
    mode: selectedMode,
    collection: selectedCollection,
    formattedHtml: null,
  };

  displayScripture(picked, selectedMode);
}

function filterByCollection(items, collection) {
  if (collection === "Bible") {
    return items.filter(
      (item) =>
        item.volume === "Old Testament" || item.volume === "New Testament"
    );
  } else {
    return items.filter((item) => item.volume === collection);
  }
}

/**
 * Display a verse or a chapter and also store
 * a formattedHtml version inside currentScripture
 * so the journal page can use it.
 */
function displayScripture(entry, modeOverride) {
  if (!entry) return;

  const mode =
    modeOverride ||
    currentScripture?.mode ||
    (typeof modeSelect !== "undefined" ? modeSelect.value : "verse");

  if (mode === "chapter") {
    const html = buildChapterHtml(entry);
    scriptureTextEl.innerHTML = html;
    if (currentScripture) currentScripture.formattedHtml = html;
  } else {
    // Single verse mode – show verse number too
    const text = entry.text || "";
    const verseNum =
      typeof entry.verse !== "undefined" && entry.verse !== null
        ? String(entry.verse)
        : null;

    let html;
    if (verseNum) {
      html = `<p><span class="verse-num">${verseNum}</span> ${escapeHtml(
        text
      )}</p>`;
    } else {
      html = escapeHtml(text);
    }

    scriptureTextEl.innerHTML = html;
    if (currentScripture) currentScripture.formattedHtml = html;
  }

  scriptureRefEl.textContent = `${entry.reference} (${entry.volume})`;
}

function showMessage(message) {
  currentScripture = null;
  scriptureTextEl.textContent = message;
  scriptureRefEl.textContent = "";
}

// ---------- COPY & "ADD TO JOURNAL" ----------
async function handleCopy() {
  if (!currentScripture) {
    showMessage("Generate a scripture first before copying.");
    return;
  }

  const fullText = `${currentScripture.text} — ${currentScripture.reference}`;

  try {
    await navigator.clipboard.writeText(fullText);
    scriptureRefEl.textContent = `${currentScripture.reference} (Copied!)`;
  } catch (err) {
    console.error("Clipboard error:", err);
    scriptureRefEl.textContent = `${currentScripture.reference} (Copy not available in this browser.)`;
  }
}

function handleSaveToJournal() {
  if (!currentScripture) {
    showMessage("Generate a scripture first before adding it to your journal.");
    return;
  }

  // NOTE: we keep the same key used by journal.js for compatibility
  const favoritesKey = "soulsFavorites";

  // 1) Read existing saved journal entries
  let favorites = [];
  const stored = localStorage.getItem(favoritesKey);

  if (stored) {
    try {
      favorites = JSON.parse(stored);
    } catch (err) {
      console.error("Error parsing saved journal entries from localStorage:", err);
      favorites = [];
    }
  }

  // 2) Avoid duplicates using reference + volume
  const alreadySaved = favorites.some(
    (fav) =>
      fav.reference === currentScripture.reference &&
      fav.volume === currentScripture.volume
  );

  if (alreadySaved) {
    scriptureRefEl.textContent = `${currentScripture.reference} (Already in your journal)`;
    return;
  }

  // Decide final mode
  const mode =
    currentScripture.mode || (currentScripture.verse ? "verse" : "chapter");

  // Ensure we have formattedHtml for journal page
  let formattedHtml = currentScripture.formattedHtml || "";

  if (!formattedHtml) {
    if (mode === "chapter") {
      formattedHtml = buildChapterHtml(currentScripture);
    } else if (mode === "verse") {
      const verseNum =
        currentScripture.verse !== null &&
        typeof currentScripture.verse !== "undefined"
          ? String(currentScripture.verse)
          : "";
      if (verseNum) {
        formattedHtml = `<p><span class="verse-num">${verseNum}</span> ${escapeHtml(
          currentScripture.text || ""
        )}</p>`;
      } else {
        formattedHtml = escapeHtml(currentScripture.text || "");
      }
    }
  }

  const entryToSave = {
    volume: currentScripture.volume,
    book: currentScripture.book,
    chapter: currentScripture.chapter,
    verse: currentScripture.verse ?? null,
    reference: currentScripture.reference,
    text: currentScripture.text,
    mode,
    html: formattedHtml,
  };

  favorites.push(entryToSave);

  localStorage.setItem(favoritesKey, JSON.stringify(favorites));

  scriptureRefEl.textContent = `${currentScripture.reference} (Added to your journal)`;
  console.log("Saved journal entries:", favorites);
}
