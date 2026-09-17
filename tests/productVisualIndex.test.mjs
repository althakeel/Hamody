import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyVisionPrior,
  cosineSimilarity,
  hashImageSource,
  inferProductFamily,
  mergeVisualAndKeywordProducts,
  normalizeEmbedding,
  rankVisualMatches,
  splitExactAndRelated,
} from '../lib/productVisualMath.js';

test('same image hash stays stable and changes with the URL', () => {
  assert.equal(hashImageSource('https://cdn.example/a.jpg'), hashImageSource('https://cdn.example/a.jpg'));
  assert.notEqual(hashImageSource('https://cdn.example/a.jpg'), hashImageSource('https://cdn.example/b.jpg'));
});

test('uses the closest photo among several product images', () => {
  const query = normalizeEmbedding([1, 0, 0]);
  const ranked = rankVisualMatches(query, [
    {
      productId: 'multi',
      embedding: [0.1, 0.99, 0],
      images: [{ embedding: [0.97, 0.1, 0] }],
    },
    { productId: 'single', embedding: [0.6, 0.8, 0] },
  ], { minScore: 0.1 });

  assert.equal(ranked[0].productId, 'multi');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('ranks the closest visual embedding first', () => {
  const query = normalizeEmbedding([1, 0, 0]);
  const ranked = rankVisualMatches(query, [
    { productId: 'far', embedding: [0.2, 0.98, 0] },
    { productId: 'near', embedding: [0.95, 0.05, 0] },
  ], { minScore: 0.1 });

  assert.equal(ranked[0].productId, 'near');
  assert.ok(ranked[0].score > ranked[1].score);
  assert.ok(cosineSimilarity(query, normalizeEmbedding([1, 0, 0])) > 0.99);
});

test('vision prior demotes electric scooters for a kick scooter photo', () => {
  const kickScore = applyVisionPrior(0.9, 'Adult Aluminum Kick Scooter', 'kick scooter');
  const electricScore = applyVisionPrior(0.9, 'Green Lion E-Scooter', 'kick scooter');
  assert.ok(kickScore > electricScore);
});

test('does not treat an air pump as the exact match for an oud burner photo', () => {
  assert.equal(inferProductFamily('Portable Electronic Oud Bukhoor Burner'), 'oud-burner');
  assert.equal(inferProductFamily('Green Lion Portable Electric Air Pump'), 'air-pump');

  const { exact, related } = splitExactAndRelated([
    { productId: 'pump', title: 'Green Lion Portable Electric Air Pump', score: 0.88 },
    { productId: 'grinder', title: 'LePresso Portable Manual Coffee Grinder', score: 0.84 },
    { productId: 'oud', title: 'Portable Electronic Oud Bukhoor Burner BK-18', score: 0.87 },
  ], { visionText: 'electronic oud bukhoor burner' });

  assert.deepEqual(exact.map((row) => row.productId), ['oud']);
  assert.equal(related.some((row) => row.productId === 'pump'), false);
  assert.ok(
    applyVisionPrior(0.88, 'Portable Electronic Oud Bukhoor Burner', 'oud burner')
    > applyVisionPrior(0.88, 'Green Lion Portable Electric Air Pump', 'oud burner'),
  );
});

test('splits close photo matches from related matches', () => {
  const { exact, related } = splitExactAndRelated([
    { productId: 'exact', score: 0.94 },
    { productId: 'nearMiss', score: 0.81 },
    { productId: 'related', score: 0.64 },
    { productId: 'weak', score: 0.4 },
  ]);
  assert.deepEqual(exact.map((row) => row.productId), ['exact']);
  assert.deepEqual(related.map((row) => row.productId), []);
});

test('visual matches stay ahead of keyword-only products', () => {
  const merged = mergeVisualAndKeywordProducts(
    [{ _id: 'visual-1' }],
    [{ _id: 'keyword-1' }, { _id: 'visual-1' }],
    8,
  );
  assert.deepEqual(merged.map((product) => product._id), ['visual-1', 'keyword-1']);
});
