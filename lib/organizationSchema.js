import {
  HAMODY_LEGAL_NAME,
  HAMODY_LEGAL_NAME_AR,
  HAMODY_TRADE_LICENSE_NO,
  HAMODY_COMMERCIAL_REGISTER_NO,
  HAMODY_DCCI_MEMBERSHIP_NO,
  HAMODY_REGISTERED_OFFICE_STREET,
  HAMODY_REGISTERED_OFFICE_CITY,
  HAMODY_REGISTERED_OFFICE_REGION,
  HAMODY_BUSINESS_STREET,
  HAMODY_BUSINESS_CITY,
  HAMODY_BUSINESS_COUNTRY_CODE,
  HAMODY_SOCIAL_LINKS,
  getRegisteredOfficeSingleLine,
  getFulfilmentAddressSingleLine,
} from '@/lib/businessIdentity';
import { HAMODY_BRAND_NAME, HAMODY_LOGO_URL } from '@/lib/brandLogo';
import {
  HAMODY_CUSTOMER_SUPPORT_PHONE,
  HAMODY_SUPPORT_EMAIL,
} from '@/lib/storeContact';
import { SITE_URL } from '@/lib/sitemapData';

export function getOrganizationJsonLd() {
  const registeredOffice = {
    '@type': 'PostalAddress',
    ...(HAMODY_REGISTERED_OFFICE_STREET
      ? { streetAddress: HAMODY_REGISTERED_OFFICE_STREET }
      : {}),
    addressLocality: HAMODY_REGISTERED_OFFICE_CITY,
    addressRegion: HAMODY_REGISTERED_OFFICE_REGION,
    addressCountry: HAMODY_BUSINESS_COUNTRY_CODE,
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: HAMODY_BRAND_NAME,
    legalName: HAMODY_LEGAL_NAME,
    alternateName: [HAMODY_LEGAL_NAME_AR, 'ALTHAKEEL GENERAL TRADING LLC', 'hamody.com'],
    url: SITE_URL,
    logo: HAMODY_LOGO_URL,
    description: 'Shop traditional sculptures and outdoor camping at Hamody in the UAE.',
    identifier: [
      {
        '@type': 'PropertyValue',
        name: 'UAE Trade License Number',
        value: HAMODY_TRADE_LICENSE_NO,
      },
      {
        '@type': 'PropertyValue',
        name: 'Commercial Register Number',
        value: HAMODY_COMMERCIAL_REGISTER_NO,
      },
      {
        '@type': 'PropertyValue',
        name: 'DCCI Membership Number',
        value: HAMODY_DCCI_MEMBERSHIP_NO,
      },
    ],
    address: registeredOffice,
    location: {
      '@type': 'Place',
      name: 'Fulfilment and returns',
      address: {
        '@type': 'PostalAddress',
        streetAddress: HAMODY_BUSINESS_STREET,
        addressLocality: HAMODY_BUSINESS_CITY,
        addressRegion: HAMODY_BUSINESS_CITY,
        addressCountry: HAMODY_BUSINESS_COUNTRY_CODE,
      },
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        areaServed: 'AE',
        availableLanguage: ['en', 'ar'],
        email: HAMODY_SUPPORT_EMAIL,
        telephone: `+971-${HAMODY_CUSTOMER_SUPPORT_PHONE}`,
      },
    ],
    sameAs: [
      HAMODY_SOCIAL_LINKS.instagram,
      HAMODY_SOCIAL_LINKS.facebook,
      HAMODY_SOCIAL_LINKS.tiktok,
      HAMODY_SOCIAL_LINKS.pinterest,
      HAMODY_SOCIAL_LINKS.snapchat,
      `${SITE_URL}/business-information`,
      `${SITE_URL}/about-us`,
      `${SITE_URL}/contact-us`,
    ],
    foundingLocation: {
      '@type': 'Place',
      name: getRegisteredOfficeSingleLine(),
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Fulfilment and returns',
        value: getFulfilmentAddressSingleLine(),
      },
    ],
  };
}
