import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGeminiVerdict,
  inferImageExcludes,
  imageQueryFamilyTerm,
  isGenericImageTerm,
  mergeVisionDescriptions,
  pickBestAndRecommended,
  productIsRelatedToImageQuery,
  productMatchesImageQuery,
  shouldSkipImageSearchJudge,
} from '../lib/imageSearch.js';

test('rejects generic image terms used alone', () => {
  assert.equal(isGenericImageTerm('phone holder'), true);
  assert.equal(isGenericImageTerm('folding'), true);
  assert.equal(isGenericImageTerm('magnetic wireless desk stand'), false);
});

test('kick scooter search does not accept folding tables or kickstands', () => {
  const query = {
    name: 'adult aluminum kick scooter',
    exclude: inferImageExcludes({ name: 'adult aluminum kick scooter', type: 'kick scooter' }),
  };
  assert.equal(productMatchesImageQuery({ name: 'Magnetic Power Bank with Kickstand' }, query), false);
  assert.equal(productMatchesImageQuery({ name: 'Green Lion Folding Basket' }, query), false);
  assert.equal(productMatchesImageQuery({ name: 'Porodo Lifestyle Outdoor Folding Table' }, query), false);
});

test('desk magnetic stands exclude car cup mounts', () => {
  const exclude = inferImageExcludes({
    name: 'magnetic magsafe desk phone stand',
    type: 'desk stand',
  });
  assert.ok(exclude.includes('car'));
  assert.ok(exclude.includes('cup'));
  assert.ok(inferImageExcludes({ name: 'magnetic wireless phone stand' }).includes('car'));
});

test('kick scooters do not match electric scooters', () => {
  const query = {
    name: 'adult aluminum kick scooter',
    exclude: inferImageExcludes({ name: 'adult aluminum kick scooter', type: 'kick scooter' }),
  };
  assert.ok(query.exclude.includes('electric'));
  assert.equal(productMatchesImageQuery({ name: 'Green Lion GBK-250 E-Scooter' }, query), false);
  assert.equal(productMatchesImageQuery({ name: 'Porodo Lifestyle City Scooter Pro Electric' }, query), false);
  assert.equal(productMatchesImageQuery({ name: 'Adult Aluminum Kick Scooter' }, query), true);
  assert.equal(productMatchesImageQuery({ name: 'Foldable Adult Scooter' }, query), true);
  assert.equal(productIsRelatedToImageQuery({ name: 'Porodo Lifestyle City Scooter Pro Electric' }, 'scooter'), true);
  assert.equal(productIsRelatedToImageQuery({ name: 'Green Lion Folding Basket' }, 'scooter'), false);
});

test('gemini picks a category best match and keeps other scooters recommended', () => {
  const scooters = [
    { _id: 'kick-1', name: 'Adult Aluminum Kick Scooter' },
    { _id: 'e-1', name: 'City Scooter Pro Electric' },
    { _id: 'kick-2', name: 'Foldable Adult Scooter' },
  ];
  const picked = pickBestAndRecommended(scooters, { exact: ['kick-1'], related: ['kick-2'] });
  assert.deepEqual(picked.products.map((product) => product._id), ['kick-1']);
  assert.ok(picked.relatedProducts.some((product) => product._id === 'e-1'));
  assert.ok(picked.relatedProducts.some((product) => product._id === 'kick-2'));

  const fallback = pickBestAndRecommended(scooters, { exact: [], related: [] });
  assert.equal(fallback.products[0]._id, 'kick-1');
  assert.equal(fallback.relatedProducts.length, 2);
});

test('a specific product name wins over a vague second description', () => {
  const merged = mergeVisionDescriptions(
    { provider: 'gemini', name: 'cordless turbo air blower', type: 'leaf blower', keywords: ['blower'] },
    { provider: 'openai', name: 'cordless electric tools', type: 'tools', keywords: ['cordless', 'electric'] },
  );
  assert.equal(merged.name, 'cordless turbo air blower');
  assert.equal(merged.type, 'leaf blower');
  assert.equal(merged.keywords.includes('tools'), false);
});

