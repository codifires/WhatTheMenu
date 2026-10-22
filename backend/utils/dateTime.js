/**
 * DateTime utility for consistent timestamps and business-day calculations.
 * Default business timezone is Indian Standard Time (Asia/Kolkata, UTC+5:30).
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5 hours 30 mins

/**
 * Returns 'YYYY-MM-DD' representing the business date for a given Date/timestamp in target timezone.
 *
 * @param {Date|number|string} [date=new Date()]
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {string} e.g. '2026-10-20'
 */
const getBusinessDateString = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

/**
 * Returns a Date object set to 00:00:00.000 in the business timezone for a given date.
 *
 * @param {Date|number|string} [date=new Date()]
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {Date}
 */
const getStartOfBusinessDay = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const dateStr = getBusinessDateString(date, timeZone);
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  return new Date(utcMidnight - IST_OFFSET_MS);
};

/**
 * Returns a Date object set to 23:59:59.999 in the business timezone for a given date.
 *
 * @param {Date|number|string} [date=new Date()]
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {Date}
 */
const getEndOfBusinessDay = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const start = getStartOfBusinessDay(date, timeZone);
  return new Date(start.getTime() + (24 * 60 * 60 * 1000 - 1));
};

module.exports = {
  DEFAULT_TIMEZONE,
  getBusinessDateString,
  getStartOfBusinessDay,
  getEndOfBusinessDay
};
