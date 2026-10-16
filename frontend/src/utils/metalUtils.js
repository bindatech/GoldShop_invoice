/**
 * Utility functions for classifying items into Gold, Silver, or Other in Hossain Jewellers CRM
 */

/**
 * Detect if an invoice item is Silver
 * @param {Object} item - Invoice line item
 * @returns {boolean}
 */
export function isSilverItem(item) {
  if (!item) return false;

  const desc = (item.description || '').toLowerCase();

  // If description explicitly indicates silver, it is silver
  if (
    desc.includes('silver') ||
    desc.includes('chandi') ||
    desc.includes('925') ||
    desc.includes('92.5') ||
    desc.includes('rupal') ||
    desc.includes('payal') ||
    desc.includes('anklet')
  ) {
    return true;
  }

  // Check explicit metal field if present
  if (item.metal && typeof item.metal === 'string') {
    const m = item.metal.trim().toLowerCase();
    if (m === 'silver') return true;
  }

  return false;
}

/**
 * Detect if an invoice item is Gold
 * @param {Object} item - Invoice line item
 * @returns {boolean}
 */
export function isGoldItem(item) {
  if (!item) return false;

  // Silver takes absolute precedence: silver must NEVER be counted in gold
  if (isSilverItem(item)) return false;

  const desc = (item.description || '').toLowerCase().trim();

  // Explicit non-metal auxiliary items
  if (
    desc.includes('other product') ||
    desc.includes('other goods') ||
    desc.includes('box') ||
    desc.includes('gift') ||
    desc.includes('making charge') ||
    desc.includes('repair') ||
    desc.includes('stone charge')
  ) {
    return false;
  }

  // Common gold purities & jewellery identifiers
  if (
    desc.includes('gold') ||
    desc.includes('916') ||
    desc.includes('22k') ||
    desc.includes('18k') ||
    desc.includes('24k') ||
    desc.includes('14k') ||
    desc.includes('750') ||
    desc.includes('585') ||
    desc.includes('kdm') ||
    desc.includes('hallmark') ||
    desc.includes('sona') ||
    desc.includes('swarna') ||
    desc.includes('ornament')
  ) {
    return true;
  }

  // Check explicit metal field if present
  if (item.metal && typeof item.metal === 'string') {
    const m = item.metal.trim().toLowerCase();
    if (m === 'gold') return true;
    if (m === 'other') return false;
  }

  // In this jewellery CRM suite, standard jewellery items not marked as silver/other default to gold
  return true;
}

/**
 * Helper to get normalized metal type for an item
 * @param {Object} item 
 * @returns {'gold' | 'silver' | 'other'}
 */
export function getItemMetalType(item) {
  if (isSilverItem(item)) return 'silver';
  if (isGoldItem(item)) return 'gold';
  return 'other';
}
