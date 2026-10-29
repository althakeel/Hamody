export const DEFAULT_TAWK_CHAT = {
  enabled: true,
};

export function normalizeTawkChat(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    enabled: source.enabled !== false,
  };
}
