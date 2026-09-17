export const SCROLL_TO_TOP_POSITIONS = ['right', 'left'];

export const DEFAULT_SCROLL_TO_TOP = {
  enabled: true,
  position: 'right',
};

/** Physical screen corners so Arabic RTL does not flip the button under Tawk. */
export function getScrollToTopPositionClass(position = DEFAULT_SCROLL_TO_TOP.position) {
  return position === 'left'
    ? 'bottom-[5.75rem] left-4 lg:bottom-8 lg:left-8'
    : 'bottom-[10.5rem] right-4 lg:bottom-[6.75rem] lg:right-8';
}

export function normalizeScrollToTop(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const position = SCROLL_TO_TOP_POSITIONS.includes(source.position)
    ? source.position
    : DEFAULT_SCROLL_TO_TOP.position;

  return {
    enabled: source.enabled !== false,
    position,
  };
}
