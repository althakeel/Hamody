const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const ARABIC_RUN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;

export function hasArabicText(value = '') {
  return ARABIC_CHAR.test(String(value || ''));
}

export function cleanExportText(value = '') {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keep logical Unicode for Excel — Excel already handles Arabic RTL. */
export function formatExcelText(value = '') {
  return cleanExportText(value);
}

/**
 * jsPDF draws left-to-right and Helvetica has no Arabic glyphs.
 * Reverse Arabic runs so they read correctly with an Arabic-capable font.
 * Do not convert to presentation forms — Tajawal uses the base Arabic letters.
 */
export function formatPdfText(value = '') {
  const text = cleanExportText(value);
  if (!hasArabicText(text)) return text;
  return text.replace(ARABIC_RUN, (run) => Array.from(run).reverse().join(''));
}
