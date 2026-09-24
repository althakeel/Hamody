/** Bitdefender / similar AV extensions inject this before React hydrates. */
const ATTR = 'bis_skin_checked';

function clean(el) {
  if (!el || !el.removeAttribute || !el.hasAttribute) return;
  if (el.hasAttribute(ATTR)) el.removeAttribute(ATTR);
}

function sweep(root) {
  if (!root) return;
  if (root.nodeType === 1) clean(root);
  if (!root.querySelectorAll) return;
  const nodes = root.querySelectorAll(`[${ATTR}]`);
  for (let i = 0; i < nodes.length; i += 1) clean(nodes[i]);
}

export function startStripExtensionHydrationAttrs() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (window.__store1920StripExtAttrs) return;
  window.__store1920StripExtAttrs = true;

  try { sweep(document.documentElement); } catch {}
  if (typeof MutationObserver === 'undefined') return;

  const obs = new MutationObserver((muts) => {
    for (let i = 0; i < muts.length; i += 1) {
      const m = muts[i];
      if (m.type === 'attributes') {
        clean(m.target);
        continue;
      }
      const added = m.addedNodes || [];
      for (let j = 0; j < added.length; j += 1) sweep(added[j]);
    }
  });

  try {
    obs.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [ATTR],
    });
  } catch {}

  const stop = () => { try { obs.disconnect(); } catch {} };
  window.addEventListener('load', () => {
    sweep(document);
    window.setTimeout(stop, 1500);
  });
}
