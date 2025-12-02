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
const favoriteBtn = document.querySelector("#favoriteBtn");

// ---------- INIT ----------
init();

function init() {
  setCurrentYear();
  populateScriptureSelect();
  wireEvents();
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
  generateBtn.addEventListener("click", handleGenerate);
  copyBtn.addEventListener("click", handleCopy);
  favoriteBtn.addEventListener("click", handleSaveToJournal);
}

// ---------- CORE LOGIC ----------
async function handleGenerate() {
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

  // Lazy-load scriptures only when needed
  if (!verses.length || !chapters.length) {
    try {
      const data = await loadAllScriptures();
      verses = data.verses;
      chapters = data.chapters;
    } catch (err) {
      console.error(err);
      showMessage(
        "There was a problem loading the scriptures. Please try again later."
      );
      return;
    }
  }

  let matches = [];
  if (selectedMode === "chapter") {
    matches = filterByCollection(chapters, selectedCollection);
  } else {
    matches = filterByCollection(verses, selectedCollection);
  }

  if (!matches.length) {
    showMessage("No scriptures found for that combination.");
    return;
  }

  const picked = matches[Math.floor(Math.random() * matches.length)];

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
  }
  return items.filter((item) => item.volume === collection);
}

function displayScripture(entry, modeOverride) {
  if (!entry) return;

  const mode =
    modeOverride ||
    currentScripture?.mode ||
    modeSelect.value ||
    "verse";

  if (mode === "chapter") {
    const html = buildChapterHtml(entry);
    scriptureTextEl.innerHTML = html;
    currentScripture.formattedHtml = html;
  } else {
    const text = entry.text || "";
    const verseNum = entry.verse != null ? String(entry.verse) : null;

    let html;
    if (verseNum) {
      html = `<p><span class="verse-num">${verseNum}</span> ${escapeHtml(
        text
      )}</p>`;
    } else {
      html = escapeHtml(text);
    }

    scriptureTextEl.innerHTML = html;
    currentScripture.formattedHtml = html;
  }

  scriptureRefEl.textContent = `${entry.reference} (${entry.volume})`;
}

function showMessage(message) {
  currentScripture = null;
  scriptureTextEl.textContent = message;
  scriptureRefEl.textContent = "";
}

// ---------- COPY ----------
async function handleCopy() {
  if (!currentScripture) {
    showMessage("Generate a scripture first before copying.");
    return;
  }

  const fullText = `${currentScripture.text} — ${currentScripture.reference}`;

  try {
    await navigator.clipboard.writeText(fullText);
    scriptureRefEl.textContent = `${currentScripture.reference} (Copied!)`;
  } catch {
    scriptureRefEl.textContent = `${currentScripture.reference} (Copy not supported)`;
  }
}

// ---------- ADD TO JOURNAL ----------
function handleSaveToJournal() {
  if (!currentScripture) {
    showMessage("Generate a scripture first before adding to your journal.");
    return;
  }

  const favoritesKey = "soulsFavorites";
  let favorites = [];

  const stored = localStorage.getItem(favoritesKey);
  if (stored) {
    try {
      favorites = JSON.parse(stored);
    } catch {
      favorites = [];
    }
  }

  const alreadySaved = favorites.some(
    (f) =>
      f.reference === currentScripture.reference &&
      f.volume === currentScripture.volume
  );

  if (alreadySaved) {
    scriptureRefEl.textContent = `${currentScripture.reference} (Already saved)`;
    return;
  }

  const formattedHtml =
    currentScripture.formattedHtml ||
    `<p>${escapeHtml(currentScripture.text)}</p>`;

  favorites.push({
    volume: currentScripture.volume,
    book: currentScripture.book,
    chapter: currentScripture.chapter,
    verse: currentScripture.verse ?? null,
    reference: currentScripture.reference,
    text: currentScripture.text,
    mode: currentScripture.mode,
    html: formattedHtml,
  });

  localStorage.setItem(favoritesKey, JSON.stringify(favorites));

  scriptureRefEl.textContent = `${currentScripture.reference} (Added to Journal!)`;
}
