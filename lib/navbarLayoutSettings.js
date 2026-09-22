import { DEFAULT_OFFERS_NAV_STYLE, getOffersNavButtonAppearance, normalizeOffersNavStyle, resolveOffersNavFontFamily, withOffersNavEmojiFonts } from '@/lib/offersPageSettings'

export const DEFAULT_CATEGORIES_BUTTON_STYLE = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: '500',
  fontColor: '#ffffff',
  fontColorAuto: true,
  borderWidth: 0,
  borderColor: '#ffffff',
  borderRadius: 0,
  width: 0,
  backgroundTransparent: true,
  backgroundColor: '#ffffff',
}

export const DEFAULT_SEARCH_STYLE = {
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: '400',
  fontColor: '#1e293b',
  fontColorAuto: false,
  borderWidth: 1,
  borderColor: '#ffffff',
  borderRadius: 16,
  width: 0,
  backgroundTransparent: false,
  backgroundColor: '#ffffff',
  animation: 'none',
}

export const NAVBAR_FIXED_ITEM_IDS = [
  'logo',
  'deals',
  'categories',
  'search',
  'account',
  'orders',
  'wishlist',
  'cart',
]

export const DEFAULT_NAVBAR_ITEM_ORDER = [...NAVBAR_FIXED_ITEM_IDS]

export const SEARCH_ALIGN_OPTIONS = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'fill', label: 'Fill leftover space' },
]

export function normalizeSearchAlign(value = '') {
  const next = String(value || '').trim().toLowerCase()
  if (next === 'right' || next === 'end') return 'right'
  if (next === 'fill' || next === 'stretch') return 'fill'
  return 'left'
}

export function getNavbarSearchSlotProps(align = 'left', searchMaxWidth = 600) {
  const width = Number(searchMaxWidth) || 600
  const resolvedAlign = normalizeSearchAlign(align)
  const innerStyle = { width: '100%', maxWidth: width }
  if (resolvedAlign === 'fill') {
    return {
      slotClassName: 'relative z-[70] min-w-0 flex-1 basis-0',
      innerClassName: 'relative min-w-0 w-full',
      innerStyle,
    }
  }
  return {
    slotClassName: `relative z-[70] min-w-0 flex-1 basis-0 flex ${resolvedAlign === 'right' ? 'justify-end' : 'justify-start'}`,
    innerClassName: 'relative min-w-0 w-full max-w-full',
    innerStyle,
  }
}

export const DEFAULT_NAVBAR_BOTTOM_BORDER = {
  showBottomBorder: false,
  bottomBorderWidth: 2,
  bottomBorderColor: '#e2e8f0',
}

function normalizeHexColor(value, fallback) {
  const candidate = String(value || '').trim()
  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(candidate)) return candidate
  return fallback
}

export function normalizeNavbarBottomBorder(raw = {}, fallback = DEFAULT_NAVBAR_BOTTOM_BORDER) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const width = Number(source.bottomBorderWidth)
  return {
    showBottomBorder: source.showBottomBorder === true,
    bottomBorderWidth: Number.isFinite(width)
      ? Math.min(12, Math.max(1, Math.round(width)))
      : fallback.bottomBorderWidth,
    bottomBorderColor: normalizeHexColor(source.bottomBorderColor, fallback.bottomBorderColor),
  }
}

export function getNavbarBottomBorderStyle(raw = {}) {
  const border = normalizeNavbarBottomBorder(raw)
  if (!border.showBottomBorder) return {}
  return {
    borderBottomWidth: `${border.bottomBorderWidth}px`,
    borderBottomStyle: 'solid',
    borderBottomColor: border.bottomBorderColor,
  }
}

export const DEFAULT_NAVBAR_LAYOUT = {
  extraButtons: [],
  searchMaxWidth: 600,
  searchAlign: 'left',
  searchPlaceholder: '',
  searchPlaceholderAr: '',
  searchStyle: { ...DEFAULT_SEARCH_STYLE },
  navbarMaxWidth: 1400,
  itemGap: 12,
  logoGap: 16,
  mobileItemGap: 4,
  stickyHeader: false,
  showCategoriesButton: true,
  categoriesButtonLabel: 'Categories',
  categoriesButtonLabelAr: '',
  categoriesButtonStyle: { ...DEFAULT_CATEGORIES_BUTTON_STYLE },
  itemOrder: [...DEFAULT_NAVBAR_ITEM_ORDER],
  itemAlign: {},
  unifyNavbarText: false,
  unifiedTextFontFamily: 'inherit',
  unifiedTextFontSize: 13,
}

