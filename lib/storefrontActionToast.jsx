'use client';

import toast from 'react-hot-toast';
import StorefrontActionToast from '@/components/StorefrontActionToast';

const STOREFRONT_TOAST_IDS = {
  cart: 'storefront-action-cart',
  wishlist: 'storefront-action-wishlist',
  'wishlist-removed': 'storefront-action-wishlist-removed',
  orders: 'storefront-action-orders',
  success: 'storefront-action-success',
};

export function showStorefrontActionToast({
  variant = 'cart',
  title,
  subtitle = '',
  actionLabel,
  actionHref,
  duration = 4500,
  position = 'top-center',
}) {
  const toastId = STOREFRONT_TOAST_IDS[variant] || `storefront-action-${variant}`;

  toast.custom(
    (t) => (
      <StorefrontActionToast
        visible={t.visible}
        variant={variant}
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        actionHref={actionHref}
        onDismiss={() => toast.dismiss(t.id)}
        duration={duration}
      />
    ),
    {
      id: toastId,
      duration,
      position,
      // Prevent default toast chrome (grey bars / padding) while CSS loads.
      style: {
        background: 'transparent',
        boxShadow: 'none',
        border: '0',
        padding: 0,
        margin: 0,
      },
      className: 'storefront-action-toast-slot',
    },
  );
}
