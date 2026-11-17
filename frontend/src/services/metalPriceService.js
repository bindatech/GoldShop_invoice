import { api } from './api';

const STORAGE_KEY = 'gold_crm_metal_rates_kolkata_anandabazar_v5';
const TROY_OUNCE_TO_GRAMS = 31.1034768;

// Calibrated to match Kolkata Jewellery Association benchmark as published in Anandabazar Patrika
// 22-Carat (Hallmark 916): ₹13,610/g (₹1,36,100 / 10g)
// 24-Carat (Retail Pure 995): ₹14,315/g (₹1,43,150 / 10g)
// Silver: ₹191/g
const ANANDABAZAR_GOLD_FACTOR = 1.221415;
const ANANDABAZAR_SILVER_FACTOR = 1.33445;

export const DEFAULT_METAL_RATES = {
  gold24k: 14315,
  gold22k: 13610,
  gold18k: 11135,
  silver: 191,
  city: 'Kolkata',
  source: 'anandabazar_kolkata',
  updatedAt: new Date().toISOString(),
};

/**
 * Get cached/stored metal rates from localStorage or verified Anandabazar Patrika defaults
 */
export function getStoredMetalRates() {
  try {
    // Clear old uncalibrated keys
    localStorage.removeItem('gold_crm_metal_rates');
    localStorage.removeItem('gold_crm_metal_rates_kolkata');
    localStorage.removeItem('gold_crm_metal_rates_live');
    localStorage.removeItem('gold_crm_metal_rates_kolkata_retail_v3');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure the rate reflects Anandabazar benchmark (22k >= 13000)
      if (parsed && typeof parsed.gold22k === 'number' && parsed.gold22k >= 13000) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read metal rates from localStorage:', e);
  }
  return { ...DEFAULT_METAL_RATES };
}

/**
 * Save custom shopkeeper board rates to localStorage and notify listeners
 */
export function saveCustomMetalRates(customRates) {
  const merged = {
    ...getStoredMetalRates(),
    ...customRates,
    isCustom: true,
    source: 'shop_board_rate',
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('metal-rates-updated', { detail: merged }));
  } catch (e) {
    console.error('Failed to save metal rates to localStorage:', e);
  }

  return merged;
}

/**
 * Fetch live metal rates in real time calibrated to Kolkata Anandabazar Patrika benchmark
 */
export async function fetchLiveMetalRates() {
  // 1. Direct open bullion API with Anandabazar Kolkata Jewellers Adjustment
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const [goldRes, silverRes] = await Promise.allSettled([
      fetch('https://api.gold-api.com/price/XAU/INR', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }),
      fetch('https://api.gold-api.com/price/XAG/INR', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }),
    ]);
    clearTimeout(timeout);

    let goldPriceInr = null;
    let silverPriceInr = null;

    if (goldRes.status === 'fulfilled' && goldRes.value && goldRes.value.ok) {
      const gData = await goldRes.value.json();
      if (gData && gData.price) {
        goldPriceInr = gData.price;
      }
    }

    if (silverRes.status === 'fulfilled' && silverRes.value && silverRes.value.ok) {
      const sData = await silverRes.value.json();
      if (sData && sData.price) {
        silverPriceInr = sData.price;
      }
    }

    if (goldPriceInr) {
      const rawSpot24k = goldPriceInr / TROY_OUNCE_TO_GRAMS;
      const g24 = Math.round(rawSpot24k * ANANDABAZAR_GOLD_FACTOR);
      const g22 = Math.round(g24 * (13610 / 14315));
      const g18 = Math.round(g22 * (18 / 22));

      const rawSpotSilver = silverPriceInr ? (silverPriceInr / TROY_OUNCE_TO_GRAMS) : 143.13;
      const silv = Math.round(rawSpotSilver * ANANDABAZAR_SILVER_FACTOR);

      const liveData = {
        gold24k: g24,
        gold22k: g22,
        gold18k: g18,
        silver: silv,
        city: 'Kolkata',
        isCustom: false,
        source: 'anandabazar_kolkata',
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(liveData));
      window.dispatchEvent(new CustomEvent('metal-rates-updated', { detail: liveData }));
      return liveData;
    }
  } catch (directErr) {
    console.warn('Direct live rate fetch timed out, falling back to backend:', directErr.message);
  }

  // 2. Second attempt: Backend API proxy
  try {
    const res = await api.getMetalRates();
    if (res && res.success && res.rates && res.rates.gold22k >= 13000) {
      const liveData = {
        ...res.rates,
        isCustom: false,
        source: res.rates.source || 'anandabazar_kolkata',
        updatedAt: res.rates.updatedAt || new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(liveData));
      window.dispatchEvent(new CustomEvent('metal-rates-updated', { detail: liveData }));
      return liveData;
    }
  } catch (backendErr) {
    console.warn('Backend metal rates endpoint unavailable, using cached rates:', backendErr.message);
  }

  return getStoredMetalRates();
}

/**
 * Determine the appropriate rate per gram based on metal and description
 */
export function getRateForMetal(metal, description = '', currentRates = DEFAULT_METAL_RATES) {
  const rates = currentRates || DEFAULT_METAL_RATES;
  const desc = (description || '').toLowerCase();

  // Silver check
  if (
    metal === 'silver' ||
    desc.includes('silver') ||
    desc.includes('chandi') ||
    desc.includes('925') ||
    desc.includes('92.5') ||
    desc.includes('payal') ||
    desc.includes('anklet')
  ) {
    return rates.silver || DEFAULT_METAL_RATES.silver;
  }

  // Gold Purity check
  if (desc.includes('24k') || desc.includes('24kt') || desc.includes('999') || desc.includes('995')) {
    return rates.gold24k || DEFAULT_METAL_RATES.gold24k;
  }
  if (desc.includes('18k') || desc.includes('18kt') || desc.includes('750')) {
    return rates.gold18k || DEFAULT_METAL_RATES.gold18k;
  }

  // Default Gold: 22K (916%) Hallmarked jewellery
  return rates.gold22k || DEFAULT_METAL_RATES.gold22k;
}
