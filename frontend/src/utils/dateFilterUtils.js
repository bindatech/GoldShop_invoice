/**
 * Date filtering helper utilities for Binda Jewellers CRM
 */

export const DATE_PRESETS = [
  { id: 'all', label: 'All Time', shortLabel: 'All Time' },
  { id: 'today', label: 'Today', shortLabel: 'Today' },
  { id: 'week', label: 'Last 1 Week', shortLabel: '1 Week' },
  { id: 'thisMonth', label: 'This Month', shortLabel: 'This Month' },
  { id: 'prevMonth', label: 'Previous Month', shortLabel: 'Prev Month' },
  { id: 'custom', label: 'Custom Range', shortLabel: 'Custom' },
];

/**
 * Format a Date object to 'DD Mon YYYY' (e.g., '17 Nov 2026')
 * @param {Date|string} date 
 * @returns {string}
 */
export function formatDateDisplay(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a Date object to 'YYYY-MM-DD' for HTML5 date inputs
 * @param {Date|string} date 
 * @returns {string}
 */
export function formatDateInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculate start and end date objects for a given preset
 * @param {string} preset - 'all' | 'today' | 'week' | 'thisMonth' | 'prevMonth' | 'custom'
 * @param {string} [customStart] - YYYY-MM-DD
 * @param {string} [customEnd] - YYYY-MM-DD
 * @returns {{ start: Date|null, end: Date|null, label: string, summary: string }}
 */
export function getDateRangeForPreset(preset, customStart = '', customEnd = '') {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  switch (preset) {
    case 'today': {
      const start = new Date(year, month, date, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      return {
        start,
        end,
        label: 'Today',
        summary: `Today • ${formatDateDisplay(start)}`,
      };
    }

    case 'week': {
      // Past 7 days including today
      const start = new Date(year, month, date - 6, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      return {
        start,
        end,
        label: 'Last 1 Week',
        summary: `${formatDateDisplay(start)} – ${formatDateDisplay(end)}`,
      };
    }

    case 'thisMonth': {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const monthName = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      return {
        start,
        end,
        label: 'This Month',
        summary: monthName,
      };
    }

    case 'prevMonth': {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      const monthName = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      return {
        start,
        end,
        label: 'Previous Month',
        summary: monthName,
      };
    }

    case 'custom': {
      if (customStart && customEnd) {
        const [sy, sm, sd] = customStart.split('-').map(Number);
        const [ey, em, ed] = customEnd.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        return {
          start,
          end,
          label: 'Custom Range',
          summary: `${formatDateDisplay(start)} – ${formatDateDisplay(end)}`,
        };
      }
      return {
        start: null,
        end: null,
        label: 'Custom Range',
        summary: 'Select date range',
      };
    }

    case 'all':
    default: {
      return {
        start: null,
        end: null,
        label: 'All Time',
        summary: 'All-time cumulative turnover & weight',
      };
    }
  }
}
