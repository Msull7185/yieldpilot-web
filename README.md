# YieldPilot v0.3

## What changed

- Real Yahoo Finance option chains instead of modeled premiums
- Actual listed expirations and strikes
- Bid, ask, midpoint, volume, open interest, implied volatility, and liquidity score
- Automatic analysis after sign-in so portfolio values populate without an extra click
- Yahoo Finance historical prices for recent range and realized volatility
- Finnhub earnings remain optional when `FINNHUB_API_KEY` is configured
- Graceful per-ticker errors so one failed symbol does not stop the portfolio
- CSV export expanded with live option-chain fields

## Deployment

1. Copy the contents of this folder into the local `yieldpilot-web` repository.
2. In GitHub Desktop, commit with `YieldPilot v0.3 Yahoo option data`.
3. Click **Push origin**.
4. In Vercel, open the `yieldpilot-web` project and wait for the new deployment to show **Ready**.

## Data warning

`yahoo-finance2` is an unofficial interface to Yahoo Finance. It is appropriate for development and internal testing, but it may be delayed or interrupted and should be replaced by a licensed options-data provider before commercial launch. The displayed premium is the bid/ask midpoint, not a guaranteed trade price.