export const ITEM_ALIGN_OPTIONS = [
  { id: 'left', label: 'Left' },
  { id: 'default', label: 'Default' },
  { id: 'right', label: 'Right' },
]

export function normalizeItemAlignValue(value = '') {
  const next = String(value || '').trim().toLowerCase()
  if (next === 'left' || next === 'start') return 'left'
  if (next === 'right' || next === 'end') return 'right'
  return 'default'
}

export function defaultNavbarItemAlign(extraButtons = []) {
  const extras = normalizeNavbarExtraButtons(extraButtons).map((item) => item.id)
  const align = {
    logo: 'default',
    deals: 'default',
    categories: 'default',
    search: 'default',
    account: 'default',
    orders: 'default',
    wishlist: 'default',
    cart: 'default',
  }
  extras.forEach((id) => {
    align[id] = 'default'
  })
  return align
}

export function normalizeNavbarItemAlign(raw = {}, extraButtons = []) {
  const defaults = defaultNavbarItemAlign(extraButtons)
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const next = { ...defaults }
  for (const id of Object.keys(defaults)) {
    if (source[id] !== undefined) next[id] = normalizeItemAlignValue(source[id])
  }
  return next
}

export function resolveNavbarItemSide(itemId = '', align = 'default') {
  const resolved = normalizeItemAlignValue(align)
  if (resolved === 'left' || resolved === 'right') return resolved
  if (itemId === 'search') return 'center'
  if (itemId === 'account' || itemId === 'orders' || itemId === 'wishlist' || itemId === 'cart') return 'right'
  return 'left'
}

export function groupNavbarItemsBySide(itemIds = [], itemAlign = {}, extraButtons = []) {
  const align = normalizeNavbarItemAlign(itemAlign, extraButtons)
  const left = []
  const center = []
  const right = []
  for (const id of itemIds) {
    const side = resolveNavbarItemSide(id, align[id])
    if (side === 'right') right.push(id)
    else if (side === 'center') center.push(id)
    else left.push(id)
  }
  return { left, center, right }
}

const MAX_EXTRA_BUTTONS = 3

