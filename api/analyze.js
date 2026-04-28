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

    const { portfolio = [], targetWeeksOut = 2, targetPercentAbove = 5 } = req.body || {};

    const results = await Promise.all(
      portfolio.map(async (p) => {
        const ticker = String(p.ticker || "").toUpperCase().trim();
        const shares = Number(p.shares || 0);

        if (!ticker || shares < 100) return null;

        const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`;
        const response = await fetch(url);
        const quote = await response.json();

        const price = Number(quote.c);

        if (!price) return null;

        const expiration = new Date();
        expiration.setDate(expiration.getDate() + Number(targetWeeksOut) * 7);

        const strike = Number((price * (1 + Number(targetPercentAbove) / 100)).toFixed(2));
        const premium = Number(Math.max(0.35, price * 0.006 * (Number(targetWeeksOut) / 2)).toFixed(2));

        const contracts = Math.floor(shares / 100);
        const income = premium * 100 * contracts;
        const optionYield = (premium / price) * 100;
        const upside = ((strike - price) / price) * 100;

        return {
          ticker,
          shares,
          price,
          strike,
          premium,
          contracts,
          income,
          optionYield,
          upside,
          expiration: expiration.toISOString().slice(0, 10),
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
