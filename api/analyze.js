import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  fetchOptions: { signal: AbortSignal.timeout(12000) }
});

const FINNHUB = "https://finnhub.io/api/v1";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function targetExpirationFromWeeksOut(weeksOut) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const nextFriday = new Date(today);
  const daysToFriday = (5 - today.getDay() + 7) % 7 || 7;
  nextFriday.setDate(today.getDate() + daysToFriday + (Math.max(1, Number(weeksOut)) - 1) * 7);
  return nextFriday;
}

function closestExpiration(expirationDates, targetDate) {
  const dates = (expirationDates || []).map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return targetDate;
  const onOrAfter = dates.filter((d) => d >= targetDate).sort((a, b) => a - b);
  if (onOrAfter.length) return onOrAfter[0];
  return dates.sort((a, b) => Math.abs(a - targetDate) - Math.abs(b - targetDate))[0];
}

function midPrice(option) {
  const bid = Number(option?.bid || 0);
  const ask = Number(option?.ask || 0);
  const last = Number(option?.lastPrice || 0);
  if (bid > 0 && ask > 0 && ask >= bid) return Number(((bid + ask) / 2).toFixed(2));
  if (bid > 0) return Number(bid.toFixed(2));
  if (last > 0) return Number(last.toFixed(2));
  return 0;
}

