const express = require('express');
const router = express.Router();

// 1 Troy Ounce = 31.1034768 Grams
const TROY_OUNCE_TO_GRAMS = 31.1034768;

// Calibrated to match Kolkata Jewellery Association benchmark as published in Anandabazar Patrika
// 22-Carat (Hallmark 916): ₹13,610/g (₹1,36,100 / 10g)
// 24-Carat (Retail Pure 995): ₹14,315/g (₹1,43,150 / 10g)
// Silver: ₹191/g
const ANANDABAZAR_GOLD_FACTOR = 1.221415;
const ANANDABAZAR_SILVER_FACTOR = 1.33445;

let cachedRates = {
  gold24k: 14315,
  gold22k: 13610,
  gold18k: 11135,
  silver: 191,
  city: 'Kolkata',
  source: 'anandabazar_kolkata',
  updatedAt: new Date().toISOString(),
};

let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes fresh cache

router.get('/metals', async (req, res) => {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION_MS && cachedRates.source === 'anandabazar_kolkata') {
    return res.json({
      success: true,
      rates: cachedRates,
      cached: true,
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

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
      // Convert to Kolkata Anandabazar Patrika retail jeweller benchmark
      const g24 = Math.round(rawSpot24k * ANANDABAZAR_GOLD_FACTOR);
      const g22 = Math.round(g24 * (13610 / 14315));
      const g18 = Math.round(g22 * (18 / 22));

      const rawSpotSilver = silverPriceInr ? (silverPriceInr / TROY_OUNCE_TO_GRAMS) : 143.13;
      const silv = Math.round(rawSpotSilver * ANANDABAZAR_SILVER_FACTOR);

      cachedRates = {
        gold24k: g24,
        gold22k: g22,
        gold18k: g18,
        silver: silv,
        city: 'Kolkata',
        source: 'anandabazar_kolkata',
        updatedAt: new Date().toISOString(),
      };
      lastFetchTime = now;

      return res.json({
        success: true,
        rates: cachedRates,
        cached: false,
      });
    }
  } catch (err) {
    console.warn('Real-time rate fetch error, returning Anandabazar benchmark:', err.message);
  }

  return res.json({
    success: true,
    rates: cachedRates,
    cached: true,
  });
});

module.exports = router;
