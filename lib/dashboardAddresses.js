async function getAuthorizationHeaders(getToken) {
  const token = await getToken();
  if (!token) throw new Error('Please sign in to manage your addresses');
  return { Authorization: `Bearer ${token}` };
}

async function readJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || fallbackMessage);
  }
  return data;
}

export async function loadDashboardAddresses({ getToken, request = fetch }) {
  const headers = await getAuthorizationHeaders(getToken);
  const response = await request('/api/address', {
    method: 'GET',
    headers,
  });
  const data = await readJsonResponse(response, 'Failed to load addresses');
  return Array.isArray(data?.addresses) ? data.addresses : [];
}

export async function saveDashboardAddress({
  getToken,
  address,
  addressId = '',
  request = fetch,
}) {
  const authorization = await getAuthorizationHeaders(getToken);
  const response = await request('/api/address', {
    method: addressId ? 'PUT' : 'POST',
    headers: {
      ...authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(addressId ? { id: addressId, address } : { address }),
  });
  return readJsonResponse(response, addressId ? 'Failed to update address' : 'Failed to save address');
}

export async function deleteDashboardAddress({ getToken, addressId, request = fetch }) {
  const headers = await getAuthorizationHeaders(getToken);
  const response = await request(`/api/address/${encodeURIComponent(String(addressId))}`, {
    method: 'DELETE',
    headers,
  });
  return readJsonResponse(response, 'Failed to delete address');
}
