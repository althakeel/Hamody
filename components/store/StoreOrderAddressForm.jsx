'use client';

import { useEffect, useMemo } from 'react';
import { indiaStatesAndDistricts } from '@/assets/indiaStatesAndDistricts';
import { UAE_PHONE_CODE_OPTIONS } from '@/assets/countryCodes';
import SearchableSelect from '@/components/SearchableSelect';
import PhoneNumberField from '@/components/PhoneNumberField';
import {
  UAE_EMIRATES,
  getUaeAreaOptionsForEmirate,
  isUaeCountry,
} from '@/lib/uaeEmirateAreas';

const FIXED_COUNTRY = 'United Arab Emirates';

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const selectClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function StoreOrderAddressForm({
  form,
  onChange,
  invalidFieldIds = new Set(),
}) {
  const districts = useMemo(() => {
    if (form.country !== 'India' || !form.state) return [];
    const stateData = indiaStatesAndDistricts.find((entry) => entry.state === form.state);
    return stateData?.districts || [];
  }, [form.country, form.state]);

  useEffect(() => {
    if (form.country === FIXED_COUNTRY) return;
    onChange((current) => ({
      ...current,
      country: FIXED_COUNTRY,
      phoneCode: '+971',
    }));
  }, [form.country, onChange]);

  const hasError = (id) => invalidFieldIds.has(id);
  const errorClass = (id) => (hasError(id) ? 'border-red-400 ring-2 ring-red-100' : '');

  const updateField = (name, value) => {
    onChange((current) => ({ ...current, [name]: value }));
  };

  const handleStateChange = (state) => {
    onChange((current) => ({
      ...current,
      state,
      district: '',
      city: '',
    }));
  };

  return (
    <div className="space-y-5" lang="en" dir="ltr">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Contact details</h3>
        <p className="mt-0.5 text-xs text-slate-500">Same fields customers fill at checkout.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div id="store-order-name">
          <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
          <input
            className={`${fieldClass} ${errorClass('guest-name')}`}
            value={form.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Customer name"
            required
          />
        </div>
        <div id="store-order-email">
          <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
          <input
            type="email"
            className={`${fieldClass} ${errorClass('guest-email')}`}
            value={form.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="customer@email.com"
            required
          />
        </div>
      </div>

      <div id="store-order-phone">
        <PhoneNumberField
          label="Phone number"
          phone={form.phone}
          phoneCode={form.phoneCode}
          onPhoneChange={(value) => updateField('phone', value)}
          onPhoneCodeChange={(e) => updateField('phoneCode', e.target.value)}
          countryOptions={UAE_PHONE_CODE_OPTIONS}
          inputClassName={`flex-1 ${fieldClass} ${errorClass('guest-phone')}`}
          selectClassName="rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Delivery address</h3>
        <p className="mt-0.5 text-xs text-slate-500">Same address options as the customer checkout form.</p>
      </div>

      <div id="guest-building">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Building or villa <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        <input
          className={`${fieldClass} ${errorClass('guest-building')}`}
          value={form.buildingOrVilla || ''}
          onChange={(e) => updateField('buildingOrVilla', e.target.value)}
          placeholder="Building or villa"
          required
        />
      </div>

      <div id="guest-apartment">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Apartment or floor (optional)
        </label>
        <input
          className={fieldClass}
          value={form.apartmentOrFloor || ''}
          onChange={(e) => updateField('apartmentOrFloor', e.target.value)}
          placeholder="Apartment or floor"
        />
      </div>

      <div id="guest-street">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Street name <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        <input
          className={`${fieldClass} ${errorClass('guest-street')}`}
          value={form.streetName || ''}
          onChange={(e) => updateField('streetName', e.target.value)}
          placeholder="Street name"
          required
        />
      </div>

      <div id="guest-state">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          {isUaeCountry(form.country) ? 'Emirate' : 'State / Emirate'}{' '}
          <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        {form.country === 'India' ? (
          <SearchableSelect
            value={form.state}
            onChange={handleStateChange}
            options={indiaStatesAndDistricts.map((entry) => entry.state)}
            placeholder="Select state"
            searchPlaceholder="Search state..."
            hasError={hasError('guest-state')}
            triggerClassName={`${selectClass} ${errorClass('guest-state')}`}
          />
        ) : isUaeCountry(form.country) ? (
          <SearchableSelect
            value={form.state}
            onChange={handleStateChange}
            options={UAE_EMIRATES}
            placeholder="Select emirate"
            searchPlaceholder="Search emirate..."
            hasError={hasError('guest-state')}
            triggerClassName={`${selectClass} ${errorClass('guest-state')}`}
          />
        ) : (
          <input
            className={`${fieldClass} ${errorClass('guest-state')}`}
            value={form.state || ''}
            onChange={(e) => updateField('state', e.target.value)}
            placeholder="State / emirate"
            required
          />
        )}
      </div>

      {isUaeCountry(form.country) && form.state ? (
        <div id="guest-area">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Area <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <SearchableSelect
            value={form.district}
            onChange={(value) => updateField('district', value)}
            options={getUaeAreaOptionsForEmirate(form.state, form.district)}
            placeholder="Select area"
            searchPlaceholder="Search area..."
            emptyMessage="No areas found"
            allowCustomValue
            formatCustomOption={(area) => `Use "${area}"`}
            hasError={hasError('guest-area')}
            triggerClassName={`${selectClass} ${errorClass('guest-area')}`}
          />
        </div>
      ) : null}

      {form.country === 'India' && form.state ? (
        <div id="store-order-district">
          <label className="mb-1 block text-xs font-medium text-slate-600">District</label>
          <select
            className={`${fieldClass} ${errorClass('guest-district')}`}
            value={form.district || ''}
            onChange={(e) => updateField('district', e.target.value)}
            required
          >
            <option value="">Select district</option>
            {districts.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>
      ) : null}

      {form.country === 'India' ? (
        <div id="store-order-pincode" className="sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-600">Pincode</label>
          <input
            className={`${fieldClass} ${errorClass('guest-pincode')}`}
            value={form.pincode || ''}
            onChange={(e) => updateField('pincode', e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit pincode"
          />
        </div>
      ) : null}

      <div id="guest-country">
        <label className="mb-1 block text-xs font-medium text-slate-600">Country</label>
        <input
          type="text"
          value={FIXED_COUNTRY}
          readOnly
          aria-readonly="true"
          className={`${fieldClass} cursor-default bg-slate-100 text-slate-700`}
        />
      </div>
    </div>
  );
}
