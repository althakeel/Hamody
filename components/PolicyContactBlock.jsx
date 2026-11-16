import {
  HAMODY_CUSTOMER_SUPPORT_PHONE,
  HAMODY_CUSTOMER_SUPPORT_TEL,
  HAMODY_SUPPORT_EMAIL,
  formatCustomerSupportPhoneDisplay,
} from '@/lib/storeContact';
import {
  HAMODY_LEGAL_NAME,
  HAMODY_BRAND_DISPLAY,
  getRegisteredOfficeSingleLine,
  getFulfilmentAddressSingleLine,
  HAMODY_BUSINESS_HOURS_EN,
  HAMODY_BUSINESS_HOURS_AR,
} from '@/lib/businessIdentity';

const HAMODY_WEBSITE = 'https://hamody.com';
const HAMODY_WEBSITE_LABEL = 'hamody.com';

export default function PolicyContactBlock({ isArabic = false }) {
  const hours = isArabic ? HAMODY_BUSINESS_HOURS_AR : HAMODY_BUSINESS_HOURS_EN;
  const phoneDisplay = formatCustomerSupportPhoneDisplay(HAMODY_CUSTOMER_SUPPORT_PHONE);
  const registeredOffice = getRegisteredOfficeSingleLine();
  const fulfilmentAddress = getFulfilmentAddressSingleLine();

  if (isArabic) {
    return (
      <section className="border-t border-gray-200 pt-4">
        <h2 className="font-semibold text-gray-900 mb-2">معلومات التواصل</h2>
        <p className="text-gray-700 mb-1">
          <strong>اسم النشاط:</strong> {HAMODY_LEGAL_NAME}
        </p>
        <p className="text-gray-700 mb-1">
          <strong>الاسم التجاري:</strong> {HAMODY_BRAND_DISPLAY}
        </p>
        <p className="text-gray-700 mb-1">
          <strong>المكتب المسجّل:</strong> {registeredOffice}
        </p>
        <p className="text-gray-700 mb-1">
          <strong>التجهيز والإرجاع:</strong> {fulfilmentAddress}
        </p>
        <p className="text-gray-700 mb-1">
          <strong>الموقع:</strong>{' '}
          <a href={HAMODY_WEBSITE} className="text-orange-600 underline">
            {HAMODY_WEBSITE_LABEL}
          </a>
        </p>
        <p className="text-gray-700 mb-1">
          <strong>البريد الإلكتروني:</strong>{' '}
          <a href={`mailto:${HAMODY_SUPPORT_EMAIL}`} className="text-orange-600 underline">
            {HAMODY_SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-gray-700 mb-1">
          <strong>دعم العملاء:</strong>{' '}
          <a href={HAMODY_CUSTOMER_SUPPORT_TEL} className="text-orange-600 underline">
            {phoneDisplay}
          </a>
        </p>
        <p className="text-gray-700">
          <strong>ساعات العمل:</strong> {hours}
        </p>
      </section>
    );
  }

  return (
    <section className="border-t border-gray-200 pt-4">
      <h2 className="font-semibold text-gray-900 mb-2">Contact Information</h2>
      <p className="text-gray-700 mb-1">
        <strong>Business Name:</strong> {HAMODY_LEGAL_NAME}
      </p>
      <p className="text-gray-700 mb-1">
        <strong>Trading as:</strong> {HAMODY_BRAND_DISPLAY}
      </p>
      <p className="text-gray-700 mb-1">
        <strong>Registered office:</strong> {registeredOffice}
      </p>
      <p className="text-gray-700 mb-1">
        <strong>Fulfilment and returns:</strong> {fulfilmentAddress}
      </p>
      <p className="text-gray-700 mb-1">
        <strong>Website:</strong>{' '}
        <a href={HAMODY_WEBSITE} className="text-orange-600 underline">
          {HAMODY_WEBSITE_LABEL}
        </a>
      </p>
      <p className="text-gray-700 mb-1">
        <strong>Email:</strong>{' '}
        <a href={`mailto:${HAMODY_SUPPORT_EMAIL}`} className="text-orange-600 underline">
          {HAMODY_SUPPORT_EMAIL}
        </a>
      </p>
      <p className="text-gray-700 mb-1">
        <strong>Customer Support:</strong>{' '}
        <a href={HAMODY_CUSTOMER_SUPPORT_TEL} className="text-orange-600 underline">
          {phoneDisplay}
        </a>
      </p>
      <p className="text-gray-700">
        <strong>Business hours:</strong> {hours}
      </p>
    </section>
  );
}
