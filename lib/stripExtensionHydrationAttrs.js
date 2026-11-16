/**
 * Bitdefender (and similar AV extensions) stamp `bis_skin_checked` onto
 * elements before React hydrates. The strip has to run from a parser-blocking
 * inline script — useLayoutEffect is too late and the hydration mismatch
 * is already reported.
 *
 * Extension content scripts do not share this page's Element.prototype, so
 * patching setAttribute here cannot block them. A MutationObserver removes
 * the attribute as they add it, before the Next.js bundle hydrates.
 */
export const STRIP_EXTENSION_HYDRATION_SCRIPT = `(function(){
  if (window.__hamodyStripExtAttrs) return;
  window.__hamodyStripExtAttrs = true;
  var ATTRS = ['bis_skin_checked'];
  function clean(el) {
    if (!el || el.nodeType !== 1 || !el.removeAttribute) return;
    for (var i = 0; i < ATTRS.length; i++) {
      if (el.hasAttribute(ATTRS[i])) el.removeAttribute(ATTRS[i]);
    }
  }
  function sweep(root) {
    if (!root) return;
    clean(root);
    if (!root.querySelectorAll) return;
    for (var a = 0; a < ATTRS.length; a++) {
      var nodes = root.querySelectorAll('[' + ATTRS[a] + ']');
      for (var i = 0; i < nodes.length; i++) clean(nodes[i]);
    }
  }
  try { sweep(document.documentElement); } catch (e) {}
  if (typeof MutationObserver === 'undefined') return;
  var obs = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'attributes') {
        clean(m.target);
        continue;
      }
      var added = m.addedNodes || [];
      for (var j = 0; j < added.length; j++) sweep(added[j]);
    }
  });
  try {
    obs.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ATTRS
    });
  } catch (e) {}
  window.addEventListener('load', function () {
    sweep(document);
    window.setTimeout(function () {
      try { obs.disconnect(); } catch (e) {}
    }, 4000);
  });
})();`;

export function startStripExtensionHydrationAttrs() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (window.__hamodyStripExtAttrs) return;
  // Same script the root layout inlines in <head>. Backup if that tag was skipped.
  new Function(STRIP_EXTENSION_HYDRATION_SCRIPT)();
}
