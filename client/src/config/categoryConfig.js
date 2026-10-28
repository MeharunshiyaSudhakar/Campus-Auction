/**
 * Shared Canonical Category Configuration for Campus Auction (Client-side)
 * Unified with server/src/config/categoryConfig.js
 */

export const CATEGORIES = [
  { key: 'vehicles', label: 'Vehicles', icon: '🚗', description: 'Cycles, scooters, skateboards, and campus rides' },
  { key: 'stationery', label: 'Stationery', icon: '✏️', description: 'Calculators, drafting tools, sets, and stationery' },
  { key: 'books', label: 'Books', icon: '📚', description: 'Course textbooks, reference books, and course notes' },
  { key: 'electronics', label: 'Electronics', icon: '💻', description: 'Laptops, chargers, lab components, and monitors' },
  { key: 'furniture', label: 'Furniture', icon: '🪑', description: 'Study tables, chairs, mattresses, and hostel furniture' },
  { key: 'clothing', label: 'Clothing', icon: '👕', description: 'Lab aprons, blazers, uniforms, and sportswear' },
  { key: 'sports', label: 'Sports', icon: '⚽', description: 'Racquets, balls, dumbbells, and fitness gear' },
  { key: 'other', label: 'Other', icon: '📦', description: 'Other campus items' },
];

export const VALID_CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export const LEGACY_CATEGORY_MAP = {
  cycle: { category: 'vehicles', defaultItemType: 'cycle' },
  calculator: { category: 'stationery', defaultItemType: 'calculator' },
};

export const categoryEmojiMap = {
  vehicles: '🚗 Vehicles',
  stationery: '✏️ Stationery',
  books: '📚 Books',
  electronics: '💻 Electronics',
  furniture: '🪑 Furniture',
  clothing: '👕 Clothing',
  sports: '⚽ Sports',
  other: '📦 Other',
  cycle: '🚗 Vehicles',
  calculator: '✏️ Stationery',
};

export function getCategoryMeta(key = 'other') {
  const normalized = (key || 'other').toLowerCase().trim();
  const targetKey = LEGACY_CATEGORY_MAP[normalized]?.category || normalized;
  return CATEGORIES.find((c) => c.key === targetKey) || {
    key: targetKey,
    label: targetKey.charAt(0).toUpperCase() + targetKey.slice(1),
    icon: '🏷️',
    description: 'Campus listing',
  };
}

export function getCategoryPills() {
  return [
    { id: 'all', label: 'All Items', icon: '🏷️' },
    ...CATEGORIES.map((c) => ({ id: c.key, label: c.label, icon: c.icon })),
  ];
}
