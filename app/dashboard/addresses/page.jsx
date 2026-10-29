"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import PageTitle from '@/components/PageTitle';
import { useAuth } from '@/lib/useAuth';
import {
  deleteDashboardAddress,
  loadDashboardAddresses,
  saveDashboardAddress,
} from '@/lib/dashboardAddresses';

const emptyAddress = (email = '') => ({
  name: '',
  email,
  street: '',
  district: '',
  city: '',
  state: '',
  zip: '',
  country: 'United Arab Emirates',
  phone: '',
  phoneCode: '+971',
});

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(() => emptyAddress());
  const router = useRouter();
  const { user, loading: authLoading, getToken } = useAuth();

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      const list = await loadDashboardAddresses({ getToken });
      setAddresses(list);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast.error(error?.message || 'Failed to load addresses');
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/sign-in');
      return;
    }
    fetchAddresses();
  }, [authLoading, fetchAddresses, router, user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    try {
      const data = await saveDashboardAddress({
        getToken,
        addressId: editingId || '',
        address: {
          ...formData,
          email: formData.email || user.email || '',
          phone: String(formData.phone || '').replace(/\D/g, ''),
        },
      });

      toast.success(data?.message || (editingId ? 'Address updated' : 'Address added'));
      setFormData(emptyAddress(user.email || ''));
      setShowForm(false);
      setEditingId(null);
      await fetchAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error(error?.message || 'Error saving address');
    }
  };

  const handleEdit = (address) => {
    setFormData({
      ...emptyAddress(user?.email || ''),
      name: address.name || '',
      email: address.email || user?.email || '',
      street: address.street || '',
      district: address.district || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zip || '',
      country: address.country || 'United Arab Emirates',
      phone: address.phone || '',
      phoneCode: address.phoneCode || '+971',
    });
    setEditingId(address._id);
    setShowForm(true);
  };

  const handleDelete = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const data = await deleteDashboardAddress({ getToken, addressId });
      toast.success(data?.message || 'Address deleted');
      await fetchAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error(error?.message || 'Error deleting address');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <PageTitle title="My Addresses" />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Addresses</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData(emptyAddress(user?.email || ''));
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Add Address
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                    handleInputChange({ target: { name: 'phone', value } });
                  }}
                  maxLength="15"
                  pattern="[0-9]{7,15}"
                  title="Phone number must be 7-15 digits"
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />

              <input
                type="text"
                name="street"
                placeholder="Street Address"
                value={formData.street}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />

              <input
                type="text"
                name="district"
                placeholder="Area / District"
                value={formData.district}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  name="zip"
                  placeholder="Postal Code"
                  value={formData.zip}
                  onChange={handleInputChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <input
                type="text"
                name="country"
                placeholder="Country"
                value={formData.country}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {editingId ? 'Update Address' : 'Add Address'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No addresses saved yet</p>
            {!showForm && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Add Your First Address
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div
                key={address._id}
                className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                  address.isDefault ? 'border-blue-600' : 'border-gray-200'
                }`}
              >
                <h3 className="font-bold text-lg text-gray-900">{address.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{address.phoneCode} {address.phone}</p>
                <p className="text-sm text-gray-600">{address.street}</p>
                {address.district ? <p className="text-sm text-gray-600">{address.district}</p> : null}
                <p className="text-sm text-gray-600">
                  {[address.city, address.state, address.zip].filter(Boolean).join(', ')}
                </p>
                {address.country ? <p className="text-sm text-gray-600">{address.country}</p> : null}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(address)}
                    className="flex-1 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address._id)}
                    className="flex-1 bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
