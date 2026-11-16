import { DEFAULT_APP_URL, getCustomerSiteUrl } from '@/lib/appUrl';

export const HOME_PAGE_META_TITLE =
  'Hamody: Traditional Sculptures and Outdoor Camping in the UAE';

export const HOME_PAGE_META_DESCRIPTION =
  'Shop traditional sculptures and outdoor camping at Hamody. Delivery across the UAE on eligible items.';

const HOME_CANONICAL = getCustomerSiteUrl() || DEFAULT_APP_URL;

export const HOME_PAGE_METADATA = {
  title: HOME_PAGE_META_TITLE,
  description: HOME_PAGE_META_DESCRIPTION,
  alternates: {
    canonical: HOME_CANONICAL,
  },
  openGraph: {
    title: HOME_PAGE_META_TITLE,
    description: HOME_PAGE_META_DESCRIPTION,
    url: HOME_CANONICAL,
    type: 'website',
    siteName: 'Hamody',
  },
};
