function cleanText(value) {
  return String(value || '').trim();
}

export function composeAddressStreetLine(parts = {}) {
  return [
    parts.buildingOrVilla,
    parts.streetName,
    parts.apartmentOrFloor,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(', ');
}

export function splitAddressStreetLine(street = '') {
  const parts = cleanText(street).split(',').map(cleanText).filter(Boolean);

  if (parts.length >= 2) {
    return {
      buildingOrVilla: parts[0],
      streetName: parts[1],
      apartmentOrFloor: parts.slice(2).join(', '),
    };
  }

  return {
    buildingOrVilla: '',
    streetName: parts[0] || '',
    apartmentOrFloor: '',
  };
}

export function hasCompleteAddressStreetLine(parts = {}) {
  return Boolean(cleanText(parts.buildingOrVilla) && cleanText(parts.streetName));
}
