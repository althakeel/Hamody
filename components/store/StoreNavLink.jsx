'use client';

import Link from 'next/link';

export default function StoreNavLink({ href, children, prefetch = false, ...rest }) {
  return (
    <Link href={href} prefetch={prefetch} scroll={false} {...rest}>
      {children}
    </Link>
  );
}
