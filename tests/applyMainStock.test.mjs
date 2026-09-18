import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMainStockToProduct,
  applyPreviewNewStock,
  applyPreviewVariantStock,
  applyStockUpdateToProduct,
  decodeProductName,
  describeMainStockChange,
} from '../lib/applyMainStock.js';

test('decodes HTML entities in product names', () => {
  assert.equal(
    decodeProductName('Heated Shiatsu Massager – Neck&amp;Back Relief'),
    'Heated Shiatsu Massager – Neck&Back Relief',
  );
});

test('bundle packs share the new unit stock and show auto-calculated packs', () => {
  const product = {
    name: 'Heated Shiatsu Massager – Neck&amp;Back Relief',
    sku: 'ST4014',
    stockQuantity: 10,
    hasVariants: true,
    variants: [
      { sku: 'ST4014-1', stock: 29966, options: { bundleQty: 1, title: 'Buy 1' } },
      { sku: 'ST4014-2', stock: 29966, options: { bundleQty: 2, title: 'Bundle of 2' } },
    ],
  };

  const preview = describeMainStockChange(product, 20);
  assert.equal(preview.name, 'Heated Shiatsu Massager – Neck&Back Relief');
  assert.equal(preview.currentStock, 29966);
  assert.equal(preview.newStock, 20);
  assert.equal(preview.hasBundle, true);
  assert.equal(preview.variants.length, 2);
  assert.equal(preview.variants[0].label, 'Buy 1');
  assert.equal(preview.variants[0].newStock, 20);
  assert.equal(preview.variants[0].newPacks, 20);
  assert.equal(preview.variants[1].newPacks, 10);

  applyMainStockToProduct(product, 20);
  assert.equal(product.stockQuantity, 20);
  assert.equal(product.variants[0].stock, 20);
  assert.equal(product.variants[1].stock, 20);
  assert.equal(product.inStock, true);
});

test('regular variants appear on the preview row and receive the new stock', () => {
  const product = {
    name: 'Phone Case',
    sku: 'ST1001',
    hasVariants: true,
    variants: [
      { sku: 'ST1001-R', stock: 4, options: { color: 'Red' } },
      { sku: 'ST1001-B', stock: 7, options: { color: 'Blue' } },
    ],
  };

  const preview = describeMainStockChange(product, 0);
  assert.equal(preview.currentStock, 11);
  assert.equal(preview.newStock, 0);
  assert.equal(preview.variants[0].label, 'Red');
  assert.equal(preview.variants[0].sku, 'ST1001-R');
  assert.equal(preview.variants[1].currentStock, 7);
  assert.equal(preview.variants[1].newStock, 0);

  applyMainStockToProduct(product, 0);
  assert.equal(product.variants[0].stock, 0);
  assert.equal(product.inStock, false);
});

test('preview New edits update bundle packs together and regular variants separately', () => {
  const bundleRow = describeMainStockChange({
    sku: 'ST4014',
    hasVariants: true,
    variants: [
      { sku: 'ST4014-1', stock: 29966, options: { bundleQty: 1, title: 'Buy 1' } },
      { sku: 'ST4014-2', stock: 29966, options: { bundleQty: 2, title: 'Bundle of 2' } },
    ],
  }, 0);
  const nextBundle = applyPreviewVariantStock(bundleRow, 1, 10);
  assert.equal(nextBundle.newStock, 20);
  assert.equal(nextBundle.variants[0].newStock, 20);
  assert.equal(nextBundle.variants[1].newPacks, 10);

  const variantRow = applyPreviewNewStock({
    hasBundle: false,
    newStock: 0,
    variants: [
      { index: 0, newStock: 0, isBundle: false },
      { index: 1, newStock: 0, isBundle: false },
    ],
  }, 8);
  const nextVariant = applyPreviewVariantStock(variantRow, 1, 3);
  assert.equal(nextVariant.newStock, 8);
  assert.equal(nextVariant.variants[0].newStock, 8);
  assert.equal(nextVariant.variants[1].newStock, 3);
});

test('confirm applies per-variant New values for regular variants', () => {
  const product = {
    stockQuantity: 11,
    hasVariants: true,
    variants: [
      { sku: 'ST1001-R', stock: 4, options: { color: 'Red' } },
      { sku: 'ST1001-B', stock: 7, options: { color: 'Blue' } },
    ],
  };

  applyStockUpdateToProduct(product, {
    stockQuantity: 0,
    variants: [
      { index: 0, stock: 2 },
      { index: 1, stock: 0 },
    ],
  });
  assert.equal(product.stockQuantity, 0);
  assert.equal(product.variants[0].stock, 2);
  assert.equal(product.variants[1].stock, 0);
  assert.equal(product.inStock, true);
});

test('variant products collapse bundle packs into one row per option', () => {
  const preview = describeMainStockChange({
    name: 'VoltMate',
    sku: 'ST40466',
    hasVariants: true,
    variants: [
      { sku: 'ST40466', stock: 49680, options: { title: 'Single Battery · Bundle 1', bundleQty: 1 } },
      { sku: 'ST40466', stock: 49966, options: { title: 'Single Battery · Bundle of 2', bundleQty: 2 } },
      { sku: 'ST40466', stock: 49770, options: { title: 'Single Battery · Bundle of 3', bundleQty: 3 } },
      { sku: 'ST40466-D', stock: 49772, options: { title: 'Double Battery · Bundle 1', bundleQty: 1 } },
      { sku: 'ST40466-D', stock: 49966, options: { title: 'Double Battery · Bundle of 2', bundleQty: 2 } },
      { sku: 'ST40466-D', stock: 49888, options: { title: 'Double Battery · Bundle of 3', bundleQty: 3 } },
    ],
  }, 2);

  assert.equal(preview.variants.length, 2);
  assert.equal(preview.variants[0].label, 'Single Battery');
  assert.equal(preview.variants[1].label, 'Double Battery');
  assert.equal(preview.variants[0].isFamilyRow, true);
  assert.deepEqual(preview.variants[0].indexes, [0, 1, 2]);
  assert.equal(preview.variants[0].newStock, 2);
  assert.equal(preview.currentStock, 49680 + 49772);
});
