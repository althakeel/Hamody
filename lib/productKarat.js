const KARAT_NUMBERS = new Set(['8', '9', '10', '14', '18', '21', '22', '24'])

const KARAT_TEXT = /(?:^|[^\d])(8|9|10|14|18|21|22|24)\s*(?:k|kt|karats?|carats?)\b/i
const KARAT_AR = /(?:عيار|قيراط)\s*(8|9|10|14|18|21|22|24)\b|(?:^|[^\d])(8|9|10|14|18|21|22|24)\s*(?:عيار|قيراط)/
const KARAT_LABEL = /karat|carat|purity|عيار|قيراط|العيار/i

function formatKaratNumber(value) {
  const number = String(value || '').trim()
  return KARAT_NUMBERS.has(number) ? number : ''
}

function karatFromText(value) {
  const text = String(value || '').replace(/<[^>]+>/g, ' ')
  const english = text.match(KARAT_TEXT)
  if (english) return formatKaratNumber(english[1])
  const arabic = text.match(KARAT_AR)
  if (arabic) return formatKaratNumber(arabic[1] || arabic[2])
  return ''
}

function karatFromSpecValue(value) {
  const text = String(value || '').trim()
  const explicit = karatFromText(text)
  if (explicit) return explicit
  const bare = text.match(/^(8|9|10|14|18|21|22|24)(?:\.0+)?$/)
  return bare ? formatKaratNumber(bare[1]) : ''
}

function specRowsOf(product) {
  const rows = []
  if (Array.isArray(product.specTableRows)) rows.push(...product.specTableRows)
  if (Array.isArray(product.attributes?.specRows)) rows.push(...product.attributes.specRows)
  if (Array.isArray(product.attributes?.specRowsAr)) rows.push(...product.attributes.specRowsAr)
  return rows
}

/** Karat number such as "22" when the product name, SKU, or specification says it. */
export function extractProductKarat(product) {
  if (!product || typeof product !== 'object') return ''

  const direct = karatFromSpecValue(
    product.karat || product.attributes?.karat || product.attributes?.purity
  )
  if (direct) return direct

  for (const row of specRowsOf(product)) {
    if (!Array.isArray(row)) continue
    const cells = row.map((cell) => String(cell || '').trim()).filter(Boolean)
    if (cells.length === 0) continue
    const label = cells[0]
    if (KARAT_LABEL.test(label)) {
      const fromLabel = karatFromSpecValue(cells.slice(1).join(' '))
      if (fromLabel) return fromLabel
    }
    const fromCells = karatFromText(cells.join(' '))
    if (fromCells) return fromCells
  }

  return karatFromText([
    product.name,
    product.nameAr,
    product.shortDescription,
    product.shortDescriptionAr,
    product.sku,
  ].filter(Boolean).join(' '))
}
