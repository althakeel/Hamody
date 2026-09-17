import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyWaslahTrackingPatches,
  getPickupOrderId,
  ordersMissingEmxAwb,
  resolvePickupTracking,
} from '../lib/storePickupExcelTracking.js';

const EMX_AWB = '1000046773599';
const WASLAH_PLATFORM = '62007200719360';

test('pickup Order ID uses the store short order number', () => {
  assert.equal(getPickupOrderId({ shortOrderNumber: 618681 }), '618681');
  assert.equal(getPickupOrderId({ displayOrderNumber: '523304' }), '523304');
  assert.equal(getPickupOrderId({ _id: '64f1a2b3c4d5e6f7a8b9c0d1' }), '');
});

test('Courier Reference is the EMX barcode, not the Waslah 62 number', () => {
  assert.equal(resolvePickupTracking({
    trackingId: WASLAH_PLATFORM,
    waslah: { trackingNumber: WASLAH_PLATFORM, emxTrackingNumber: EMX_AWB },
  }), EMX_AWB);

  assert.equal(resolvePickupTracking({
    trackingId: WASLAH_PLATFORM,
    waslah: { trackingNumber: WASLAH_PLATFORM },
  }), '');

  assert.equal(resolvePickupTracking({
    trackingId: EMX_AWB,
  }), EMX_AWB);
});

test('orders missing EMX AWB are the ones still waiting after send', () => {
  const waiting = {
    _id: '64f1a2b3c4d5e6f7a8b9c0d1',
    trackingId: WASLAH_PLATFORM,
    waslah: { orderId: 'wl-1', trackingNumber: WASLAH_PLATFORM },
  };
  const ready = {
    _id: '64f1a2b3c4d5e6f7a8b9c0d2',
    waslah: { orderId: 'wl-2', emxTrackingNumber: EMX_AWB },
  };
  const notSent = { _id: '64f1a2b3c4d5e6f7a8b9c0d3', status: 'PROCESSING' };

  const missing = ordersMissingEmxAwb([waiting, ready, notSent]);
  assert.equal(missing.length, 1);
  assert.equal(missing[0]._id, waiting._id);
});

test('live Waslah patch fills Courier Reference after EMX assigns the AWB', () => {
  const order = {
    _id: '64f1a2b3c4d5e6f7a8b9c0d1',
    shortOrderNumber: 40066,
    trackingId: WASLAH_PLATFORM,
    waslah: { orderId: 'wl-1', trackingNumber: WASLAH_PLATFORM },
  };

  assert.equal(resolvePickupTracking(order), '');

  const [updated] = applyWaslahTrackingPatches([order], [{
    _id: order._id,
    trackingId: EMX_AWB,
    waslah: { emxTrackingNumber: EMX_AWB, trackingNumber: WASLAH_PLATFORM },
  }]);

  assert.equal(getPickupOrderId(updated), '40066');
  assert.equal(resolvePickupTracking(updated), EMX_AWB);
});