function chooseCall(calls, minimumStrike) {
  const eligible = (calls || [])
    .filter((call) => Number(call.strike) >= minimumStrike)
    .map((call) => ({ ...call, midpoint: midPrice(call) }))
    .filter((call) => call.midpoint > 0)
    .sort((a, b) => {
      const strikeDifference = Number(a.strike) - Number(b.strike);
      if (strikeDifference !== 0) return strikeDifference;
      const liquidityA = Number(a.openInterest || 0) + Number(a.volume || 0) * 2;
      const liquidityB = Number(b.openInterest || 0) + Number(b.volume || 0) * 2;
      return liquidityB - liquidityA;
    });
  return eligible[0] || null;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, x) => sum + (x - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

async function getHistory(ticker, weeksOut) {
  try {
    const period1 = new Date();
    period1.setDate(period1.getDate() - Math.max(45, Number(weeksOut) * 25));
    const chart = await yahooFinance.chart(ticker, {
      period1,
      interval: "1d",
      events: "div,splits"
    });
    const quotes = (chart?.quotes || []).filter((q) => Number.isFinite(Number(q.close)));
    return quotes;
  } catch {
    return [];
  }
}

async function getNextEarnings(ticker) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    const from = dateOnly(new Date());
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 120);
    const to = dateOnly(toDate);
    const response = await fetch(
      `${FINNHUB}/calendar/earnings?from=${from}&to=${to}&symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return null;
    const rows = await response.json();
    return rows?.earningsCalendar?.[0] || null;
  } catch {
    return null;
  }
}

function liquidityScore(option) {
  const volume = Number(option?.volume || 0);
  const openInterest = Number(option?.openInterest || 0);
  const bid = Number(option?.bid || 0);
  const ask = Number(option?.ask || 0);
  const midpoint = midPrice(option);
  const spreadPct = midpoint > 0 && ask >= bid ? ((ask - bid) / midpoint) * 100 : 100;
  const score = clamp(
    Math.log10(openInterest + 1) * 18 + Math.log10(volume + 1) * 12 + clamp(30 - spreadPct, 0, 30),
    0,
    100
  );
  return { score: Math.round(score), spreadPct };
}

function scoreResult({ upside, annualizedYield, earningsDays, expirationDays, rangePosition, liquidity, volatility }) {
  const incomeScore = clamp(annualizedYield * 1.25, 0, 30);
  const upsideScore = clamp(upside * 3.1, 0, 22);
  const rangeScore = clamp((1 - Math.min(rangePosition, 1)) * 14, 0, 14);
  const earningsScore = earningsDays === null ? 8 : earningsDays > expirationDays + 5 ? 14 : earningsDays > expirationDays ? 7 : 0;
  const liquidityComponent = clamp(liquidity * 0.2, 0, 20);
  const volatilityPenalty = clamp((volatility - 55) * 0.25, 0, 10);
  return Math.round(clamp(incomeScore + upsideScore + rangeScore + earningsScore + liquidityComponent - volatilityPenalty, 0, 100));
}

function classify({ earningsDays, expirationDays, score, liquidity }) {
  if (earningsDays !== null && earningsDays <= expirationDays + 1) {
    return { category: "red", risk: "High", warning: "Earnings occur before or immediately after expiration." };
  }
  if (liquidity < 35) {
    return { category: "yellow", risk: "Moderate", warning: "The selected contract has limited volume, open interest, or a wide spread." };
  }
  if (score < 58) {
    return { category: "yellow", risk: "Moderate", warning: "The income, upside, and risk balance is weaker than the highest-ranked opportunities." };
  }
  return { category: "green", risk: "Lower", warning: "The contract clears the selected strike target with no identified near-term earnings conflict." };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { portfolio = [], targetWeeksOut = 2, targetPercentAbove = 5 } = req.body || {};
    const cleanPortfolio = portfolio
      .map((row) => ({ ticker: String(row.ticker || "").toUpperCase().trim(), shares: Math.max(0, Number(row.shares || 0)) }))
      .filter((row) => row.ticker && row.shares > 0);

    const results = await Promise.all(cleanPortfolio.map(async ({ ticker, shares }) => {
      try {
        const targetDate = targetExpirationFromWeeksOut(targetWeeksOut);
        const [initialOptions, history, earnings] = await Promise.all([
          yahooFinance.options(ticker),
          getHistory(ticker, targetWeeksOut),
          getNextEarnings(ticker)
        ]);

        const price = Number(initialOptions?.quote?.regularMarketPrice || initialOptions?.quote?.postMarketPrice || 0);
        if (!price) return { ticker, shares, error: "Yahoo Finance did not return a current stock price." };

        const selectedExpiration = closestExpiration(initialOptions.expirationDates, targetDate);
        const selectedChain = await yahooFinance.options(ticker, { date: selectedExpiration });
        const calls = selectedChain?.options?.[0]?.calls || [];
        const minimumStrike = price * (1 + Number(targetPercentAbove) / 100);
        const selectedCall = chooseCall(calls, minimumStrike);
        if (!selectedCall) {
          return { ticker, shares, error: `No priced call was found at least ${targetPercentAbove}% above the current stock price.` };
        }

        const expiration = dateOnly(selectedExpiration);
        const expirationDays = Math.max(1, Math.ceil((new Date(`${expiration}T16:00:00`) - new Date()) / 86400000));
        const strike = Number(selectedCall.strike);
        const premium = midPrice(selectedCall);
        const contracts = Math.floor(shares / 100);
        const coveredShares = contracts * 100;
        const uncoveredShares = shares - coveredShares;
        const income = premium * coveredShares;
        const optionYield = (premium / price) * 100;
        const annualizedYield = optionYield * (365 / expirationDays);
        const upside = ((strike - price) / price) * 100;
        const breakEven = price - premium;
        const maxSaleValue = strike * coveredShares + income;

        const closes = history.map((q) => Number(q.close)).filter(Number.isFinite);
        const highs = history.map((q) => Number(q.high)).filter(Number.isFinite);
        const lows = history.map((q) => Number(q.low)).filter(Number.isFinite);
        const dailyReturns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
        const annualizedVolatility = Number((standardDeviation(dailyReturns) * Math.sqrt(252) * 100).toFixed(1));
        const rangeLow = lows.length ? Math.min(...lows) : price;
        const rangeHigh = highs.length ? Math.max(...highs) : price;
        const rangePosition = clamp((strike - rangeLow) / Math.max(0.01, rangeHigh - rangeLow), 0, 1.5);

        const earningsDate = earnings?.date || null;
        const earningsDays = earningsDate ? Math.ceil((new Date(`${earningsDate}T12:00:00`) - new Date()) / 86400000) : null;
        const liquidity = liquidityScore(selectedCall);
        const score = scoreResult({
          upside,
          annualizedYield,
          earningsDays,
          expirationDays,
          rangePosition,
          liquidity: liquidity.score,
          volatility: annualizedVolatility || 30
        });
        const classification = classify({ earningsDays, expirationDays, score, liquidity: liquidity.score });

        return {
          ticker,
          shares,
          contracts,
          coveredShares,
          uncoveredShares,
          price,
          dayChangePercent: Number(initialOptions?.quote?.regularMarketChangePercent || 0),
          strike,
          expiration,
          expirationDays,
          premium,
          bid: Number(selectedCall.bid || 0),
          ask: Number(selectedCall.ask || 0),
          lastPrice: Number(selectedCall.lastPrice || 0),
          premiumSource: "Yahoo Finance option chain midpoint",
          contractSymbol: selectedCall.contractSymbol,
          volume: Number(selectedCall.volume || 0),
          openInterest: Number(selectedCall.openInterest || 0),
          impliedVolatility: Number((Number(selectedCall.impliedVolatility || 0) * 100).toFixed(1)),
          liquidityScore: liquidity.score,
          spreadPercent: Number(liquidity.spreadPct.toFixed(1)),
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
          warning: classification.warning,
          dataSource: "Yahoo Finance",
          dataDelayed: true
        };
      } catch (error) {
        return { ticker, shares, error: error?.message || "Analysis failed for this ticker." };
      }
    }));

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      provider: "Yahoo Finance option chains; Finnhub earnings when configured",
      results
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to analyze portfolio.", details: error?.message || String(error) });
  }
}
