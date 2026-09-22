const MJML_STARTER = `<mjml>
  <mj-body background-color="#f3f4f7">
    <mj-section background-color="#0f766e" padding="28px 20px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="22px" font-family="Arial, sans-serif" font-weight="700">
          Store1920
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="32px 24px">
      <mj-column>
        <mj-text font-size="20px" font-family="Arial, sans-serif" color="#111827" font-weight="700">
          Your headline
        </mj-text>
        <mj-text font-size="15px" line-height="1.6" font-family="Arial, sans-serif" color="#334155">
          Paste your MJML here. We compile it to inbox-ready HTML when you preview or send.
        </mj-text>
        <mj-button background-color="#0f766e" color="#ffffff" href="https://www.store1920.com" font-family="Arial, sans-serif">
          Shop now
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

export function isMjmlMarkup(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return /<mjml[\s>]/i.test(raw)
    || /<mj-body[\s>]/i.test(raw)
    || /<mj-section[\s>]/i.test(raw)
    || /<mj-hero[\s>]/i.test(raw);
}

/** Keep only the MJML document when preview text or CSS was pasted above it. */
export function extractMjmlDocument(value = '') {
  const raw = String(value || '');
  const start = raw.search(/<mjml[\s>]/i);
  if (start < 0) return raw.trim();
  const end = raw.toLowerCase().lastIndexOf('</mjml>');
  if (end < start) return raw.slice(start).trim();
  return raw.slice(start, end + 7).trim();
}

export function getMjmlStarter() {
  return MJML_STARTER;
}
