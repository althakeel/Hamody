import { DEFAULT_OFFERS_NAV_STYLE, normalizeOffersNavStyle } from '@/lib/offersPageSettings'

export const DEFAULT_NAVBAR_LAYOUT = {
  extraButtons: [],
  searchMaxWidth: 600,
  searchPlaceholder: '',
  searchPlaceholderAr: '',
  navbarMaxWidth: 1400,
  stickyHeader: false,
  showCategoriesButton: true,
  categoriesButtonLabel: '',
  categoriesButtonLabelAr: '',
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

export function normalizeNavbarLayout(raw = {}) {
  return {
    extraButtons: normalizeNavbarExtraButtons(raw.extraButtons || raw.navExtraButtons),
    searchMaxWidth: clampWidth(raw.searchMaxWidth, 320, 900, DEFAULT_NAVBAR_LAYOUT.searchMaxWidth),
    searchPlaceholder: String(raw.searchPlaceholder || '').trim(),
    searchPlaceholderAr: String(raw.searchPlaceholderAr || '').trim(),
    navbarMaxWidth: clampWidth(raw.navbarMaxWidth, 1000, 1800, DEFAULT_NAVBAR_LAYOUT.navbarMaxWidth),
    stickyHeader: raw.stickyHeader === true,
    showCategoriesButton: raw.showCategoriesButton !== false,
    categoriesButtonLabel: String(raw.categoriesButtonLabel || '').trim(),
    categoriesButtonLabelAr: String(raw.categoriesButtonLabelAr || '').trim(),
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
