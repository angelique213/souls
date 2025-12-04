// scripts/data.js

export async function loadAllScriptures() {
  // simple in-memory cache so I only do the heavy work once
  if (loadAllScriptures._cache) {
    return loadAllScriptures._cache;
  }

  const res = await fetch("data/scriptures.json");
  if (!res.ok) {
    throw new Error("Failed to load data/scriptures.json");
  }

  // root = { oldTestament, newTestament, bookOfMormon, doctrineAndCovenants }
  const root = await res.json();

  const allVerses = [];
  const allChapters = [];

  // ---------- helper: volumes that use books → chapters → verses ----------
  function processBooksVolume(volumeJson, volumeLabel) {
    if (!volumeJson || !Array.isArray(volumeJson.books)) return;

    volumeJson.books.forEach(bookObj => {
      const bookName = bookObj.book || bookObj.name || volumeLabel;

      (bookObj.chapters || []).forEach(ch => {
        const chapterNumber = ch.chapter ?? null;
        const chapterRef =
          ch.reference || `${bookName} ${chapterNumber ?? ""}`.trim();

        const versesArr = ch.verses || [];
        const chapterText = versesArr.map(v => v.text).join(" ");

        // chapter-level entry
        allChapters.push({
          volume: volumeLabel,
          book: bookName,
          chapter: chapterNumber,
          reference: chapterRef,
          text: chapterText
        });

        versesArr.forEach(v => {
          allVerses.push({
            volume: volumeLabel,
            book: bookName,
            chapter: chapterNumber,
            verse: v.verse,
            reference: v.reference,
            text: v.text
          });
        });
      });
    });
  }

  // ---------- helper: Doctrine & Covenants (sections → verses) ----------
  function processSectionsVolume(volumeJson, volumeLabel) {
    if (!volumeJson || !Array.isArray(volumeJson.sections)) return;

    volumeJson.sections.forEach(sec => {
      const bookName = "Doctrine and Covenants";
      const sectionNumber = sec.section ?? sec.chapter ?? null;
      const chapterRef =
        sec.reference || `D&C ${sectionNumber ?? ""}`.trim();
      const versesArr = sec.verses || [];

      const chapterText = versesArr.map(v => v.text).join(" ");

      allChapters.push({
        volume: volumeLabel,
        book: bookName,
        chapter: sectionNumber,
        reference: chapterRef,
        text: chapterText
      });

      versesArr.forEach(v => {
        allVerses.push({
          volume: volumeLabel,
          book: bookName,
          chapter: sectionNumber,
          verse: v.verse,
          reference: v.reference,
          text: v.text
        });
      });
    });
  }

  // ---------- process each volume ----------
  processBooksVolume(root.bookOfMormon, "Book of Mormon");
  processBooksVolume(root.oldTestament, "Old Testament");
  processBooksVolume(root.newTestament, "New Testament");
  processSectionsVolume(root.doctrineAndCovenants, "Doctrine and Covenants");

  const result = { verses: allVerses, chapters: allChapters };

  loadAllScriptures._cache = result;

  return result;
}
