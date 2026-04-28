import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

const sampleMarketData = {
  AAPL: {
    price: 173.42,
    earningsDate: "2026-05-07",
    options: [
      { weeksOut: 1, expiration: "2026-05-08", strike: 180, premium: 1.42 },
      { weeksOut: 2, expiration: "2026-05-15", strike: 185, premium: 1.03 },
      { weeksOut: 3, expiration: "2026-05-22", strike: 190, premium: 0.82 },
      { weeksOut: 4, expiration: "2026-05-29", strike: 195, premium: 0.61 },
    ],
  },
  MSFT: {
    price: 421.18,
    earningsDate: "2026-04-30",
    options: [
      { weeksOut: 1, expiration: "2026-05-08", strike: 430, premium: 4.1 },
      { weeksOut: 2, expiration: "2026-05-15", strike: 435, premium: 3.25 },
      { weeksOut: 3, expiration: "2026-05-22", strike: 440, premium: 2.72 },
      { weeksOut: 4, expiration: "2026-05-29", strike: 450, premium: 2.18 },
    ],
  },
  NVDA: {
    price: 907.66,
    earningsDate: "2026-05-20",
    options: [
      { weeksOut: 1, expiration: "2026-05-08", strike: 950, premium: 16.4 },
      { weeksOut: 2, expiration: "2026-05-15", strike: 960, premium: 13.8 },
      { weeksOut: 3, expiration: "2026-05-22", strike: 980, premium: 11.25 },
      { weeksOut: 4, expiration: "2026-05-29", strike: 1000, premium: 9.6 },
    ],
  },
};

function currency(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function getEarningsWarning(earningsDate, expirationDate) {
  const today = new Date();
  const earnings = new Date(earningsDate);
  const expiration = new Date(expirationDate);

  if (earnings > today && earnings <= expiration) {
    return "⚠️ Earnings occur before this option expires. Consider waiting until after earnings.";
  }

  return "No earnings warning based on current demo data.";
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState("portfolio");
  const [targetWeeksOut, setTargetWeeksOut] = useState(2);
  const [minPremium, setMinPremium] = useState(0.75);
  const [ran, setRan] = useState(false);

  const [portfolio, setPortfolio] = useState([
    { ticker: "AAPL", shares: 300 },
    { ticker: "MSFT", shares: 200 },
    { ticker: "NVDA", shares: 100 },
  ]);

  const results = useMemo(() => {
    return portfolio
      .map((p) => {
        const ticker = p.ticker.toUpperCase().trim();
        const data = sampleMarketData[ticker];
        if (!data || p.shares < 100) return null;

        const option =
          data.options.find((o) => o.weeksOut === targetWeeksOut) ||
          data.options[0];

        const contracts = Math.floor(p.shares / 100);
        const income = option.premium * 100 * contracts;
        const optionYield = (option.premium / data.price) * 100;
        const upside = ((option.strike - data.price) / data.price) * 100;
        const warning = getEarningsWarning(data.earningsDate, option.expiration);

        return {
          ticker,
          shares: p.shares,
          price: data.price,
          earningsDate: data.earningsDate,
          option,
          contracts,
          income,
          optionYield,
          upside,
          warning,
        };
      })
      .filter(Boolean)
      .filter((r) => r.option.premium >= minPremium);
  }, [portfolio, targetWeeksOut, minPremium]);

  if (!loggedIn) {
    return (
      <div className="page dark">
        <div className="hero">
          <div>
            <div className="badge">Covered Call SaaS Prototype</div>
            <h1>YieldPilot</h1>
            <p>
              A portfolio-based covered call analyzer where subscribers save
              tickers, run scans, and get simple income recommendations.
            </p>
          </div>

          <div className="card login-card">
            <h2>Sign in</h2>
            <input value="demo@yieldpilot.com" readOnly />
            <input value="password123" type="password" readOnly />
            <button onClick={() => setLoggedIn(true)}>Open Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>YieldPilot Dashboard</h1>
          <p>Covered call analyzer prototype</p>
        </div>
        <button className="secondary" onClick={() => setLoggedIn(false)}>
          Log out
        </button>
      </header>

      <nav className="tabs">
        <button onClick={() => setActivePage("portfolio")}>Portfolio</button>
        <button onClick={() => setActivePage("results")}>Results</button>
        <button onClick={() => setActivePage("settings")}>Settings</button>
      </nav>

      {activePage === "portfolio" && (
        <section className="card">
          <h2>Saved Portfolio</h2>
          <p>Enter ticker symbols and shares.</p>

          {portfolio.map((row, index) => (
            <div className="portfolio-row" key={index}>
              <input
                value={row.ticker}
                onChange={(e) => {
                  const copy = [...portfolio];
                  copy[index].ticker = e.target.value.toUpperCase();
                  setPortfolio(copy);
                }}
              />
              <input
                type="number"
                value={row.shares}
                onChange={(e) => {
                  const copy = [...portfolio];
                  copy[index].shares = Number(e.target.value);
                  setPortfolio(copy);
                }}
              />
            </div>
          ))}

          <button
            onClick={() =>
              setPortfolio([...portfolio, { ticker: "", shares: 100 }])
            }
          >
            Add Position
          </button>

          <button
            onClick={() => {
              setRan(true);
              setActivePage("results");
            }}
          >
            Run Covered Call Analysis
          </button>
        </section>
      )}

      {activePage === "results" && (
        <section>
          {!ran ? (
            <div className="card">
              <h2>No analysis run yet</h2>
              <p>Go to Portfolio and click Run Covered Call Analysis.</p>
            </div>
          ) : (
            <div className="results-grid">
              {results.map((r) => (
                <div className="card result-card" key={r.ticker}>
                  <h2>{r.ticker}</h2>
                  <p>Current stock price: <b>{currency(r.price)}</b></p>
                  <p>Suggested strike: <b>{currency(r.option.strike)}</b></p>
                  <p>Expiration: <b>{r.option.expiration}</b></p>
                  <p>Premium: <b>{currency(r.option.premium)}</b></p>
                  <p>Estimated cash income: <b>{currency(r.income)}</b></p>
                  <p>Option yield: <b>{r.optionYield.toFixed(2)}%</b></p>
                  <p>Upside to strike: <b>{r.upside.toFixed(2)}%</b></p>

                  <div className="warning">
                    <b>Earnings check:</b>
                    <br />
                    Earnings date: {r.earningsDate}
                    <br />
                    {r.warning}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activePage === "settings" && (
        <section className="card">
          <h2>Analysis Settings</h2>

          <label>Target weeks out</label>
          <select
            value={targetWeeksOut}
            onChange={(e) => setTargetWeeksOut(Number(e.target.value))}
          >
            <option value={1}>1 week</option>
            <option value={2}>2 weeks</option>
            <option value={3}>3 weeks</option>
            <option value={4}>4 weeks</option>
          </select>

          <label>Minimum premium</label>
          <select
            value={minPremium}
            onChange={(e) => setMinPremium(Number(e.target.value))}
          >
            <option value={0}>Any premium</option>
            <option value={0.5}>$0.50+</option>
            <option value={0.75}>$0.75+</option>
            <option value={1}>$1.00+</option>
            <option value={2}>$2.00+</option>
            <option value={5}>$5.00+</option>
          </select>

          <div className="warning">
            <b>Compliance note:</b> This should be presented as educational
            software, not personalized financial advice.
          </div>
        </section>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
