
const KM_DATA_VERSION = 1;

function normalizeCard(card, fallbackId) {
  return {
    id: card.id || fallbackId,
    ko: card.ko || '',
    pron: card.pron || '',
    meaning: card.meaning || '',
    example_ko: card.example_ko || '',
    example_vi: card.example_vi || '',
    tip: card.tip || '',
    dialog_ko: card.dialog_ko || '',
    dialog_vi: card.dialog_vi || '',
    checked: Boolean(card.checked),
    hard: Boolean(card.hard),
    favorite: Boolean(card.favorite),
    order: Number(card.order || 0)
  };
}

function migrateBackup(input) {
  // Current V3 format: array of lessons.
  if (Array.isArray(input)) {
    return {
      app: 'Korean Master Pro',
      version: KM_DATA_VERSION,
      exportedAt: new Date().toISOString(),
      lessons: input.map((lesson, lessonIndex) => ({
        id: lesson.id || `lesson-${lessonIndex + 1}`,
        title: lesson.title || `Bài ${lessonIndex + 1}`,
        book: lesson.book || 'Giáo trình 1A',
        cards: (lesson.cards || []).map((card, cardIndex) =>
          normalizeCard(card, `card-${lessonIndex + 1}-${cardIndex + 1}`)
        )
      })),
      settings: {}
    };
  }

  // Versioned .kmdata format.
  if (input && input.app === 'Korean Master Pro' && Array.isArray(input.lessons)) {
    return {
      app: 'Korean Master Pro',
      version: Number(input.version || 1),
      exportedAt: input.exportedAt || new Date().toISOString(),
      lessons: input.lessons.map((lesson, lessonIndex) => ({
        id: lesson.id || `lesson-${lessonIndex + 1}`,
        title: lesson.title || `Bài ${lessonIndex + 1}`,
        book: lesson.book || 'Giáo trình 1A',
        cards: (lesson.cards || []).map((card, cardIndex) =>
          normalizeCard(card, `card-${lessonIndex + 1}-${cardIndex + 1}`)
        )
      })),
      settings: input.settings || {}
    };
  }

  throw new Error('Định dạng sao lưu không hợp lệ.');
}

function createBackup(lessons) {
  return {
    app: 'Korean Master Pro',
    version: KM_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    lessons,
    settings: {
      theme: localStorage.getItem('km-theme') || 'light',
      streak: Number(localStorage.getItem('km-streak') || 1),
      lastOpen: localStorage.getItem('km-last-open') || null
    }
  };
}
