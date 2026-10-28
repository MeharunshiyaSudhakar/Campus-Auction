/**
 * Fixed question list configuration per category
 * The backend strictly owns the question flow.
 */

const COMMON_PRE_QUESTIONS = [
  {
    key: 'category',
    label: 'What category does your item belong to?',
    helper: 'Select the category that best matches your campus item.',
    type: 'select',
    required: true,
    options: [
      { value: 'vehicles', label: 'Vehicles (Cycle, Scooter, etc.)' },
      { value: 'stationery', label: 'Stationery (Calculators, Drafting tools, etc.)' },
      { value: 'books', label: 'Books & Course Notes' },
      { value: 'electronics', label: 'Electronics & Lab Gear' },
      { value: 'furniture', label: 'Furniture (Study table, Chair, etc.)' },
      { value: 'clothing', label: 'Clothing & Uniforms' },
      { value: 'sports', label: 'Sports & Fitness Equipment' },
      { value: 'other', label: 'Other Campus Items' },
      { value: 'cycle', label: 'Cycle' },
      { value: 'calculator', label: 'Calculator' },
    ],
  },
  {
    key: 'title',
    label: 'What is the title or name of your item?',
    helper: 'Be specific, e.g. "Hero Sprint 26T Geared Cycle" or "Casio fx-991CW Calculator".',
    type: 'text',
    placeholder: 'e.g. Hero Sprint Pro 26T Cycle',
    required: true,
  },
  {
    key: 'conditionGrade',
    label: 'How would you rate the overall condition?',
    helper: 'Grade honestly so your campus junior knows what to expect.',
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
    key: 'ageOfItem',
    label: 'How old is this item, or how long was it used on campus?',
    helper: 'Give an honest estimate of duration of ownership.',
    type: 'text',
    placeholder: 'e.g. 1 year, 2 semesters, 6 months',
    required: true,
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
    helper: 'MANDATORY for Fair/Poor condition (min 8 characters). Transparency prevents disputes during campus pickup.',
    type: 'textarea',
    placeholder: 'Describe all scratches, cracks, missing screws, loose parts, or type "None" if flawless.',
    required: false, // Condition-dependent: validated on server if conditionGrade is Fair/Poor
  },
  {
    key: 'accessories',
    label: 'What accessories are included?',
    helper: 'List any extras included with the purchase (e.g. locks, cables, covers, box).',
    type: 'text',
    placeholder: 'e.g. Cycle lock, helmet, Casio hard shell, charging adapter',
    required: false,
  },
];

