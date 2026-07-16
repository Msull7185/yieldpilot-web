# YieldPilot v0.3 verification

- Built from the uploaded `yieldpilot-web-main.zip` repository.
- Production build completed successfully with `npm ci` and `npm run build`.
- Yahoo Finance option-chain requests are implemented through `yahoo-finance2`.
- Automatic analysis runs after demo sign-in when the saved portfolio contains positions.
- Finnhub is optional in v0.3 and is used only for earnings dates when `FINNHUB_API_KEY` is configured.

## Deployment check

After pushing to GitHub and deploying through Vercel, confirm:

1. The newest deployment is Ready.
2. The site signs in and begins analysis automatically.
3. Results display Yahoo bid, ask, midpoint, expiration, strike, volume, open interest, and implied volatility.
4. If Yahoo blocks or rate-limits a request, the affected ticker appears under “Positions needing attention” rather than crashing the entire portfolio.
