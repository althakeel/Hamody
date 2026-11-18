export const ADD_TO_CART_POPUP_EVENT = 'hamody-add-to-cart-popup';

export function openAddToCartPopup(product) {
  if (typeof window === 'undefined' || !product) return;
  window.dispatchEvent(new CustomEvent(ADD_TO_CART_POPUP_EVENT, {
    detail: { product },
  }));
}
