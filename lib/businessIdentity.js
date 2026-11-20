/**
 * Public business identity for storefront transparency & Google Merchant Center.
 * Keep these values identical in Merchant Center → Business information.
 *
 * Two addresses — never combine them:
 * - Registered office: Dubai, exactly as printed on the DED trade licence
 * - Fulfilment and returns: Sharjah warehouse
 */

import {
  HAMODY_CUSTOMER_SUPPORT_PHONE,
  HAMODY_CUSTOMER_SUPPORT_TEL,
  HAMODY_SUPPORT_EMAIL,
  formatCustomerSupportPhoneDisplay,
} from '@/lib/storeContact';

export const HAMODY_LEGAL_NAME = 'ALTHAKEEL GENERAL TRADING L.L.C';
export const HAMODY_LEGAL_NAME_AR = 'الثقيل للتجارة العامة ش.ذ.م.م';
export const HAMODY_BRAND_DISPLAY = 'Hamody';

export const HAMODY_TRADE_LICENSE_NO = '641210';
export const HAMODY_COMMERCIAL_REGISTER_NO = '1994147';
export const HAMODY_DCCI_MEMBERSHIP_NO = '183989';

/**
 * Registered office street as printed on the DED Dubai trade licence.
 * Do not use the Sharjah warehouse here.
 */
export const HAMODY_REGISTERED_OFFICE_STREET = '';
export const HAMODY_REGISTERED_OFFICE_CITY = 'Dubai';
export const HAMODY_REGISTERED_OFFICE_REGION = 'Dubai';

/** Fulfilment and returns warehouse — not the registered office. */
export const HAMODY_BUSINESS_STREET =
  'Warehouse No. 1, 18 Maleha St, Industrial Area';
export const HAMODY_BUSINESS_CITY = 'Sharjah';
export const HAMODY_BUSINESS_REGION = 'Sharjah';
export const HAMODY_BUSINESS_COUNTRY = 'United Arab Emirates';
export const HAMODY_BUSINESS_COUNTRY_CODE = 'AE';

export const HAMODY_BUSINESS_HOURS_EN =
  'Sunday – Thursday, 9:00 AM – 6:00 PM (UAE time)';
export const HAMODY_BUSINESS_HOURS_AR =
  'الأحد – الخميس، 9:00 ص – 6:00 م (توقيت الإمارات)';

export const HAMODY_SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/',
  tiktok: '',
  pinterest: '',
  snapchat: '',
};

function joinAddressParts(parts) {
  return parts.filter(Boolean).join(', ');
}

export function getRegisteredOfficeLines() {
  return [
    HAMODY_REGISTERED_OFFICE_STREET,
    `${HAMODY_REGISTERED_OFFICE_CITY}, ${HAMODY_BUSINESS_COUNTRY}`,
  ].filter(Boolean);
}

export function getRegisteredOfficeSingleLine() {
  return joinAddressParts([
    HAMODY_REGISTERED_OFFICE_STREET,
    HAMODY_REGISTERED_OFFICE_CITY,
    HAMODY_BUSINESS_COUNTRY,
  ]);
}

/** Fulfilment / returns warehouse lines. */
export function getBusinessAddressLines() {
  return [
    HAMODY_BUSINESS_STREET,
    `${HAMODY_BUSINESS_CITY}, ${HAMODY_BUSINESS_COUNTRY}`,
  ];
}

export function getBusinessAddressSingleLine() {
  return `${HAMODY_BUSINESS_STREET}, ${HAMODY_BUSINESS_CITY}, ${HAMODY_BUSINESS_COUNTRY}`;
}

export const getFulfilmentAddressLines = getBusinessAddressLines;
export const getFulfilmentAddressSingleLine = getBusinessAddressSingleLine;

export function getPublicBusinessContact({ isArabic = false } = {}) {
  return {
    legalName: HAMODY_LEGAL_NAME,
    legalNameAr: HAMODY_LEGAL_NAME_AR,
    brandName: HAMODY_BRAND_DISPLAY,
    email: HAMODY_SUPPORT_EMAIL,
    phone: HAMODY_CUSTOMER_SUPPORT_PHONE,
    phoneDisplay: formatCustomerSupportPhoneDisplay(HAMODY_CUSTOMER_SUPPORT_PHONE),
    phoneTel: HAMODY_CUSTOMER_SUPPORT_TEL,
    registeredOfficeLines: getRegisteredOfficeLines(),
    registeredOfficeSingleLine: getRegisteredOfficeSingleLine(),
    addressLines: getBusinessAddressLines(),
    addressSingleLine: getBusinessAddressSingleLine(),
    fulfilmentAddressLines: getFulfilmentAddressLines(),
    fulfilmentAddressSingleLine: getFulfilmentAddressSingleLine(),
    hours: isArabic ? HAMODY_BUSINESS_HOURS_AR : HAMODY_BUSINESS_HOURS_EN,
    tradeLicenseNo: HAMODY_TRADE_LICENSE_NO,
  };
}
