import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCategoryNameSearch,
  buildOrderedPhraseRegex,
  buildProductBrowseSearchFilter,
  buildProductPhraseSearchFilter,
  buildProductSearchFilter,
  isBrowseStyleSearch,
  isMultiWordSearch,
  productTitleMatchesKeyword,
  rankProductsByTitleMatch,
} from '../lib/productSearch.js';

const PHRASE = "Women's Multi-Color Chunky Sole Fashion Sneakers";

test('treats a product title as one sentence, not separate words', () => {
  assert.equal(isMultiWordSearch(PHRASE), true);

  const regex = buildOrderedPhraseRegex(PHRASE);
  assert.ok(regex.test("Women's Multi-Color Chunky Sole Fashion Sneakers"));
  assert.ok(regex.test('Womens Multi Color Chunky Sole Fashion Sneakers'));
  assert.equal(regex.test('Fashion Sneakers'), false);
  assert.equal(regex.test('Women Color Pump'), false);
});

test('phrase filter only matches the title sentence, not word-AND across fields', () => {
  const filter = buildProductPhraseSearchFilter(PHRASE);
  assert.ok(filter.$or);
  assert.equal(JSON.stringify(filter).includes('"$and"'), false);
  assert.deepEqual(
    filter.$or.map((clause) => Object.keys(clause)[0]),
    ['name', 'nameAr', 'seoTitle', 'variants.name', 'variants.title'],
  );
});

test('full title ranks above products that only share some of the words', () => {
  const exact = { name: PHRASE, sku: 'A1' };
  const otherSneaker = { name: 'Men Colorblock Fashion Sneakers', sku: 'B2' };
  const colorPump = { name: "Women's Multi-Color Court Shoes", sku: 'C3' };

  const ranked = rankProductsByTitleMatch([otherSneaker, colorPump, exact], PHRASE);
  assert.equal(ranked[0].sku, 'A1');
});

test('title match requires the sentence in the name, not brand + leftover words', () => {
  assert.equal(
    productTitleMatchesKeyword({ name: PHRASE }, PHRASE),
    true,
  );
  assert.equal(
    productTitleMatchesKeyword(
      { name: 'Fashion Sneakers', brand: "Women's Multi-Color Chunky Sole" },
      PHRASE,
    ),
    false,
  );
  assert.equal(
    productTitleMatchesKeyword({ name: 'Air Pump', brand: 'Fashion' }, PHRASE),
    false,
  );
});

test('word fallback stays in the product title when there is no phrase hit', () => {
  const filter = buildProductSearchFilter('chunky sole sneakers');
  assert.ok(JSON.stringify(filter).includes('"$and"'));
  assert.equal(
    productTitleMatchesKeyword({ name: 'Pink Chunky Sole Fashion Sneakers' }, 'chunky sole sneakers'),
    true,
  );
});

test('short category searches match name, word, tags, and categories', () => {
  assert.equal(isBrowseStyleSearch('car accessories'), true);
  assert.equal(isBrowseStyleSearch('computer accessories'), true);
  assert.equal(isBrowseStyleSearch(PHRASE), false);

  const filter = JSON.stringify(buildProductBrowseSearchFilter('car accessories', {
    categoryIds: ['cat-car'],
  }));
  assert.match(filter, /"tags"/);
  assert.match(filter, /"category"/);
  assert.match(filter, /cat-car/);

  const categoryQuery = buildCategoryNameSearch('computer accessories');
  assert.ok(categoryQuery.$or.some((clause) => clause.name?.test?.('Computer Accessories')));
  assert.ok(categoryQuery.$or.some((clause) => clause.name?.test?.('Laptops & Computers')));

  assert.equal(
    productTitleMatchesKeyword({ name: 'Magnetic Phone Holder', tags: ['car accessories'] }, 'car accessories'),
    true,
  );
  assert.equal(
    productTitleMatchesKeyword({ name: 'USB Hub', category: 'Computer Accessories' }, 'computer accessories'),
    true,
  );
});
