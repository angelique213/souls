// scripts/data.js

// Load and flatten ALL scripture files
export async function loadAllScriptures() {
    const volumeFiles = [
      { volume: "Book of Mormon", file: "data/book-of-mormon.json" },
      { volume: "Doctrine and Covenants", file: "data/doctrine-and-covenants.json" },
      { volume: "Old Testament", file: "data/old-testament.json" },
      { volume: "New Testament", file: "data/new-testament.json" }
    ];
  
    const allVerses = [];
    const allChapters = [];
  
    for (const vf of volumeFiles) {
      const res = await fetch(vf.file);
      if (!res.ok) {
        throw new Error(`Failed to load ${vf.file}`);
      }
      const json = await res.json();
  
      // ---------- CASE 1: books → chapters → verses (BoM, OT, NT) ----------
      if (Array.isArray(json.books)) {
        json.books.forEach(bookObj => {
          const bookName = bookObj.book || bookObj.name || vf.volume;
  
          (bookObj.chapters || []).forEach(ch => {
            const chapterNumber = ch.chapter ?? null;
            const chapterRef = ch.reference || `${bookName} ${chapterNumber ?? ""}`.trim();
  
            const versesArr = ch.verses || [];
  
            const chapterText = versesArr.map(v => v.text).join(" ");
  
            allChapters.push({
              volume: vf.volume,
              book: bookName,
              chapter: chapterNumber,
              reference: chapterRef,
              text: chapterText
            });
  
            versesArr.forEach(v => {
              allVerses.push({
                volume: vf.volume,
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
  
      // ---------- CASE 2: sections → verses (typical Doctrine & Covenants) ----------
      if (Array.isArray(json.sections)) {
        json.sections.forEach(sec => {
          const bookName = "Doctrine and Covenants";
          const sectionNumber = sec.section ?? sec.chapter ?? null;
          const chapterRef = sec.reference || `D&C ${sectionNumber ?? ""}`.trim();
          const versesArr = sec.verses || [];
  
          const chapterText = versesArr.map(v => v.text).join(" ");
  
          allChapters.push({
            volume: vf.volume,
            book: bookName,
            chapter: sectionNumber,
            reference: chapterRef,
            text: chapterText
          });
  
          versesArr.forEach(v => {
            allVerses.push({
              volume: vf.volume,
              book: bookName,
              chapter: sectionNumber,
              verse: v.verse,
              reference: v.reference,
              text: v.text
            });
          });
        });
      }
    }
  
    return { verses: allVerses, chapters: allChapters };
  }
  