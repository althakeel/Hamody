import test from 'node:test';
import assert from 'node:assert/strict';
import { explicitVariantStock, resolveProductUpdatePricing } from '../lib/productSaveGuards.js';

test('a typed variant stock of 0 stays 0 when the product quantity is higher', () => {
  assert.equal(explicitVariantStock(0, 10), 0);
  assert.equal(explicitVariantStock('', 10), 10);

  const result = resolveProductUpdatePricing({
    existing: {
      price: 119,
      AED: 170,
      stockQuantity: 20,
      hasVariants: true,
      variants: [
        { sku: 'GRAY', stock: 10, price: 119, AED: 170, options: { color: 'Gray' } },
        { sku: 'BLACK', stock: 10, price: 119, AED: 170, options: { color: 'Black' } },
      ],
    },
    body: {
      hasVariants: true,
      stockQuantity: 20,
      price: 119,
      AED: 170,
      attributes: { variantType: 'variants' },
      variants: [
        { sku: 'GRAY', stock: 10, price: 119, AED: 170, options: { color: 'Gray' } },
        { sku: 'BLACK', stock: 0, price: 119, AED: 170, options: { color: 'Black' } },
      ],
    },
    canChangePrice: true,
  });

  assert.equal(result.variants[0].stock, 10);
  assert.equal(result.variants[1].stock, 0);
});