test('an air duster photo stays in the blower family', () => {
  assert.equal(imageQueryFamilyTerm({ name: 'cordless turbo air duster', type: 'air duster' }), 'blower');
  assert.equal(productIsRelatedToImageQuery({ name: 'Turbo Cordless Leaf Blower' }, 'blower'), true);
  assert.equal(productIsRelatedToImageQuery({ name: 'Porodo Lifestyle Cordless Turbo Air Duster' }, 'blower'), true);
  assert.equal(productIsRelatedToImageQuery({ name: 'Porodo Lifestyle Mini Massage Gun' }, 'blower'), false);
});

test('recommended products follow the photo category', () => {
  assert.equal(imageQueryFamilyTerm({ type: 'kick scooter', name: 'adult kick scooter' }), 'scooter');
  assert.equal(imageQueryFamilyTerm({ type: 'oud burner' }), 'oud');
  assert.equal(imageQueryFamilyTerm({ type: 'air pump' }), 'pump');
  assert.equal(imageQueryFamilyTerm({ type: 'bowl', name: 'salad bowl' }), 'bowl');
  assert.equal(imageQueryFamilyTerm({ type: 'coffee grinder' }), 'grinder');
  assert.equal(productIsRelatedToImageQuery({ name: 'Porodo Lifestyle City Scooter Pro Electric' }, 'scooter'), true);
  assert.equal(productIsRelatedToImageQuery({ name: 'Portable Silicone Luggage Tag' }, 'scooter'), false);
});

test('gemini verdict drops unrelated catalog products', () => {
  const judged = applyGeminiVerdict([
    { _id: 'bowl', name: 'Salad Bowl' },
    { _id: 'tag', name: 'Portable Silicone Luggage Tag' },
  ], { exact: ['bowl'], related: [] });
  assert.deepEqual(judged.products.map((product) => product._id), ['bowl']);
  assert.deepEqual(judged.relatedProducts, []);
});

test('air pump photo matches inflators and catalog pumps', () => {
  const query = {
    name: 'portable electric air pump',
    exclude: inferImageExcludes({ name: 'portable electric air pump', type: 'air pump' }),
  };
  assert.equal(productMatchesImageQuery({ name: 'Green Lion Portable Electric Air Pump' }, query), true);
  assert.equal(productMatchesImageQuery({ name: 'Nano Tire Inflator' }, query), true);
  assert.equal(productMatchesImageQuery({ name: 'Electronic Oud Bukhoor Burner' }, query), false);
  assert.equal(productIsRelatedToImageQuery({ name: 'Nano Tire Inflator' }, 'pump'), true);
});

test('oud burner search excludes air pumps', () => {
  const query = {
    name: 'electronic oud bukhoor burner',
    exclude: inferImageExcludes({ name: 'electronic oud bukhoor burner', type: 'oud burner' }),
  };
  assert.ok(query.exclude.includes('air pump'));
  assert.equal(productMatchesImageQuery({ name: 'Green Lion Portable Electric Air Pump' }, query), false);
  assert.equal(productMatchesImageQuery({ name: 'Portable Electronic Oud Bukhoor Burner BK-18' }, query), true);
});

test('car cup holders do not count as a match for a desk magnetic stand', () => {
  const query = {
    name: 'magnetic wireless desk phone stand',
    exclude: inferImageExcludes({ name: 'magnetic wireless desk phone stand', type: 'desk stand' }),
  };
  assert.equal(productMatchesImageQuery({ name: 'Adjustable Car Cup Holder Phone Mount' }, query), false);
  assert.equal(productMatchesImageQuery({ name: 'Magnetic Wireless Phone Stand' }, query), true);
  assert.equal(productMatchesImageQuery({ name: 'Porodo Lifestyle Hydrate Bottle' }, query), false);
});

test('the same catalog photo beats a lookalike', async () => {
  const { isSameCatalogPhoto } = await import('../lib/catalogPhotoMatch.js');
  assert.equal(isSameCatalogPhoto(6, 24), true);
  assert.equal(isSameCatalogPhoto(20, 24), false);
  assert.equal(isSameCatalogPhoto(6, 10), false);
  assert.equal(isSameCatalogPhoto(6, null), true);
  assert.equal(isSameCatalogPhoto(11, null), false);
});

test('skips the second Gemini pass only for a near-duplicate visual hit', () => {
  assert.equal(shouldSkipImageSearchJudge([{ score: 0.94 }]), true);
  assert.equal(shouldSkipImageSearchJudge([{ score: 0.81 }]), false);
  assert.equal(shouldSkipImageSearchJudge([]), false);
});
