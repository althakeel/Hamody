const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateOnly(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseNonNegativeNumber(value, label) {
  if (value === '' || value === null || value === undefined) return { value: 0 };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${label} must be a non-negative number` };
  }
  return { value: parsed };
}

export function normalizeMarketingExpenseInput(body = {}) {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Amount spent must be greater than 0' };
  }

  const startDate = String(body.startDate || '').trim();
  const startTime = String(body.startTime || '').trim();
  const endDate = String(body.endDate || '').trim();
  const endTime = String(body.endTime || '').trim();

  if (!isValidDateOnly(startDate)) return { error: 'Valid start date is required' };
  if (!TIME_PATTERN.test(startTime)) return { error: 'Valid start time is required' };
  if (endDate && !isValidDateOnly(endDate)) return { error: 'End date is invalid' };
  if (endDate && !TIME_PATTERN.test(endTime)) return { error: 'End time is required with an end date' };
  if (!endDate && endTime) return { error: 'End date is required with an end time' };

  if (endDate && `${endDate}T${endTime}` < `${startDate}T${startTime}`) {
    return { error: 'End date and time must be after the start date and time' };
  }

  const metricFields = [
    ['clicks', 'Clicks'],
    ['impressions', 'Impressions'],
    ['reach', 'Reach'],
    ['conversions', 'Conversions'],
  ];
  const metrics = {};
  for (const [field, label] of metricFields) {
    const result = parseNonNegativeNumber(body[field], label);
    if (result.error) return result;
    metrics[field] = result.value;
  }

  return {
    data: {
      campaignName: String(body.campaignName || '').trim(),
      campaignType: body.campaignType,
      platform: body.platform,
      amount,
      ...metrics,
      startDate,
      startTime,
      endDate: endDate || null,
      endTime,
      notes: String(body.notes || '').trim(),
    },
  };
}
