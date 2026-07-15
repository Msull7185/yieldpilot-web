# YieldPilot upgrade

This package is a replacement working copy for the public `Msull7185/yieldpilot-web` repository.

## Included

- Browser persistence for portfolio and settings
- Newly added positions included on the next analysis
- Friday-based expiration logic
- Real Finnhub quote, historical candle, and earnings-calendar requests
- Realized-volatility calculation
- Earnings-before-expiration risk warning
- YieldPilot Score (0–100)
- Break-even, annualized yield, covered/uncovered shares, recent range
- Mobile-responsive portfolio and result cards
- CSV export
- Clear disclosure that premium is estimated, not a live options quote

## Deploy

1. Replace the corresponding files in the GitHub repository.
2. Confirm `FINNHUB_API_KEY` exists in Vercel Project Settings → Environment Variables.
3. Commit to `main`; Vercel should deploy automatically.
4. Open the deployment and test at least one known ticker.

## Important limitation

Finnhub is used for stock quotes, candles, and earnings. This build **does not have a live option-chain feed**, so the displayed premium is explicitly modeled from realized volatility. For a commercial product, connect a licensed options-data provider and replace `estimatePremium()` with actual bid/ask, volume, open interest, implied volatility, delta, and valid listed strikes/expirations.
