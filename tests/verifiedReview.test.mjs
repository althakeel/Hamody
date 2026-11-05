import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrderReviewIdentity,
  normalizeReviewEmail,
  orderContainsReviewProduct,
  reviewNamesMatch,
} from '../lib/verifiedReview.js';

test('review order matching supports ObjectId-like product references', () => {
  const productId = '507f1f77bcf86cd799439011';
  const order = {
    orderItems: [{ productId: { _id: productId } }],
  };

  assert.equal(orderContainsReviewProduct(order, productId), true);
  assert.equal(orderContainsReviewProduct(order, '507f1f77bcf86cd799439012'), false);
});

test('review order matching supports legacy item IDs', () => {
  const productId = '507f1f77bcf86cd799439011';
  assert.equal(orderContainsReviewProduct({ items: [{ id: productId }] }, productId), true);
});

test('review identity normalizes email and reads guest shipping details', () => {
  assert.deepEqual(
    getOrderReviewIdentity({
      guestName: '  Ahmed   Hassan ',
      guestEmail: 'AHMED@example.com ',
    }),
    { name: 'Ahmed   Hassan', email: 'ahmed@example.com' },
  );
  assert.equal(normalizeReviewEmail(' Sara@Example.com '), 'sara@example.com');
});

test('review name must match the verified order when one is available', () => {
  assert.equal(reviewNamesMatch('Sara Ali', ' sara  ali '), true);
  assert.equal(reviewNamesMatch('Sara Ali', 'Another Customer'), false);
  assert.equal(reviewNamesMatch('', 'Customer Name'), true);
});
