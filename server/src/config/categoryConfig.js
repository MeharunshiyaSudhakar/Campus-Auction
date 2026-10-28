/**
 * Shared Canonical Category Configuration for Campus Auction
 * Used everywhere: server validation, sell questions, browse filters, home grid, client picker
 */

const VALID_CATEGORY_KEYS = [
  'vehicles',
  'stationery',
  'books',
  'electronics',
  'furniture',
  'clothing',
  'sports',
  'other',
];

const LEGACY_CATEGORY_MAP = {
  cycle: { category: 'vehicles', defaultItemType: 'cycle' },
  calculator: { category: 'stationery', defaultItemType: 'calculator' },
};

const CATEGORIES = [
  {
    key: 'vehicles',
    label: 'Vehicles',
    icon: '🚗',
    description: 'Bicycles, e-scooters, skateboards, and campus rides',
    extras: [
      {
        key: 'vehicles_type',
        label: 'Vehicle Type',
        helper: 'Specify whether it is a bicycle, electric scooter, skateboard, or motorised ride.',
        type: 'text',
        placeholder: 'e.g. Geared Bicycle, Electric Scooter, Skateboard',
        required: true,
      },
      {
        key: 'vehicles_model',
        label: 'Model / Variant',
        helper: 'Exact model name or series.',
        type: 'text',
        placeholder: 'e.g. Hero Sprint Pro 26T, Firefox Target 21S',
        required: false,
      },
      {
        key: 'vehicles_brakes',
        label: 'Brakes Condition',
        helper: 'State brake type and braking responsiveness.',
        type: 'select',
        required: true,
        options: [
          { value: 'Disc brakes - Sharp', label: 'Disc brakes (Sharp & responsive)' },
          { value: 'V-brakes / Rim - Good', label: 'V-brakes / Rim brakes (Good stopping power)' },
          { value: 'Drum brakes - Working', label: 'Drum brakes (Working normally)' },
          { value: 'Needs adjustment', label: 'Needs wire or pad adjustment' },
        ],
      },
      {
        key: 'vehicles_tyres',
        label: 'Tyres & Grip Condition',
        helper: 'Are both tyres holding air pressure and tread?',
        type: 'select',
        required: true,
        options: [
          { value: 'Excellent grip / New', label: 'Excellent grip / Recently replaced' },
          { value: 'Good condition', label: 'Good condition (Plenty of tread left)' },
          { value: 'Moderate wear', label: 'Moderate wear (Usable on campus)' },
          { value: 'Worn out / Needs change soon', label: 'Worn out (Needs replacement soon)' },
        ],
      },
      {
        key: 'vehicles_gears',
        label: 'Gear System',
        helper: 'Single speed or multi-speed derailleur.',
        type: 'select',
        required: true,
        options: [
          { value: 'Single speed', label: 'Single speed (No gears)' },
          { value: 'Multi-speed (Shimano / Microshift)', label: 'Multi-speed (Geared)' },
          { value: 'Automatic / Motorised', label: 'Automatic / Motorised' },
        ],
      },
      {
        key: 'vehicles_lastServiced',
        label: 'When was it last serviced or oiled?',
        helper: 'Recent maintenance helps buyers evaluate ride readiness.',
        type: 'text',
        placeholder: 'e.g. 2 weeks ago, last semester, never',
        required: false,
      },
      {
        key: 'vehicles_motorisedDetails',
        label: 'Motorised details (KM driven & papers, if applicable)',
        helper: 'For electric or petrol vehicles, state KM and RC/insurance status (or type N/A).',
        type: 'text',
        placeholder: 'e.g. 8,500 km, RC active, or N/A for bicycle',
        required: false,
      },
    ],
  },
  {
    key: 'stationery',
    label: 'Stationery',
    icon: '✏️',
    description: 'Scientific calculators, drafters, drawing instruments, and study kits',
    extras: [
      {
        key: 'stationery_kind',
        label: 'Stationery Kind / Tool',
        helper: 'What kind of stationery or drafting tool is this?',
        type: 'text',
        placeholder: 'e.g. Scientific Calculator, Mini Drafter, Engineering Geometry Set',
        required: true,
      },
      {
        key: 'stationery_model',
        label: 'Model / Brand Series',
        helper: 'Model number or manufacturer series.',
        type: 'text',
        placeholder: 'e.g. Casio fx-991CW, Omega Mini Drafter',
        required: false,
      },
      {
        key: 'stationery_displayBattery',
        label: 'Display & Battery Health',
        helper: 'State screen clarity and battery state.',
        type: 'select',
        required: true,
        options: [
          { value: 'Dual power (Solar + Battery) - Crisp', label: 'Dual power (Solar + Battery) - Crisp display' },
          { value: 'Battery powered - Fresh', label: 'Battery powered - Fresh battery' },
          { value: 'Battery low - Needs cell change', label: 'Battery low - Needs new coin cell' },
          { value: 'Non-electronic / Not applicable', label: 'Non-electronic / Not applicable' },
        ],
      },
      {
        key: 'stationery_quantity',
        label: 'Quantity / Inclusions',
        helper: 'Number of pieces or tools included in this listing.',
        type: 'text',
        placeholder: 'e.g. 1 unit with protective hard slide cover, 3-piece set',
        required: false,
      },
    ],
  },
  {
    key: 'books',
    label: 'Books',
    icon: '📚',
    description: 'Course textbooks, reference books, gate materials, and novels',
    extras: [
      {
        key: 'books_author',
        label: 'Author(s)',
        helper: 'Primary author(s) or editor.',
        type: 'text',
        placeholder: 'e.g. Cormen, Leiserson, Rivest / B.S. Grewal',
        required: false,
      },
      {
        key: 'books_edition',
        label: 'Edition / Publication Year',
        helper: 'Which edition is this textbook?',
        type: 'text',
        placeholder: 'e.g. 4th Edition (2022), Eastern Economy Edition',
        required: false,
      },
      {
        key: 'books_subject',
        label: 'Subject / Department / Course',
        helper: 'Campus course or branch this book applies to.',
        type: 'text',
        placeholder: 'e.g. Algorithms (CS201), Signals & Systems, Gate Prep',
        required: false,
      },
      {
        key: 'books_markedPages',
        label: 'Annotations & Page Markings',
        helper: 'Disclose handwriting, pencil underlines, or ink highlights.',
        type: 'select',
        required: true,
        options: [
          { value: 'Clean - No markings', label: 'Clean - Crisp pages with zero marks' },
          { value: 'Light pencil notes', label: 'Light pencil notes on some pages' },
          { value: 'Highlighted sections', label: 'Highlighted sections on important topics' },
        ],
      },
      {
        key: 'books_missingPages',
        label: 'Binding & Page Condition',
        helper: 'Are all pages present and is the binding solid?',
        type: 'select',
        required: true,
        options: [
          { value: 'Intact - Zero missing pages', label: '100% complete - Binding tight, zero missing pages' },
          { value: 'Cover slightly worn - All pages intact', label: 'Cover slightly worn - All pages intact' },
          { value: 'Loose binding / Repaired', label: 'Loose binding or tape-repaired cover' },
        ],
      },
    ],
  },
  {
    key: 'electronics',
    label: 'Electronics',
    icon: '💻',
    description: 'Laptops, monitors, headphones, lab components, and chargers',
    extras: [
      {
        key: 'electronics_model',
        label: 'Model / Variant',
        helper: 'Exact model or hardware specifications.',
        type: 'text',
        placeholder: 'e.g. Dell Inspiron 15, Raspberry Pi 4 (4GB), JBL Flip 5',
        required: false,
      },
      {
        key: 'electronics_batteryHealth',
        label: 'Battery Health / Backup Duration',
        helper: 'How long does the battery last under normal campus use?',
        type: 'text',
        placeholder: 'e.g. 4+ hours on full charge, or Wall-powered only',
        required: true,
      },
      {
        key: 'electronics_charger',
        label: 'Charger / Cable Included',
        helper: 'Is the original or compatible power adapter included?',
        type: 'select',
        required: true,
        options: [
          { value: 'Original charger included', label: 'Original charger / brick included' },
          { value: 'Compatible USB-C / cable only', label: 'Compatible USB cable only' },
          { value: 'No charger included', label: 'No charger / cable included' },
        ],
      },
      {
        key: 'electronics_warranty',
        label: 'Warranty Status',
        helper: 'Is there active manufacturer warranty remaining?',
        type: 'select',
        required: true,
        options: [
          { value: 'Active brand warranty with invoice', label: 'Active brand warranty with bill/invoice' },
          { value: 'Expired', label: 'Warranty expired' },
          { value: 'No warranty / Bill unavailable', label: 'No warranty / Bill unavailable' },
        ],
      },
      {
        key: 'electronics_screen',
        label: 'Screen / Display Condition',
        helper: 'Condition of screen or display panel.',
        type: 'select',
        required: true,
        options: [
          { value: 'Flawless - No scratches or dead pixels', label: 'Flawless - No scratches or dead pixels' },
          { value: 'Minor hairline scratches', label: 'Minor hairline scratches (display fully clear)' },
          { value: 'Noticeable scratches / Minor defect', label: 'Noticeable scratches or minor display marks' },
          { value: 'N/A - Non-display device', label: 'N/A - Non-display device' },
        ],
      },
    ],
  },
  {
    key: 'furniture',
    label: 'Furniture',
    icon: '🪑',
    description: 'Study tables, chairs, mattresses, bookshelves, and hostel storage',
    extras: [
      {
        key: 'furniture_type',
        label: 'Furniture Type',
        helper: 'What type of furniture is this?',
        type: 'text',
        placeholder: 'e.g. Ergonomic Study Chair, Wooden Desk, 4-Tier Bookshelf',
        required: true,
      },
      {
        key: 'furniture_material',
        label: 'Material / Construction',
        helper: 'Material used in construction.',
        type: 'text',
        placeholder: 'e.g. Engineered Wood, Steel Frame + Breathable Mesh, Solid Pine',
        required: false,
      },
      {
        key: 'furniture_dimensions',
        label: 'Dimensions (Approximate)',
        helper: 'Approximate size to verify fit in student rooms.',
        type: 'text',
        placeholder: 'e.g. 100cm W x 60cm D x 75cm H',
        required: false,
      },
      {
        key: 'furniture_wear',
        label: 'Wear & Structural Sturdiness',
        helper: 'Evaluate stability, wobbles, and surface wear.',
        type: 'select',
        required: true,
        options: [
          { value: 'Sturdy & like new', label: 'Sturdy & like new (Zero wobble)' },
          { value: 'Good condition with minor scuffs', label: 'Good condition with minor cosmetic scuffs' },
          { value: 'Noticeable wear but fully functional', label: 'Noticeable wear but completely sturdy' },
        ],
      },
    ],
  },
  {
    key: 'clothing',
    label: 'Clothing',
    icon: '👕',
    description: 'Lab aprons, college blazers, winter jackets, uniforms, and sportswear',
    extras: [
      {
        key: 'clothing_type',
        label: 'Clothing Type',
        helper: 'What type of garment is this?',
        type: 'text',
        placeholder: 'e.g. White Lab Coat / Apron, College Blazer, Winter Hoodie',
        required: true,
      },
      {
        key: 'clothing_size',
        label: 'Size',
        helper: 'Standard size tag.',
        type: 'select',
        required: true,
        options: [
          { value: 'XS', label: 'XS (Extra Small)' },
          { value: 'S', label: 'S (Small)' },
          { value: 'M', label: 'M (Medium)' },
          { value: 'L', label: 'L (Large)' },
          { value: 'XL', label: 'XL (Extra Large)' },
          { value: 'XXL+', label: 'XXL+ (Double Extra Large+)' },
          { value: 'Free Size', label: 'Free Size / Universal' },
        ],
      },
      {
        key: 'clothing_brand',
        label: 'Brand / Department Uniform',
        helper: 'Brand or department store.',
        type: 'text',
        placeholder: 'e.g. College Store, Raymond, Allen Solly, Decathlon',
        required: false,
      },
      {
        key: 'clothing_wear',
        label: 'Wear & Wash Condition',
        helper: 'How frequently was this garment worn and washed?',
        type: 'select',
        required: true,
        options: [
          { value: 'New / Never worn', label: 'New / Never worn (Original tags intact)' },
          { value: 'Worn a few times - Pristine', label: 'Worn a few times - Clean, no stains or fading' },
          { value: 'Gently used', label: 'Gently used (Normal gentle wash wear)' },
          { value: 'Noticeable fading / Minor defect', label: 'Noticeable fading or minor stitch repair' },
        ],
      },
    ],
  },
  {
    key: 'sports',
    label: 'Sports',
    icon: '⚽',
    description: 'Badminton racquets, footballs, cricket gear, dumbbells, and fitness items',
    extras: [
      {
        key: 'sports_type',
        label: 'Sports Equipment Type',
        helper: 'What kind of sports or fitness equipment is this?',
        type: 'text',
        placeholder: 'e.g. Badminton Racquet, Football, Dumbbells (Set of 2x 5kg)',
        required: true,
      },
      {
        key: 'sports_size',
        label: 'Size / Weight / Grip',
        helper: 'Weight, grip size, or ball size.',
        type: 'text',
        placeholder: 'e.g. Grip G4, Size 5, 10 kg pair',
        required: false,
      },
      {
        key: 'sports_brand',
        label: 'Brand',
        helper: 'Manufacturer or brand name.',
        type: 'text',
        placeholder: 'e.g. Yonex, Cosco, Nivia, Kipsta, Stag',
        required: false,
      },
      {
        key: 'sports_wear',
        label: 'Wear & Playability',
        helper: 'String tension, grip condition, or scuff marks.',
        type: 'select',
        required: true,
        options: [
          { value: 'Like new / Barely used', label: 'Like new / Barely used (Court ready)' },
          { value: 'Good condition - Fully playable', label: 'Good condition - Fully playable' },
          { value: 'Scuffed / Normal court wear', label: 'Scuffed / Normal court wear' },
          { value: 'Needs restringing / Maintenance', label: 'Needs restringing or fresh overgrip' },
        ],
      },
    ],
  },
  {
    key: 'other',
    label: 'Other',
    icon: '📦',
    description: 'Other campus items',
    extras: [], // Common questions only! "A category with no special set falls back to the common questions, so a new category never errors."
  },
];

