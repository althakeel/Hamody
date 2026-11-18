export const SCROLL_TO_TOP_POSITIONS = ['right', 'left'];

export const DEFAULT_SCROLL_TO_TOP = {
  enabled: true,
  position: 'right',
};

/** Physical screen corners so Arabic RTL does not flip the button under Tawk. */
export function getScrollToTopPositionClass(position = DEFAULT_SCROLL_TO_TOP.position) {
  return position === 'left'
    ? 'bottom-[5.75rem] left-4 lg:bottom-8 lg:left-8'
    : 'bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px)+5.5rem)] right-4 lg:bottom-36 lg:right-6';
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