const CATEGORY_SPECIFIC_QUESTIONS = {
  cycle: [
    {
      key: 'cycle_gears',
      label: 'Is the cycle geared or single-speed?',
      type: 'select',
      required: true,
      options: [
        { value: 'Single Speed', label: 'Single Speed' },
        { value: 'Geared (Multi-speed)', label: 'Geared (Multi-speed)' },
      ],
    },
    {
      key: 'cycle_brakes',
      label: 'What is the condition of the brakes?',
      type: 'select',
      required: true,
      options: [
        { value: 'Good', label: 'Good / Responsive' },
        { value: 'Needs adjustment', label: 'Needs adjustment / Loose cable' },
        { value: 'Needs pad replacement', label: 'Needs pad replacement' },
      ],
    },
    {
      key: 'cycle_tyres',
      label: 'What is the condition of the tyres?',
      type: 'select',
      required: true,
      options: [
        { value: 'Like new', label: 'Like new' },
        { value: 'Good tread', label: 'Good tread' },
        { value: 'Worn tread', label: 'Worn tread' },
        { value: 'Punctured / Needs replacement', label: 'Punctured / Needs replacement' },
      ],
    },
    {
      key: 'cycle_lastServiced',
      label: 'When was this cycle last serviced or tuned up?',
      type: 'text',
      placeholder: 'e.g. 1 month ago at campus bike shop, or Never',
      required: false,
    },
  ],
  calculator: [
    {
      key: 'calculator_model',
      label: 'What calculator model is this?',
      type: 'text',
      placeholder: 'e.g. Casio fx-991CW, fx-991EX ClassWiz, TI-84 Plus',
      required: true,
    },
    {
      key: 'calculator_display',
      label: 'Is the screen display clear?',
      type: 'select',
      required: true,
      options: [
        { value: 'Flawless', label: 'Flawless (Clean digits, high contrast)' },
        { value: 'Faint / Low contrast', label: 'Faint / Low contrast' },
        { value: 'Lines missing', label: 'Lines missing / Damaged LCD' },
      ],
    },
    {
      key: 'calculator_battery',
      label: 'What is the battery status?',
      type: 'select',
      required: true,
      options: [
        { value: 'Working', label: 'Working (Recent battery)' },
        { value: 'Needs replacement', label: 'Needs battery replacement soon' },
        { value: 'Solar only', label: 'Solar power only' },
      ],
    },
  ],
  books: [
    {
      key: 'books_edition',
      label: 'Which edition or publication year is this book?',
      type: 'text',
      placeholder: 'e.g. 8th Edition (Wiley) or 2023 Reprint',
      required: true,
    },
    {
      key: 'books_markedPages',
      label: 'Are there any handwritten notes or highlights inside?',
      type: 'select',
      required: true,
      options: [
        { value: 'Clean / No marks', label: 'Clean / Zero markings' },
        { value: 'Light pencil notes', label: 'Light pencil notes only' },
        { value: 'Heavy pen / Highlighting', label: 'Heavy pen annotations / Highlighting' },
      ],
    },
    {
      key: 'books_missingPages',
      label: 'Is the binding intact and are all pages present?',
      type: 'select',
      required: true,
      options: [
        { value: 'None (All pages intact)', label: 'All pages present, tight binding' },
        { value: 'A few loose pages', label: 'A few loose pages' },
        { value: 'Cover torn / taped', label: 'Cover torn or taped' },
      ],
    },
  ],
  electronics: [
    {
      key: 'electronics_warranty',
      label: 'Is there any warranty remaining?',
      type: 'select',
      required: true,
      options: [
        { value: 'Active warranty', label: 'Active manufacturer / store warranty' },
        { value: 'Expired', label: 'Expired' },
        { value: 'No warranty', label: 'No warranty / Bill unavailable' },
      ],
    },
    {
      key: 'electronics_charger',
      label: 'Is the charging cable or adapter included?',
      type: 'select',
      required: true,
      options: [
        { value: 'Original charger included', label: 'Original charger included' },
        { value: 'Compatible cable only', label: 'Compatible cable only' },
        { value: 'No charger', label: 'No charger included' },
      ],
    },
    {
      key: 'electronics_batteryHealth',
      label: 'How is the battery backup or health?',
      type: 'text',
      placeholder: 'e.g. Holds 4+ hours on full charge, or Requires wall adapter',
      required: true,
    },
  ],
};

const COMMON_POST_QUESTIONS = [
  {
    key: 'sellerDescription',
    label: 'Personal notes or story behind this item',
    helper: 'Tell the buyer why you are selling and any useful tips (the AI will help rephrase this cleanly).',
    type: 'textarea',
    placeholder: 'e.g. Used for 2 semesters of engineering math. Kept in pouch, great condition.',
    required: true,
  },
  {
    key: 'photos',
    label: 'Upload photos of the item (minimum 2 photos)',
    helper: 'Provide public image URLs or sample images. At least 2 photos required.',
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
];

CATEGORY_SPECIFIC_QUESTIONS.vehicles = CATEGORY_SPECIFIC_QUESTIONS.cycle;
CATEGORY_SPECIFIC_QUESTIONS.stationery = CATEGORY_SPECIFIC_QUESTIONS.calculator;

/**
 * Returns complete list of questions for a chosen category
 */
const getQuestionsForCategory = (category = 'vehicles') => {
  let specific = CATEGORY_SPECIFIC_QUESTIONS[category];
  if (!specific) {
    if (category === 'cycle' || category === 'vehicles') {
      specific = CATEGORY_SPECIFIC_QUESTIONS.cycle;
    } else if (category === 'calculator' || category === 'stationery') {
      specific = CATEGORY_SPECIFIC_QUESTIONS.calculator;
    } else {
      specific = [];
    }
  }
  return [...COMMON_PRE_QUESTIONS, ...specific, ...COMMON_POST_QUESTIONS];
};

module.exports = {
  getQuestionsForCategory,
  CATEGORY_SPECIFIC_QUESTIONS,
};
