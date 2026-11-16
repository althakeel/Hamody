import { publicPageMetadata } from '@/lib/publicPageMetadata';

export const metadata = publicPageMetadata({
  title: 'Careers at hamody.com | Work in UAE e-commerce',
  description:
    'Join hamody.com in the UAE. Learn how we hire for customer support, fulfilment, merchandising and digital roles, and send your application.',
  path: '/careers',
});

export default function CareersLayout({ children }) {
  return children;
}