export function createNavbarExtraButton() {
  return {
    id: `nav-extra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    labelAr: '',
    link: '/offers',
    enabled: true,
    style: { ...DEFAULT_OFFERS_NAV_STYLE },
  }
}

export function normalizeNavbarExtraButtons(value = []) {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_EXTRA_BUTTONS).map((item, index) => ({
    id: String(item?.id || `nav-extra-${index + 1}`).trim() || `nav-extra-${index + 1}`,
    label: String(item?.label || '').trim(),
    labelAr: String(item?.labelAr || '').trim(),
    link: String(item?.link || '').trim() || '/offers',
    enabled: item?.enabled !== false,
    style: normalizeOffersNavStyle(item?.style),
  }))
}

function clampWidth(value, min, max, fallback) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.max(min, Math.min(max, Math.round(next)))
}

export function defaultNavbarItemOrder(extraButtons = []) {
  const extras = normalizeNavbarExtraButtons(extraButtons).map((item) => item.id)
  return ['logo', 'deals', ...extras, 'categories', 'search', 'account', 'orders', 'wishlist', 'cart']
}

export function normalizeNavbarItemOrder(order, extraButtons = []) {
  const extras = normalizeNavbarExtraButtons(extraButtons).map((item) => item.id)
  const allowed = new Set([...NAVBAR_FIXED_ITEM_IDS, ...extras])
  const defaults = defaultNavbarItemOrder(extraButtons)
  const next = []
  const seen = new Set()

  for (const rawId of Array.isArray(order) ? order : []) {
    const id = String(rawId || '').trim()
    if (!id || !allowed.has(id) || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }

  for (const id of defaults) {
    if (seen.has(id)) continue
    let inserted = false
    const defaultIndex = defaults.indexOf(id)
    for (let index = defaultIndex + 1; index < defaults.length; index += 1) {
      const neighbor = next.indexOf(defaults[index])
      if (neighbor >= 0) {
        next.splice(neighbor, 0, id)
        inserted = true
        break
      }
    }
    if (!inserted) next.push(id)
    seen.add(id)
  }

  return next
}

export function moveNavbarItem(order, fromId, toId, extraButtons = []) {
  const next = normalizeNavbarItemOrder(order, extraButtons)
  const from = next.indexOf(fromId)
  const to = next.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return next
  const copy = [...next]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function isNavbarItemVisible(id, layout = {}, visibility = {}) {
  if (id === 'categories') return layout.showCategoriesButton !== false
  if (id === 'orders') return visibility.orders !== false
  if (id === 'wishlist') return visibility.wishlist !== false
  if (id === 'cart') return visibility.cart !== false
  if (id === 'logo' || id === 'deals' || id === 'search' || id === 'account') return true
  const button = normalizeNavbarExtraButtons(layout.extraButtons).find((item) => item.id === id)
  return Boolean(button && button.enabled !== false && (button.label || button.labelAr))
}

export function getNavbarItemLabel(id, layout = {}) {
  if (id === 'logo') return 'Logo'
  if (id === 'deals') return 'LAST CHANCE'
  if (id === 'categories') return getNavbarCategoriesButtonLabel(layout, 'en', 'Categories')
  if (id === 'search') return 'Search'
  if (id === 'account') return 'Account'
  if (id === 'orders') return 'Orders'
  if (id === 'wishlist') return 'Wishlist'
  if (id === 'cart') return 'Cart'
  const button = normalizeNavbarExtraButtons(layout.extraButtons).find((item) => item.id === id)
  return button?.label || button?.labelAr || 'Button'
}

export function getNavbarArrangeItems(layout = {}, visibility = {}) {
  return normalizeNavbarItemOrder(layout.itemOrder, layout.extraButtons)
    .filter((id) => isNavbarItemVisible(id, layout, visibility))
    .map((id) => ({
      id,
      label: getNavbarItemLabel(id, layout),
      align: normalizeItemAlignValue(layout?.itemAlign?.[id]),
    }))
}

export function normalizeNavbarLayout(raw = {}) {
  const extraButtons = normalizeNavbarExtraButtons(raw.extraButtons || raw.navExtraButtons)
  return {
    extraButtons,
    searchMaxWidth: clampWidth(raw.searchMaxWidth, 320, 900, DEFAULT_NAVBAR_LAYOUT.searchMaxWidth),
    searchAlign: normalizeSearchAlign(raw.searchAlign),
    searchPlaceholder: String(raw.searchPlaceholder || '').trim(),
    searchPlaceholderAr: String(raw.searchPlaceholderAr || '').trim(),
    searchStyle: normalizeOffersNavStyle({
      ...DEFAULT_SEARCH_STYLE,
      ...(raw.searchStyle && Object.keys(raw.searchStyle).length ? raw.searchStyle : {}),
    }),
    navbarMaxWidth: clampWidth(raw.navbarMaxWidth, 1100, 1400, DEFAULT_NAVBAR_LAYOUT.navbarMaxWidth),
    itemGap: clampWidth(raw.itemGap, 0, 48, DEFAULT_NAVBAR_LAYOUT.itemGap),
    logoGap: clampWidth(raw.logoGap, 0, 80, DEFAULT_NAVBAR_LAYOUT.logoGap),
    mobileItemGap: clampWidth(raw.mobileItemGap, 0, 24, DEFAULT_NAVBAR_LAYOUT.mobileItemGap),
    stickyHeader: raw.stickyHeader === true,
    showCategoriesButton: raw.showCategoriesButton !== false,
    categoriesButtonLabel: String(raw.categoriesButtonLabel || '').trim() || DEFAULT_NAVBAR_LAYOUT.categoriesButtonLabel,
    categoriesButtonLabelAr: String(raw.categoriesButtonLabelAr || '').trim(),
    categoriesButtonStyle: normalizeOffersNavStyle(
      raw.categoriesButtonStyle && Object.keys(raw.categoriesButtonStyle).length
        ? raw.categoriesButtonStyle
        : DEFAULT_CATEGORIES_BUTTON_STYLE,
    ),
    itemOrder: normalizeNavbarItemOrder(raw.itemOrder || raw.navbarItemOrder, extraButtons),
    itemAlign: normalizeNavbarItemAlign(raw.itemAlign || raw.navbarItemAlign, extraButtons),
    unifyNavbarText: raw.unifyNavbarText === true,
    unifiedTextFontFamily: String(raw.unifiedTextFontFamily || DEFAULT_NAVBAR_LAYOUT.unifiedTextFontFamily).trim() || 'inherit',
    unifiedTextFontSize: clampWidth(raw.unifiedTextFontSize, 8, 22, DEFAULT_NAVBAR_LAYOUT.unifiedTextFontSize),
  }
}

export function isNavbarTextUnified(layout = {}) {
  return layout?.unifyNavbarText === true
}

export function applyUnifiedNavbarText(style = {}, layout = {}) {
  if (!isNavbarTextUnified(layout)) return style || {}
  return {
    ...(style && typeof style === 'object' ? style : {}),
    fontFamily: layout.unifiedTextFontFamily || 'inherit',
    fontSize: Number(layout.unifiedTextFontSize) || DEFAULT_NAVBAR_LAYOUT.unifiedTextFontSize,
  }
}

export function getUnifiedNavbarTextCss(layout = {}) {
  if (!isNavbarTextUnified(layout)) return null
  const font = resolveOffersNavFontFamily(layout.unifiedTextFontFamily)
  return {
    fontFamily: withOffersNavEmojiFonts(font.value),
    fontSize: `${Number(layout.unifiedTextFontSize) || DEFAULT_NAVBAR_LAYOUT.unifiedTextFontSize}px`,
  }
}

export function getUnifiedNavbarFontId(layout = {}) {
  if (!isNavbarTextUnified(layout)) return ''
  return resolveOffersNavFontFamily(layout.unifiedTextFontFamily).id
}

export function getNavbarCategoriesButtonAppearance(layout = {}, variant = 'desktop') {
  const appearance = getOffersNavButtonAppearance(
    applyUnifiedNavbarText(layout?.categoriesButtonStyle || DEFAULT_CATEGORIES_BUTTON_STYLE, layout),
    variant,
  )
  const fontSize = Number.parseInt(String(appearance.style?.fontSize || ''), 10)
  const chevronSize = Math.max(12, Math.round((Number.isFinite(fontSize) ? fontSize : 13) * 0.95))
  return {
    ...appearance,
    chevronSize,
  }
}

export function getNavbarSearchAppearance(layout = {}, variant = 'desktop') {
  const sourceStyle = layout?.searchStyle && Object.keys(layout.searchStyle || {}).length
    ? layout.searchStyle
    : DEFAULT_SEARCH_STYLE
  const appearance = getOffersNavButtonAppearance(
    applyUnifiedNavbarText(sourceStyle, layout),
    variant,
  )
  const style = appearance.style || {}
  return {
    fontId: appearance.fontId,
    boxStyle: {
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderWidth,
      borderStyle: style.borderStyle,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
    },
    inputStyle: {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      color: style.color,
    },
    textColor: appearance.textColor,
  }
}

export function visibleNavbarExtraButtons(buttons = [], language = 'en') {
  return normalizeNavbarExtraButtons(buttons)
    .filter((item) => item.enabled && (item.label || item.labelAr))
    .map((item) => ({
      ...item,
      displayLabel: language === 'ar'
        ? (item.labelAr || item.label)
        : (item.label || item.labelAr),
    }))
    .filter((item) => item.displayLabel)
}

export function getNavbarCategoriesButtonLabel(layout = {}, language = 'en', fallback = 'Categories') {
  const english = String(layout.categoriesButtonLabel || '').trim()
  const arabic = String(layout.categoriesButtonLabelAr || '').trim()
  if (language === 'ar') return arabic || english || fallback
  return english || arabic || fallback
}
