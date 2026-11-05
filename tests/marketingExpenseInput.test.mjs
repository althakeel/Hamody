import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMarketingExpenseInput } from '../lib/marketingExpenseInput.js';

test('marketing expense input keeps the selected time and positive amount', () => {
  const result = normalizeMarketingExpenseInput({
    campaignName: 'Evening campaign',
    campaignType: 'SALES',
    platform: 'FACEBOOK',
    amount: '125.50',
    startDate: '2026-11-05',
    startTime: '18:30',
    endDate: '2026-11-05',
    endTime: '22:00',
    clicks: '10',
  });

  assert.equal(result.error, undefined);
  assert.equal(result.data.amount, 125.5);
  assert.equal(result.data.startTime, '18:30');
  assert.equal(result.data.endTime, '22:00');
  assert.equal(result.data.clicks, 10);
});

test('marketing expense input requires a positive amount and start time', () => {
  assert.equal(normalizeMarketingExpenseInput({
    amount: '0',
    startDate: '2026-11-05',
    startTime: '10:00',
  }).error, 'Amount spent must be greater than 0');

  assert.equal(normalizeMarketingExpenseInput({
    amount: '10',
    startDate: '2026-11-05',
  }).error, 'Valid start time is required');
});

test('marketing expense input rejects an incomplete or reversed end time', () => {
  assert.equal(normalizeMarketingExpenseInput({
    amount: '10',
    startDate: '2026-11-05',
    startTime: '18:00',
    endDate: '2026-11-05',
  }).error, 'End time is required with an end date');

  assert.equal(normalizeMarketingExpenseInput({
    amount: '10',
    startDate: '2026-11-05',
    startTime: '18:00',
    endDate: '2026-11-05',
    endTime: '17:59',
  }).error, 'End date and time must be after the start date and time');
});
