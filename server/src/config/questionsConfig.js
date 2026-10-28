/**
 * Question list configuration per category
 * Delegates directly to the canonical categoryConfig.js
 */

const {
  CATEGORIES,
  VALID_CATEGORY_KEYS,
  validateCategory,
  getQuestionsForCategory,
} = require('./categoryConfig');

module.exports = {
  getQuestionsForCategory,
  CATEGORIES,
  VALID_CATEGORY_KEYS,
  validateCategory,
};
