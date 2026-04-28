function getNextFridayFromWeeksOut(weeksOut) {
  const today = new Date();

  const target = new Date(today);
  target.setDate(today.getDate() + Number(weeksOut) * 7);

  const day = target.getDay(); // Sunday = 0, Friday = 5
  let daysUntilFriday = 5 - day;

  if (daysUntilFriday < 0) {
    daysUntilFriday += 7;
  }

  target.setDate(target.getDate() + daysUntilFriday);

  return target.toISOString().slice(0, 10);
}

function getStrikeIncrement(price) {
  if (price < 25) return 0.5;
  if (price < 100) return 1;
  if (price < 250) return 2.5;
  if (price < 500) return 5;
  return 10;
}

function roundUpToOptionStrike(minimumStrike, stockPrice) {
  const increment = getStrikeIncrement(stockPrice);
  return Number((Math.ceil(minimumStrike / increment) * increment).toFixed(2));
}

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing FINNHUB_API_KEY in Vercel environment variables",
      });
    }

    const {
      portfolio = [],
      targetWeeksOut = 2,
      targetPercentAbove = 5,
    } = req.body || {};

    const expirationText = getNextFridayFromWeeksOut(targetWeeksOut);

    const results = await Promise.all(
      portfolio.map(async (p) => {
        const ticker = String(p.ticker || "").toUpperCase().trim();
        const shares = Number(p.shares || 0);

        if (!ticker || shares < 100) return null;

        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`;
        const response = await fetch(quoteUrl);
        const quote = await response.json();

        const price = Number(quote.c);

        if (!price) return null;

        const minimumStrike = price * (1 + Number(targetPercentAbove) / 100);
        const strike = roundUpToOptionStrike(minimumStrike, price);

        const actualPercentAbove = ((strike - price) / price) * 100;

        const premium = Number(
          Math.max(
            0.35,
            price * 0.006 * (Number(targetWeeksOut) / 2)
          ).toFixed(2)
        );

        const contracts = Math.floor(shares / 100);
        const income = premium * 100 * contracts;
        const optionYield = (premium / price) * 100;

        return {
          ticker,
          shares,
          price,
          strike,
          premium,
          contracts,
          income,
          optionYield,
          upside: actualPercentAbove,
          expiration: expirationText,
          earningsDate: "Coming soon",
          rangeLow: Number((price * 0.96).toFixed(2)),
          rangeHigh: Number((price * 1.04).toFixed(2)),
          warning: {
            color: "green",
            text: "Earnings check will be added next.",
          },
          category: "green",
          risk: "Low",
        };
      })
    );

    return res.status(200).json({
      results: results.filter(Boolean),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to analyze portfolio",
      details: error.message,
    });
  }
}
