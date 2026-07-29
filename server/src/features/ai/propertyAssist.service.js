// Deterministic, template-based text assembly for the property wizard's
// assist buttons (title/description/SEO/tags) - built entirely from the
// property's own fields, no LLM or external API involved. Every word
// here is derived from data the agent already entered; nothing is
// invented, so there's nothing to fabricate or hallucinate.

function titleCase(str) {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function place(property) {
  return property.locality ? `${property.locality}, ${property.city}` : property.city || 'the area';
}

function typeLabel(property) {
  const map = { house: 'House', flat: 'Flat', plot: 'Plot', farmhouse: 'Farmhouse', office: 'Office', shop: 'Shop', warehouse: 'Warehouse' };
  return map[property.type] || 'Property';
}

function improveTitle(property) {
  const parts = [];
  if (property.bedrooms) parts.push(`${property.bedrooms}-Bed`);
  parts.push(typeLabel(property));
  if (property.area) parts.push(`(${property.area} ${property.areaUnit || 'marla'})`);
  parts.push(`in ${place(property)}`);
  return titleCase(parts.join(' '));
}

function improveDescription(property) {
  const bits = [];
  bits.push(`This ${property.bedrooms ? `${property.bedrooms}-bedroom ` : ''}${typeLabel(property).toLowerCase()} is located in ${place(property)}.`);
  if (property.area) bits.push(`It offers ${property.area} ${property.areaUnit || 'marla'} of space${property.bathrooms ? ` with ${property.bathrooms} bathroom${property.bathrooms > 1 ? 's' : ''}` : ''}.`);
  if (property.condition) bits.push(`Condition: ${property.condition.replace(/_/g, ' ')}.`);
  if (property.amenities?.length) bits.push(`Amenities include ${property.amenities.slice(0, 6).join(', ')}.`);
  if (property.negotiable) bits.push('Price is negotiable.');
  bits.push(`Contact the listing agent to schedule a viewing in ${property.city || 'this area'}.`);
  return bits.join(' ');
}

function generateSeo(property) {
  const text = `${improveTitle(property)} - ${property.area ? `${property.area} ${property.areaUnit || 'marla'}, ` : ''}${place(property)}. Contact us to view this listing.`;
  return text.length > 155 ? `${text.slice(0, 152)}...` : text;
}

function generateTags(property) {
  const tags = new Set();
  if (property.city) tags.add(property.city);
  if (property.locality) tags.add(property.locality);
  if (property.type) tags.add(property.type);
  if (property.category) tags.add(property.category);
  if (property.bedrooms) tags.add(`${property.bedrooms} bed`);
  if (property.condition) tags.add(property.condition.replace(/_/g, ' '));
  (property.amenities || []).slice(0, 4).forEach((a) => tags.add(a));
  return [...tags].slice(0, 8).join(', ');
}

const ACTIONS = {
  improve_title: improveTitle,
  improve_description: improveDescription,
  generate_seo: generateSeo,
  generate_tags: generateTags,
};

async function assist(action, property) {
  const generator = ACTIONS[action];
  if (!generator) {
    const err = new Error(`Unknown AI assist action "${action}"`);
    err.status = 400;
    throw err;
  }

  return { action, suggestion: generator(property || {}) };
}

module.exports = { assist };
