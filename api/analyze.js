const FINNHUB = "https://finnhub.io/api/v1";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function expirationFromWeeksOut(weeksOut) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const nextFriday = new Date(today);
  const daysToFriday = (5 - today.getDay() + 7) % 7 || 7;
  nextFriday.setDate(today.getDate() + daysToFriday);

  const expiration = new Date(nextFriday);
  expiration.setDate(nextFriday.getDate() + (Math.max(1, Number(weeksOut)) - 1) * 7);
  return dateOnly(expiration);
}

function strikeIncrement(price) {
  if (price < 25) return 0.5;
  if (price < 100) return 1;
  if (price < 250) return 2.5;
  if (price < 500) return 5;
  return 10;
}

function roundUpStrike(minimumStrike, stockPrice) {
  const increment = strikeIncrement(stockPrice);
  return Number((Math.ceil(minimumStrike / increment) * increment).toFixed(2));
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, x) => sum + (x - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

async function finnhub(path, apiKey) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${FINNHUB}${path}${separator}token=${apiKey}`);
  if (!response.ok) throw new Error(`Finnhub request failed (${response.status})`);
  return response.json();
}

async function getCandles(ticker, weeksOut, apiKey) {
  const to = Math.floor(Date.now() / 1000);
  const lookbackDays = Math.max(35, Number(weeksOut) * 21);
  const from = to - lookbackDays * 86400;
  const data = await finnhub(
    `/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${from}&to=${to}`,
    apiKey
  );

  if (data.s !== "ok" || !Array.isArray(data.c)) return null;
  return data;
}

async function getNextEarnings(ticker, apiKey) {
  const from = dateOnly(new Date());
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 120);
  const to = dateOnly(toDate);

  const rows = await finnhub(
    `/calendar/earnings?from=${from}&to=${to}&symbol=${encodeURIComponent(ticker)}`,
    apiKey
  );
  return rows?.earningsCalendar?.[0] || null;
}

function estimatePremium({ price, strike, weeksOut, annualizedVolatility }) {
  // This remains an estimate until a true options-chain provider is connected.
  const timeFactor = Math.sqrt(Math.max(7, Number(weeksOut) * 7) / 365);
  const volatilityValue = price * (annualizedVolatility / 100) * timeFactor;
  const outOfMoneyDiscount = Math.exp(-Math.max(0, strike - price) / Math.max(1, volatilityValue));
  return Number(Math.max(0.05, volatilityValue * 0.34 * outOfMoneyDiscount).toFixed(2));
}

function scoreResult({ upside, optionYield, annualizedYield, earningsDays, rangePosition, volatility }) {
  const incomeScore = clamp(annualizedYield * 1.7, 0, 35);
  const safetyScore =
    clamp(upside * 3.2, 0, 25) +
    clamp((1 - rangePosition) * 15, 0, 15) +
    (earningsDays === null ? 7 : earningsDays > 21 ? 15 : earningsDays > 10 ? 8 : 0);
  const volatilityPenalty = clamp((volatility - 35) * 0.35, 0, 12);
  return Math.round(clamp(incomeScore + safetyScore - volatilityPenalty, 0, 100));
}

function classify({ earningsDays, expirationDays, rangePosition, score }) {
  if (earningsDays !== null && earningsDays <= expirationDays + 2) {
    return { category: "red", risk: "High", warning: "Earnings occur before or very near expiration." };
  }
  if (rangePosition >= 0.82 || score < 55) {
    return { category: "yellow", risk: "Moderate", warning: "Strike is near the recent high or the setup has a weaker score." };
  }
  return { category: "green", risk: "Lower", warning: "No near-term earnings conflict was found and the strike has room above the recent range." };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing FINNHUB_API_KEY in Vercel environment variables." });
  }

  try {
    const {
      portfolio = [],
      targetWeeksOut = 2,
      targetPercentAbove = 5
    } = req.body || {};

    const expiration = expirationFromWeeksOut(targetWeeksOut);
    const expirationDays = Math.max(
      1,
      Math.ceil((new Date(`${expiration}T16:00:00`) - new Date()) / 86400000)
    );

    const cleanPortfolio = portfolio
      .map((row) => ({
        ticker: String(row.ticker || "").toUpperCase().trim(),
        shares: Math.max(0, Number(row.shares || 0))
      }))
      .filter((row) => row.ticker && row.shares > 0);

    const results = await Promise.all(
      cleanPortfolio.map(async ({ ticker, shares }) => {
        try {
          const [quote, candles, earnings] = await Promise.all([
            finnhub(`/quote?symbol=${encodeURIComponent(ticker)}`, apiKey),
            getCandles(ticker, targetWeeksOut, apiKey),
            getNextEarnings(ticker, apiKey)
          ]);

          const price = Number(quote.c);
          if (!price) {
            return { ticker, shares, error: "No live quote returned." };
          }

          const closes = candles?.c?.map(Number).filter(Number.isFinite) || [];
          const highs = candles?.h?.map(Number).filter(Number.isFinite) || [];
          const lows = candles?.l?.map(Number).filter(Number.isFinite) || [];
          const dailyReturns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
          const annualizedVolatility = Number((standardDeviation(dailyReturns) * Math.sqrt(252) * 100).toFixed(1));

          const rangeLow = lows.length ? Math.min(...lows) : Number((price * 0.96).toFixed(2));
          const rangeHigh = highs.length ? Math.max(...highs) : Number((price * 1.04).toFixed(2));
          const minimumStrike = price * (1 + Number(targetPercentAbove) / 100);
          const strike = roundUpStrike(minimumStrike, price);
          const upside = ((strike - price) / price) * 100;
          const premium = estimatePremium({
            price,
            strike,
            weeksOut: targetWeeksOut,
            annualizedVolatility: annualizedVolatility || 30
          });

          const contracts = Math.floor(shares / 100);
          const coveredShares = contracts * 100;
          const uncoveredShares = shares - coveredShares;
          const income = premium * coveredShares;
          const optionYield = (premium / price) * 100;
          const annualizedYield = optionYield * (365 / expirationDays);
          const breakEven = price - premium;
          const maxSaleValue = strike * coveredShares + income;

          const earningsDate = earnings?.date || null;
          const earningsDays = earningsDate
            ? Math.ceil((new Date(`${earningsDate}T12:00:00`) - new Date()) / 86400000)
            : null;

          const rangeSpan = Math.max(0.01, rangeHigh - rangeLow);
          const rangePosition = clamp((strike - rangeLow) / rangeSpan, 0, 1.5);
          const score = scoreResult({
            upside,
            optionYield,
            annualizedYield,
            earningsDays,
            rangePosition,
            volatility: annualizedVolatility || 30
          });
          const classification = classify({
            earningsDays,
            expirationDays,
            rangePosition,
            score
          });

          return {
            ticker,
            shares,
            contracts,
            coveredShares,
            uncoveredShares,
            price,
            dayChangePercent: Number(quote.dp || 0),
            strike,
            expiration,
            expirationDays,
            premium,
            premiumSource: "Estimated from realized volatility; not a live option-chain quote",
            income,
            optionYield,
            annualizedYield,
            upside,
            breakEven,
            maxSaleValue,
            rangeLow,
            rangeHigh,
            annualizedVolatility,
            earningsDate,
            earningsDays,
            score,
            category: classification.category,
            risk: classification.risk,
            warning: classification.warning
          };
        } catch (error) {
          return { ticker, shares, error: error.message || "Analysis failed for this ticker." };
        }
      })
    );

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      expiration,
      results
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to analyze portfolio.",
      details: error.message
    });
  }
}
