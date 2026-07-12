/**
 * Formats a number to Japanese Yen currency style (e.g. ¥150,000)
 * @param {number} value 
 * @returns {string}
 */
export function formatYen(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '¥0';
  }
  const rounded = Math.round(value);
  return '¥' + rounded.toLocaleString('ja-JP');
}

/**
 * Checks if a loan is delayed (atrasado) based on reference date 2026-07-12
 * @param {string} dueDate YYYY-MM-DD
 * @param {boolean} isActive
 * @returns {boolean}
 */
export function isDelayed(dueDate, isActive) {
  if (!isActive) return false;
  return dueDate < '2026-07-12';
}

/**
 * Reference Date for the system
 */
export const SYSTEM_REF_DATE = '2026-07-12';
