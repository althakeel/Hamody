export const EMPTY_SUPPLIER = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  city: '',
  country: '',
  trn: '',
  notes: '',
  isActive: true,
};

export function normalizeSupplier(body = {}) {
  const name = String(body.name || '').trim();
  return {
    name,
    contactName: String(body.contactName || '').trim(),
    email: String(body.email || '').trim(),
    phone: String(body.phone || '').trim(),
    company: String(body.company || '').trim(),
    address: String(body.address || '').trim(),
    city: String(body.city || '').trim(),
    country: String(body.country || '').trim(),
    trn: String(body.trn || '').trim(),
    notes: String(body.notes || '').trim(),
    isActive: body.isActive !== false,
  };
}

export function isSupplierId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());
}

export function toStoreSupplier(doc = {}) {
  const id = String(doc._id || doc.id || '');
  return {
    id,
    _id: id,
    name: String(doc.name || ''),
    contactName: String(doc.contactName || ''),
    email: String(doc.email || ''),
    phone: String(doc.phone || ''),
    company: String(doc.company || ''),
    address: String(doc.address || ''),
    city: String(doc.city || ''),
    country: String(doc.country || ''),
    trn: String(doc.trn || ''),
    notes: String(doc.notes || ''),
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}
