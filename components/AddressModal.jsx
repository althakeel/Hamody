'use client'
import { addAddress, fetchAddress } from "@/lib/features/address/addressSlice"

import axios from "axios"
import { Check, MapPin, Pencil, Plus, Trash2, XIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"

import { useAuth } from '@/lib/useAuth';
import { UAE_EMIRATES, getUaeAreaOptionsForEmirate, isUaeCountry } from '@/lib/uaeEmirateAreas';
import SearchableSelect from '@/components/SearchableSelect';
import PhoneNumberField from '@/components/PhoneNumberField';
import { UAE_PHONE_CODE_OPTIONS } from '@/assets/countryCodes';
import {
    validateAddressPayload,
} from '@/lib/addressValidation';
import {
    getPhoneInputError,
    getPhoneValidationMessage,
    isValidPhoneNumber,
} from '@/lib/phoneValidation';
import { composeAddressStreetLine, splitAddressStreetLine } from '@/lib/addressLine';

const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"
];

function formatPhoneLine(addr) {
    const code = String(addr?.phoneCode || '+971').trim();
    const phone = String(addr?.phone || '').trim();
    if (!phone) return '';
    return `${code} ${phone}`;
}

function formatAddressSummary(addr) {
    const country = String(addr?.country || '').trim();
    const hideCountry = /united arab emirates/i.test(country);
    const parts = [addr?.street, addr?.city, addr?.district, addr?.state, hideCountry ? '' : country]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    const seen = new Set();
    const line = parts
        .filter((part) => {
            const key = part.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .join(' – ');
    const phone = formatPhoneLine(addr);
    if (!line) return phone;
    return phone ? `${line} · ${phone}` : line;
}

function resolveAddressCity(addr) {
    return String(addr?.district || addr?.state || addr?.city || '').trim();
}

const AddressModal = ({ open, setShowAddressModal, onAddressAdded, initialAddress = null, isEdit = false, onAddressUpdated, onAddressDeleted, addressList = [], onSelectAddress, selectedAddressId, allowGuest = false }) => {
    const { user, getToken } = useAuth()
    const dispatch = useDispatch()
    
    const [mode, setMode] = useState('select') // 'select' or 'form'
    const [editingAddress, setEditingAddress] = useState(null) // Track which address is being edited
    const [pincodeLoading, setPincodeLoading] = useState(false)
    const [pincodeError, setPincodeError] = useState('')
    const [areaError, setAreaError] = useState('')
    const [pendingAddressId, setPendingAddressId] = useState(selectedAddressId || null)
    const [deletingAddressId, setDeletingAddressId] = useState(null)

    const [address, setAddress] = useState({
        name: '',
        email: '',
        street: '',
        buildingOrVilla: '',
        streetName: '',
        apartmentOrFloor: '',
        city: '',
        state: '',
        district: '',
        zip: '',
        country: 'United Arab Emirates',
        phone: '',
        phoneCode: '+971',
        alternatePhone: '',
        alternatePhoneCode: '+971',
        id: null,
    })
    
    // Set mode based on props
    useEffect(() => {
        if (open) {
            setPendingAddressId(selectedAddressId || addressList[0]?._id || null);
            if (isEdit || addressList.length === 0) {
                setMode('form');
            } else {
                setMode('select');
                setEditingAddress(null);
            }
        }
    }, [isEdit, addressList, open, selectedAddressId]);

    useEffect(() => {
        if (!pendingAddressId) return;
        const stillExists = addressList.some((addr) => addr._id === pendingAddressId);
        if (!stillExists) {
            setPendingAddressId(addressList[0]?._id || null);
        }
    }, [addressList, pendingAddressId]);

    const handleDeleteAddress = async (addr) => {
        const addressId = addr?._id || addr?.id;
        if (!addressId) return;

        const confirmed = window.confirm('Delete this address? This cannot be undone.');
        if (!confirmed) return;

        try {
            setDeletingAddressId(addressId);

            if (allowGuest && (!user || !user.uid)) {
                if (pendingAddressId === addressId) {
                    const nextId = addressList.find((item) => item._id !== addressId)?._id || null;
                    setPendingAddressId(nextId);
                }
                toast.success('Address deleted');
                onAddressDeleted?.(addressId);
                return;
            }

            const token = await getToken();
            await axios.delete(`/api/address/${encodeURIComponent(String(addressId))}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (pendingAddressId === addressId) {
                const nextId = addressList.find((item) => item._id !== addressId)?._id || null;
                setPendingAddressId(nextId);
            }

            dispatch(fetchAddress({ getToken }));
            toast.success('Address deleted');
            onAddressDeleted?.(addressId);
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to delete address');
        } finally {
            setDeletingAddressId(null);
        }
    };

    // Prefill when editing or reset when adding new
    useEffect(() => {
        const addressToEdit = editingAddress || initialAddress;
        if ((isEdit || editingAddress) && addressToEdit) {
            const streetParts = splitAddressStreetLine(addressToEdit.street || '');
            // Extract phone number without country code if present
            let phoneNumber = addressToEdit.phone || '';
            // If phone starts with +, remove country code part
            if (phoneNumber.startsWith('+')) {
                // Remove country code (everything before the actual number)
                phoneNumber = phoneNumber.replace(/^\+\d+/, '').trim();
            }
            
            setAddress({
                id: addressToEdit.id || addressToEdit._id || null,
                name: addressToEdit.name || '',
                email: addressToEdit.email || '',
                street: addressToEdit.street || '',
                buildingOrVilla: addressToEdit.buildingOrVilla || streetParts.buildingOrVilla,
                streetName: addressToEdit.streetName || streetParts.streetName,
                apartmentOrFloor: addressToEdit.apartmentOrFloor || streetParts.apartmentOrFloor,
                city: addressToEdit.city || '',
                state: addressToEdit.state || '',
                district: addressToEdit.district || '',
                zip: addressToEdit.zip || '',
                country: 'United Arab Emirates',
                phone: phoneNumber,
                phoneCode: addressToEdit.phoneCode || '+971',
                alternatePhone: addressToEdit.alternatePhone || '',
                alternatePhoneCode: addressToEdit.alternatePhoneCode || addressToEdit.phoneCode || '+971',
            })
        } else if (!isEdit && !editingAddress) {
            // Reset form when adding new address
            setAddress({
                name: '',
                email: '',
                street: '',
                buildingOrVilla: '',
                streetName: '',
                apartmentOrFloor: '',
                city: '',
                state: '',
                district: '',
                zip: '',
                country: 'United Arab Emirates',
                phone: '',
                phoneCode: '+971',
                alternatePhone: '',
                alternatePhoneCode: '+971',
                id: null,
            })
            setAreaError('')
        }
    }, [isEdit, initialAddress, editingAddress])

    const countries = [
        { name: 'United Arab Emirates', code: '+971' },
        { name: 'India', code: '+91' },
        { name: 'Saudi Arabia', code: '+966' },
        { name: 'Qatar', code: '+974' },
        { name: 'Kuwait', code: '+965' },
        { name: 'Bahrain', code: '+973' },
        { name: 'Oman', code: '+968' },
        { name: 'Pakistan', code: '+92' },
    ];

    const handleAddressChange = (e) => {
        const { name, value } = e.target
        if (name === 'country') {
            const selectedCountry = countries.find(c => c.name === value)
            setAddress({
                ...address,
                country: value,
                state: '',
                district: '',
                zip: '',
                phoneCode: selectedCountry?.code || '+971',
            })
            setPincodeError('')
        } else if (name === 'state') {
            setAddress({
                ...address,
                state: value,
                district: '',
            })
            setAreaError('')
        } else if (['buildingOrVilla', 'streetName', 'apartmentOrFloor'].includes(name)) {
            const next = { ...address, [name]: value };
            setAddress({ ...next, street: composeAddressStreetLine(next) });
        } else {
            setAddress({
                ...address,
                [name]: value
            })
            if (name === 'district') {
                setAreaError('')
            }
        }
    }

    // Fetch pincode details from API
    const handlePincodeSearch = async (e) => {
        const rawValue = e.target.value;
        const pincode = address.country === 'India'
            ? rawValue.replace(/\D/g, '').slice(0, 6)
            : rawValue.slice(0, 12);

        setAddress({
            ...address,
            zip: pincode
        });

        if (address.country !== 'India') {
            setPincodeError('');
            return;
        }
        
        if (!pincode || pincode.length < 6) {
            setPincodeError('');
            return;
        }

        setPincodeLoading(true);
        setPincodeError('');
        
        try {
            // Using India Post API for pincode lookup
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await response.json();
            
            if (data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
                const postOffice = data[0].PostOffice[0];
                
                // Auto-fill city, state, and district
                setAddress(prev => ({
                    ...prev,
                    city: postOffice.Block || postOffice.District || prev.city,
                    state: postOffice.State || prev.state,
                    district: postOffice.District || prev.district,
                    zip: pincode
                }));
                setPincodeError('');
            } else {
                setPincodeError('Pincode not found. Please enter a valid pincode.');
            }
        } catch (error) {
            console.error('Pincode fetch error:', error);
            setPincodeError('Unable to fetch pincode details. Please enter manually.');
        } finally {
            setPincodeLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const isGuestSave = allowGuest && (!user || !user.uid);
            if (!isGuestSave && (!user || !user.uid)) {
                toast.error('User not authenticated. Please sign in again.');
                return;
            }

            if (isGuestSave && !String(address.email || '').trim()) {
                toast.error('Please enter your email address.');
                return;
            }

            // Clean and validate phone number
            const cleanedPhone = address.phone.replace(/[^0-9]/g, '');
            
            if (!isValidPhoneNumber(cleanedPhone, address.phoneCode)) {
                toast.error(getPhoneInputError(cleanedPhone, address.phoneCode) || getPhoneValidationMessage(address.phoneCode));
                return;
            }

            const normalizedZip = String(address.zip || '').replace(/\s/g, '');
            if (normalizedZip && /^0+$/.test(normalizedZip)) {
                toast.error('Please enter a valid pincode. All-zero values are not allowed.');
                return;
            }

            if ((address.country || 'United Arab Emirates') === 'India') {
                if (!/^[1-9][0-9]{5}$/.test(normalizedZip)) {
                    toast.error('Please enter a valid 6-digit Indian pincode.');
                    return;
                }
            }

            const addressForValidation = {
                ...address,
                country: 'United Arab Emirates',
                zip: normalizedZip,
                phone: cleanedPhone,
            };
            const validationError = validateAddressPayload(addressForValidation);
            if (validationError) {
                if (validationError.field === 'district') {
                    setAreaError(validationError.message);
                }
                toast.error(validationError.message);
                return;
            }
            
            const token = isGuestSave ? null : await getToken()
            
            // Prepare address data with userId from authenticated user
            const addressData = {
                ...address,
                country: 'United Arab Emirates',
                street: composeAddressStreetLine(address),
                phone: cleanedPhone,
            };
            if (!isGuestSave) {
                addressData.userId = user.uid;
            }
            addressData.city = resolveAddressCity(address);
            addressData.zip = normalizedZip;
            delete addressData.alternatePhone;
            delete addressData.alternatePhoneCode;
            
            if (!addressData.zip || addressData.zip.trim() === '') {
                delete addressData.zip
            }

            if (isGuestSave) {
                const localAddress = {
                    ...addressData,
                    _id: addressData.id || `guest-${Date.now().toString(36)}`,
                    id: addressData.id || undefined,
                };
                localAddress.id = localAddress._id;

                if ((isEdit || editingAddress) && addressData.id) {
                    toast.success('Address updated');
                    onAddressUpdated?.(localAddress);
                } else {
                    toast.success('Address saved');
                    onAddressAdded?.(localAddress);
                }
            } else if (isEdit && addressData.id) {
                delete addressData.buildingOrVilla;
                delete addressData.streetName;
                delete addressData.apartmentOrFloor;
                const { data } = await axios.put('/api/address', { id: addressData.id, address: addressData }, { headers: { Authorization: `Bearer ${token}` } })
                toast.success(data.message || 'Address updated')
                if (onAddressUpdated) {
                    onAddressUpdated(data.updated)
                }
            } else {
                delete addressData.buildingOrVilla;
                delete addressData.streetName;
                delete addressData.apartmentOrFloor;
                const { data } = await axios.post('/api/address', {address: addressData}, {headers: { Authorization: `Bearer ${token}` } })
                dispatch(addAddress(data.newAddress))
                // Immediately refresh address list in Redux after adding
                dispatch(fetchAddress({ getToken }))
                toast.success(data.message)
                if (onAddressAdded) {
                    onAddressAdded(data.newAddress);
                }
            }
            setAreaError('')
            setShowAddressModal(false)
            // Reset form state after save
            setAddress({
                name: '',
                email: '',
                street: '',
                buildingOrVilla: '',
                streetName: '',
                apartmentOrFloor: '',
                city: '',
                state: '',
                district: '',
                zip: '',
                country: 'United Arab Emirates',
                phone: '',
                phoneCode: '+971',
                alternatePhone: '',
                alternatePhoneCode: '+971',
                id: null,
            })
        } catch (error) {
            console.log(error)
            const message = error?.response?.data?.error || error?.response?.data?.message || error.message
            if (!/too many requests|rate limit|slow down/i.test(String(message || ''))) {
                toast.error(message)
            }
        }
    }

    if (!open) return null;

    const handleConfirmSelection = () => {
        if (!pendingAddressId) {
            toast.error('Please choose a delivery address');
            return;
        }
        if (onSelectAddress) {
            onSelectAddress(pendingAddressId);
        }
        setShowAddressModal(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-950/55 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => setShowAddressModal(false)}
            role="presentation"
        >
            <div
                className="my-0 flex h-[92dvh] max-h-[92dvh] w-full min-h-0 max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/60 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:my-8 sm:h-[min(92dvh,760px)] sm:max-w-2xl sm:rounded-[24px]"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="address-modal-title"
            >
                {/* Header */}
                <div className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-3 sm:px-6 sm:py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                                Delivery
                            </span>
                            <h2 id="address-modal-title" className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:mt-2 sm:text-2xl">
                                {mode === 'select' ? 'Choose delivery address' : (isEdit || editingAddress ? 'Update address' : 'Add new address')}
                            </h2>
                            <p className="mt-0.5 text-xs leading-snug text-slate-500 sm:mt-1 sm:text-sm sm:leading-relaxed">
                                {mode === 'select'
                                    ? 'Pick where your order should be delivered.'
                                    : 'Where should we deliver?'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAddressModal(false)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 sm:h-10 sm:w-10"
                            aria-label="Close"
                        >
                            <XIcon size={18} />
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {mode === 'select' ? (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
                                <div className="mb-2 flex items-center justify-between gap-3 sm:mb-4">
                                    <h3 className="text-sm font-semibold text-slate-800">Saved addresses</h3>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                        {addressList.length}
                                    </span>
                                </div>

                                {addressList.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                                        <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-3 text-sm font-medium text-slate-700">No saved addresses yet</p>
                                        <p className="mt-1 text-sm text-slate-500">Add your first delivery address to continue.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {addressList.map((addr) => {
                                            const isSelected = pendingAddressId === addr._id;
                                            const summary = formatAddressSummary(addr);

                                            return (
                                                <div
                                                    key={addr._id}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-pressed={isSelected}
                                                    className={`w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-all ${
                                                        isSelected
                                                            ? 'border-[#c4b8fd] bg-[#f5f3ff]'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                    onClick={() => setPendingAddressId(addr._id)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter' || event.key === ' ') {
                                                            event.preventDefault();
                                                            setPendingAddressId(addr._id);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                                            isSelected ? 'border-[#a78bfa] bg-[#a78bfa]' : 'border-slate-300 bg-white'
                                                        }`}>
                                                            {isSelected ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : null}
                                                        </div>
                                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                                                            {addr.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setEditingAddress(addr);
                                                                setMode('form');
                                                            }}
                                                            aria-label={`Edit address for ${addr.name}`}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={deletingAddressId === addr._id}
                                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleDeleteAddress(addr);
                                                            }}
                                                            aria-label={deletingAddressId === addr._id ? 'Deleting address' : `Delete address for ${addr.name}`}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    {summary ? (
                                                        <p className="mt-1 line-clamp-2 pl-6 text-xs leading-4 text-slate-600">{summary}</p>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                                    onClick={() => {
                                        setEditingAddress(null);
                                        setMode('form');
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add new address
                                </button>
                            </div>

                            <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
                                <button
                                    type="button"
                                    onClick={handleConfirmSelection}
                                    disabled={!pendingAddressId}
                                    className="w-full rounded-xl bg-[#C8F404] py-3.5 text-sm font-bold text-[#05090D] transition hover:bg-[#ADD300] disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    Deliver to this address
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Address Form */
                        <form onSubmit={e => toast.promise(handleSubmit(e), { loading: 'Adding Address...' })} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
                    <div className="grid gap-3">
                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                        <h3 className="text-sm font-bold text-slate-900">Contact</h3>

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Full name</label>
                        <input 
                            name="name" 
                            onChange={handleAddressChange} 
                            value={address.name} 
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-2 focus:ring-[#fde7c2]" 
                            type="text" 
                            placeholder="Name" 
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
                        <input 
                            name="email" 
                            onChange={handleAddressChange} 
                            value={address.email} 
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-2 focus:ring-[#fde7c2]" 
                            type="email" 
                            placeholder="Email" 
                            required={allowGuest} 
                        />
                    </div>

                    <PhoneNumberField
                        id="address-phone"
                        label="Phone"
                        labelClassName="mb-1 block text-xs font-semibold text-slate-600"
                        phone={address.phone}
                        phoneCode={address.phoneCode}
                        onPhoneChange={(value) => setAddress((prev) => ({ ...prev, phone: value }))}
                        onPhoneCodeChange={handleAddressChange}
                        countryOptions={UAE_PHONE_CODE_OPTIONS}
                        inputKey={address.id || 'new'}
                        showHint={false}
                        selectClassName="min-w-[72px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-sm font-medium text-slate-700 outline-none"
                        inputClassName="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-2 focus:ring-[#fde7c2]"
                    />
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                        <h3 className="text-sm font-bold text-slate-900">Address</h3>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Building or villa <span className="text-red-600" aria-hidden="true">*</span>
                            </label>
                            <input
                                name="buildingOrVilla"
                                onChange={handleAddressChange}
                                value={address.buildingOrVilla}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-2 focus:ring-[#fde7c2]"
                                type="text"
                                placeholder="Building or villa"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Apartment or floor (optional)</label>
                        <input
                            name="apartmentOrFloor"
                            onChange={handleAddressChange}
                            value={address.apartmentOrFloor}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-2 focus:ring-[#fde7c2]"
                            type="text"
                            placeholder="Apartment or floor"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Street name <span className="text-red-600" aria-hidden="true">*</span>
                        </label>
                        <input
                            name="streetName"
                            onChange={handleAddressChange}
                            value={address.streetName}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-2 focus:ring-[#fde7c2]"
                            type="text"
                            placeholder="Street name"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">{isUaeCountry(address.country) ? 'Emirate' : 'State'}</label>
                        {(address.country === 'India' || isUaeCountry(address.country)) ? (
                            <SearchableSelect
                                value={address.state}
                                onChange={(value) => setAddress({ ...address, state: value, district: '' })}
                                options={isUaeCountry(address.country) ? UAE_EMIRATES : indianStates}
                                placeholder={isUaeCountry(address.country) ? 'Select emirate' : 'Select state'}
                                triggerClassName="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 outline-none"
                                searchPlaceholder={isUaeCountry(address.country) ? 'Search emirate...' : 'Search state...'}
                                emptyMessage="No matches found"
                                required
                            />
                        ) : (
                            <input
                                name="state"
                                onChange={handleAddressChange}
                                value={address.state}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-2 focus:ring-[#fde7c2]"
                                type="text"
                                placeholder="State or region"
                                required
                            />
                        )}
                    </div>

                    {isUaeCountry(address.country) && address.state ? (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Area</label>
                            <SearchableSelect
                                value={address.district}
                                onChange={(value) => {
                                    setAreaError('');
                                    setAddress({ ...address, district: value });
                                }}
                                options={getUaeAreaOptionsForEmirate(address.state, address.district)}
                                placeholder="Select area"
                                triggerClassName="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 outline-none"
                                searchPlaceholder="Search area..."
                                emptyMessage="No areas found"
                                allowCustomValue
                                formatCustomOption={(area) => `Use "${area}"`}
                                hasError={Boolean(areaError)}
                                required
                            />
                            {areaError ? (
                                <p className="mt-1 text-xs font-medium text-red-600">{areaError}</p>
                            ) : null}
                        </div>
                    ) : !isUaeCountry(address.country) ? (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Area</label>
                            <input 
                                name="district" 
                                onChange={handleAddressChange} 
                                value={address.district} 
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-2 focus:ring-[#fde7c2]" 
                                type="text" 
                                placeholder="Area or district" 
                                required 
                            />
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Country</label>
                        <input
                            type="text"
                            value="United Arab Emirates"
                            readOnly
                            aria-readonly="true"
                            className="w-full cursor-default rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 outline-none"
                        />
                        <input type="hidden" name="country" value="United Arab Emirates" />
                    </div>
                    </div>

                    <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-2 grid grid-cols-1 gap-3 border-t border-slate-100 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:mt-2 sm:grid-cols-2 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:backdrop-blur-none min-[360px]:grid-cols-2">
                        <button 
                            type="submit"
                            className="w-full rounded-xl bg-[#E52721] py-3 text-sm font-semibold text-white transition hover:bg-[#C41F1A]"
                        >
                            {isEdit || editingAddress ? 'Save changes' : 'Save address'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                if (mode === 'form' && addressList.length > 0 && !isEdit) {
                                    setEditingAddress(null);
                                    setMode('select');
                                } else {
                                    setShowAddressModal(false);
                                }
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            {mode === 'form' && addressList.length > 0 && !isEdit ? 'Back' : 'Cancel'}
                        </button>
                    </div>
                    </div>
                </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AddressModal