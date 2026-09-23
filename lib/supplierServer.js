import mongoose from 'mongoose';
import Product from '@/models/Product';
import Supplier from '@/models/Supplier';
import { isSupplierId } from '@/lib/supplierHelpers';

export function storeIdMatch(storeId) {
  const keys = [storeId, String(storeId || '').trim()].filter(Boolean);
  if (isSupplierId(String(storeId))) {
    keys.push(new mongoose.Types.ObjectId(String(storeId)));
  }
  return { $in: keys };
}

export function collectSupplierIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item?._id || item?.id || item || '').trim()).filter(Boolean);
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value.supplierIds)) return collectSupplierIds(value.supplierIds);
    const single = String(value._id || value.id || value.supplierId || '').trim();
    return single ? [single] : [];
  }
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'none') return [];
  if (raw.startsWith('[')) {
    try {
      return collectSupplierIds(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

export async function resolveStoreSupplier(storeId, supplierId) {
  const id = String(supplierId || '').trim();
  if (!isSupplierId(id) || !storeId) return null;

  const supplier = await Supplier.findById(id).lean();
  if (!supplier) return null;

  const supplierStore = String(supplier.storeId || '').trim();
  const wanted = String(storeId || '').trim();
  if (supplierStore && wanted && supplierStore !== wanted) {
    return null;
  }
  return supplier;
}

export async function resolveProductSupplierFields(storeId, supplierId) {
  const unique = [...new Set(collectSupplierIds(supplierId).filter(isSupplierId))];
  if (!unique.length) {
    return {
      supplierId: null,
      supplierName: '',
      supplierIds: [],
      supplierNames: [],
    };
  }

  const resolved = [];
  for (const id of unique) {
    const supplier = await resolveStoreSupplier(storeId, id);
    if (!supplier) {
      throw new Error('Choose a supplier from the existing list');
    }
    resolved.push({
      id: supplier._id,
      name: String(supplier.name || '').trim(),
    });
  }

  return {
    supplierId: resolved[0].id,
    supplierName: resolved[0].name,
    supplierIds: resolved.map((item) => item.id),
    supplierNames: resolved.map((item) => item.name),
  };
}

export async function setProductsSupplierId(storeId, productIds, supplierId) {
  const fields = await resolveProductSupplierFields(storeId, supplierId);
  const ids = (Array.isArray(productIds) ? productIds : [])
    .map((id) => String(id || '').trim())
    .filter((id) => isSupplierId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!ids.length) return fields;

  await Product.collection.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        supplierId: fields.supplierId,
        supplierName: fields.supplierName,
        supplierIds: fields.supplierIds,
        supplierNames: fields.supplierNames,
      },
    },
  );

  return fields;
}
