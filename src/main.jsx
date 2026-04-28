import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

const sampleMarketData = {
  AAPL: {
    price: 173.42,
    earningsDate: "2026-05-07",
    ranges: { 1: [169, 179], 2: [166, 181], 3: [164, 184], 4: [160, 187] },
  },
  MSFT: {
    price: 421.18,
    earningsDate: "2026-04-30",
    ranges: { 1: [412, 432], 2: [405, 438], 3: [398, 445], 4: [392, 451] },
  },
  NVDA: {
    price: 907.66,
    earningsDate: "2026-05-20",
    ranges: { 1: [880, 945], 2: [860, 965], 3: [835, 990], 4: [810, 1020] },
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
    return {
      color: "red",
      label: "Earnings Risk",
      text: "Earnings occur before this option expires. Consider waiting until after earnings.",
    };
  }

  return {
    color: "green",
    label: "Clear",
    text: "No earnings warning based on current demo data.",
  };
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState("portfolio");
  const [targetWeeksOut, setTargetWeeksOut] = useState(2);
  const [targetPercentAbove, setTargetPercentAbove] = useState(5);
  const [ran, setRan] = useState(false);

  const [portfolio, setPortfolio] = useState([
    { ticker: "AAPL", shares: 300 },
    { ticker: "MSFT", shares: 200 },
    { ticker: "NVDA", shares: 100 },
  ]);

  const portfolioValue = useMemo(() => {
    return portfolio.reduce((sum, row) => {
      const ticker = row.ticker.toUpperCase().trim();
      const data = sampleMarketData[ticker];
      if (!data) return sum;
      return sum + data.price * Number(row.shares || 0);
    }, 0);
  }, [portfolio]);

  const results = useMemo(() => {
    return portfolio
      .map((p) => {
        const ticker = p.ticker.toUpperCase().trim();
        const data = sampleMarketData[ticker];
        if (!data || p.shares < 100) return null;

        const expiration = new Date();
        expiration.setDate(expiration.getDate() + targetWeeksOut * 7);
        const expirationText = expiration.toISOString().slice(0, 10);

        const strike = Number(
          (data.price * (1 + targetPercentAbove / 100)).toFixed(2)
        );

        const premium = Number(
          Math.max(0.35, data.price * 0.006 * (targetWeeksOut / 2)).toFixed(2)
        );

        const contracts = Math.floor(p.shares / 100);
        const income = premium * 100 * contracts;
        const optionYield = (premium / data.price) * 100;
        const upside = ((strike - data.price) / data.price) * 100;
        const range = data.ranges[targetWeeksOut] || data.ranges[2];

        const warning = getEarningsWarning(data.earningsDate, expirationText);

        let category = "green";
        let categoryLabel = "Green";
        if (warning.color === "red") {
          category = "red";
          categoryLabel = "Red";
        } else if (strike < range[1]) {
          category = "yellow";
          categoryLabel = "Yellow";
        }

        return {
          ticker,
          shares: p.shares,
          price: data.price,
          earningsDate: data.earningsDate,
          expiration: expirationText,
          strike,
          premium,
          income,
          optionYield,
          upside,
          rangeLow: range[0],
          rangeHigh: range[1],
          warning,
          category,
          categoryLabel,
        };
      })
      .filter(Boolean);
  }, [portfolio, targetWeeksOut, targetPercentAbove]);

  function ResultCard({ r }) {
    return (
      <div className={`card result-card ${r.category}`}>
        <h2>{r.ticker}</h2>
        <p>Current stock price: <b>{currency(r.price)}</b></p>
        <p>Strike you are selling: <b>{currency(r.strike)}</b></p>
        <p>Minimum % above current price: <b>{r.upside.toFixed(2)}%</b></p>
        <p>Expiration: <b>{r.expiration}</b></p>
        <p>Premium you will receive: <b>{currency(r.premium)}</b></p>
        <p>Estimated cash income: <b>{currency(r.income)}</b></p>
        <p>Return from premium: <b>{r.optionYield.toFixed(2)}%</b></p>

        <div className="range-box">
          <b>{targetWeeksOut}-week trading range:</b><br />
          {currency(r.rangeLow)} – {currency(r.rangeHigh)}
        </div>

        <div className={`warning ${r.warning.color}`}>
          <b>Earnings check:</b><br />
          Earnings date: {r.earningsDate}<br />
          {r.warning.text}
        </div>
      </div>
    );
  }

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
        </div>
        <button className="secondary" onClick={() => setLoggedIn(false)}>
          Log out
        </button>
      </header>

      <nav className="tabs">
        <button onClick={() => setActivePage("portfolio")}>Portfolio</button>
        <button onClick={() => setActivePage("results")}>Results Cards</button>
      </nav>

      {activePage === "portfolio" && (
        <section className="card">
          <h2>Saved Portfolio</h2>

          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Share Price</th>
                <th>Value</th>
              </tr>
            </thead>

            <tbody>
              {portfolio.map((row, index) => {
                const data = sampleMarketData[row.ticker];
                const price = data ? data.price : 0;
                const value = price * row.shares;

                return (
                  <tr key={index}>
                    <td>
                      <input
                        value={row.ticker}
                        onChange={(e) => {
                          const copy = [...portfolio];
                          copy[index].ticker = e.target.value.toUpperCase();
                          setPortfolio(copy);
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={row.shares}
                        onChange={(e) => {
                          const copy = [...portfolio];
                          copy[index].shares = Number(e.target.value);
                          setPortfolio(copy);
                        }}
                      />
                    </td>

                    <td>{price ? currency(price) : "-"}</td>
                    <td><b>{price ? currency(value) : "-"}</b></td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td></td>
                <td></td>
                <td><b>Total Portfolio Value</b></td>
                <td><b>{currency(portfolioValue)}</b></td>
              </tr>
            </tfoot>
          </table>

          <button onClick={() => setPortfolio([...portfolio, { ticker: "", shares: 100 }])}>
            Add Position
          </button>

          <button onClick={() => {
            setRan(true);
            setActivePage("results");
          }}>
            Run Covered Call Analysis
          </button>
        </section>
      )}

      {activePage === "results" && (
        <section>
          {!ran ? (
            <div className="card">
              <h2>No analysis run yet</h2>
            </div>
          ) : (
            <div className="results-grid">
              {results.map((r) => <ResultCard key={r.ticker} r={r} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
