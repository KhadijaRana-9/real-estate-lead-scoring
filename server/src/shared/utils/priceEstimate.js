const CITY_RATE_PER_MARLA = {
  islamabad: 3500000,
  lahore: 2800000,
  karachi: 2600000,
  rawalpindi: 2200000,
  faisalabad: 1800000,
};
const DEFAULT_RATE_PER_MARLA = 1500000;

const BEDROOM_PREMIUM = 300000;
const BATHROOM_PREMIUM = 150000;

function estimatePrice({ city, area, bedrooms = 0, bathrooms = 0 }) {
  const normalizedCity = (city || '').trim().toLowerCase();
  const ratePerMarla = CITY_RATE_PER_MARLA[normalizedCity] ?? DEFAULT_RATE_PER_MARLA;

  const areaValue = Number(area) || 0;
  const bedroomsValue = Number(bedrooms) || 0;
  const bathroomsValue = Number(bathrooms) || 0;

  const baseAmount = ratePerMarla * areaValue;
  const bedroomAmount = BEDROOM_PREMIUM * bedroomsValue;
  const bathroomAmount = BATHROOM_PREMIUM * bathroomsValue;

  const estimate = Math.round(baseAmount + bedroomAmount + bathroomAmount);

  return {
    estimate,
    breakdown: {
      city: normalizedCity || 'default',
      area: areaValue,
      ratePerMarla,
      baseAmount,
      bedrooms: bedroomsValue,
      bedroomPremium: BEDROOM_PREMIUM,
      bedroomAmount,
      bathrooms: bathroomsValue,
      bathroomPremium: BATHROOM_PREMIUM,
      bathroomAmount,
    },
  };
}

module.exports = { estimatePrice };