/**
 * Validate category. Throws 400 listing valid categories if unknown.
 * Maps legacy categories 'cycle' -> 'vehicles' and 'calculator' -> 'stationery'.
 */
function validateCategory(cat) {
  if (!cat || typeof cat !== 'string') {
    const error = new Error(`Category is required. Valid categories are: ${VALID_CATEGORY_KEYS.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  const normalized = cat.toLowerCase().trim();

  // Legacy mappings
  if (LEGACY_CATEGORY_MAP[normalized]) {
    return LEGACY_CATEGORY_MAP[normalized].category;
  }

  if (!VALID_CATEGORY_KEYS.includes(normalized)) {
    const error = new Error(`Invalid category "${cat}". Valid categories are: ${VALID_CATEGORY_KEYS.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

/**
 * Retrieve configuration object for a category
 */
function getCategoryConfig(categoryKey = 'other') {
  const normalized = validateCategory(categoryKey);
  return CATEGORIES.find((c) => c.key === normalized) || CATEGORIES.find((c) => c.key === 'other');
}

/**
 * Generates the unified, complete question list for a chosen category.
 * Common questions for ALL categories + Category Extras + Common Post questions.
 */
function getQuestionsForCategory(categoryKey = 'other') {
  let normalizedKey = 'other';
  try {
    normalizedKey = validateCategory(categoryKey);
  } catch (err) {
    normalizedKey = 'other';
  }

  const catConfig = CATEGORIES.find((c) => c.key === normalizedKey) || CATEGORIES.find((c) => c.key === 'other');
  const isOther = normalizedKey === 'other';

  // Common Pre-Questions for ALL categories
  const commonPre = [
    {
      key: 'category',
      label: 'What category does your item belong to?',
      helper: 'Select the category that best matches your campus item.',
      type: 'select',
      required: true,
      options: CATEGORIES.map((c) => ({
        value: c.key,
        label: `${c.icon} ${c.label}`,
      })),
    },
    {
      key: 'itemType',
      label: 'What is the item?',
      helper: 'Specify the exact item type (e.g. Geared Cycle, Scientific Calculator, Textbook, Study Table).',
      type: 'text',
      placeholder: 'e.g. Bicycle, Scientific Calculator, Algorithms Textbook',
      required: true,
    },
    {
      key: 'brand',
      label: 'Brand / Manufacturer (optional)',
      helper: 'State the manufacturer or brand if known.',
      type: 'text',
      placeholder: 'e.g. Hero, Casio, Pearson, Dell, Ikea, Decathlon',
      required: false,
    },
    {
      key: 'title',
      label: 'Listing Headline / Title',
      helper: 'Be clear and specific so juniors can search and find it easily.',
      type: 'text',
      placeholder: 'e.g. Hero Sprint 26T Cycle in Good Condition',
      required: true,
    },
    {
      key: 'sellerDescription',
      label: isOther
        ? 'Describe the item and anything a buyer should know'
        : 'Describe the item in your own words (AI will rephrase this cleanly)',
      helper: isOther
        ? 'Describe the item and anything a buyer should know.'
        : 'State why you are selling and any helpful tips. The AI will format this into a clear, honest description.',
      type: 'textarea',
      placeholder: isOther
        ? 'Describe the item, what it is used for, and anything a buyer should know...'
        : 'e.g. Used for 2 semesters on campus. Runs smoothly, kept in hostel covered parking.',
      required: true,
    },
    {
      key: 'ageOfItem',
      label: 'How long was this item used on campus?',
      helper: 'Give an honest estimate of ownership duration.',
      type: 'text',
      placeholder: 'e.g. 1 year, 2 semesters, 6 months',
      required: true,
    },
    {
      key: 'conditionGrade',
      label: 'How would you rate the overall condition?',
      helper: 'Grade honestly so your junior knows exactly what to expect.',
      type: 'select',
      required: true,
      options: [
        { value: 'New', label: 'New (Unused, original packaging)' },
        { value: 'Like new', label: 'Like new (Barely used, zero noticeable flaws)' },
        { value: 'Good', label: 'Good (Normal gentle wear, 100% functional)' },
        { value: 'Fair', label: 'Fair (Noticeable cosmetic wear, scratches, or minor flaws)' },
        { value: 'Poor', label: 'Poor (Heavy wear or needs maintenance)' },
      ],
    },
    {
      key: 'workingStatus',
      label: 'What is its working status?',
      helper: 'State whether all features work as expected.',
      type: 'select',
      required: true,
      options: [
        { value: 'Fully functional', label: 'Fully functional (100% working)' },
        { value: 'Partially functional', label: 'Partially functional (Some features impaired)' },
        { value: 'Needs repair / For parts', label: 'Needs repair / For parts' },
      ],
    },
    {
      key: 'defects',
      label: 'Are there any known defects, scratches, dents, or wear?',
      helper: 'MANDATORY for Fair or Poor condition (min 8 characters). Transparency prevents disputes during handover.',
      type: 'textarea',
      placeholder: 'Describe all scratches, cracks, missing screws, or type "None" if flawless.',
      required: false, // Condition-dependent validation enforced on server
    },
    {
      key: 'accessories',
      label: 'What accessories are included?',
      helper: 'List any extras included with purchase (e.g. lock, pouch, cables, adapters, box).',
      type: 'text',
      placeholder: 'e.g. Original box, protective case, charger, lock',
      required: false,
    },
  ];

  // Category-specific questions (empty for 'other' or unknown categories)
  const extras = catConfig && Array.isArray(catConfig.extras) ? catConfig.extras : [];

  // Common Post-Questions for ALL categories
  const commonPost = [
    {
      key: 'photos',
      label: 'Upload photos of the item (minimum 2 photos)',
      helper: 'Upload real photos. At least 2 photos required (1:1 square crop).',
      type: 'photos',
      required: true,
    },
    {
      key: 'startingPrice',
      label: 'What is your starting auction price (₹)?',
      helper: 'First bid must be at least this amount.',
      type: 'number',
      placeholder: 'e.g. 500',
      min: 1,
      required: true,
    },
    {
      key: 'minIncrement',
      label: 'Minimum bid increment (₹)',
      helper: 'Each subsequent bid must increase by at least this amount (default: ₹10).',
      type: 'number',
      placeholder: 'e.g. 20',
      min: 1,
      required: true,
      default: 10,
    },
    {
      key: 'closingTime',
      label: 'When should this auction close?',
      helper: 'Must be a future date and time.',
      type: 'datetime',
      required: true,
    },
    {
      key: 'acceptedPaymentMethods',
      label: 'Accepted Payment Methods',
      helper: 'Select which payment methods you accept from the winning buyer.',
      type: 'multiselect',
      required: true,
      default: ['upi', 'cash_on_pickup'],
      options: [
        { value: 'upi', label: 'Direct UPI (Winner sees your UPI ID after price approval)' },
        { value: 'cash_on_pickup', label: 'Cash on Campus Pickup (Cash handed over at meetup)' },
        { value: 'other', label: 'Other Instructions (Custom arrangement)' },
      ],
    },
    {
      key: 'fulfilment',
      label: 'Fulfilment & Delivery Options',
      helper: 'Select how the item will be delivered to the winner.',
      type: 'multiselect',
      required: true,
      default: ['campus_pickup'],
      options: [
        { value: 'campus_pickup', label: 'Campus In-Person Pickup (Default campus meeting)' },
        { value: 'courier', label: 'Courier / Hostel Delivery (Winner provides shipping address)' },
      ],
    },
  ];

  return [...commonPre, ...extras, ...commonPost];
}

module.exports = {
  CATEGORIES,
  VALID_CATEGORY_KEYS,
  LEGACY_CATEGORY_MAP,
  validateCategory,
  getCategoryConfig,
  getQuestionsForCategory,
};
