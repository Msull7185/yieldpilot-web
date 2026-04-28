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
      text: "⚠️ Earnings occur before this option expires. Consider waiting until after earnings.",
    };
  }

  return {
    color: "green",
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
        if (warning.color === "red") category = "red";
        else if (strike < range[1]) category = "yellow";

        return {
          ticker,
          shares: p.shares,
          price: data.price,
          earningsDate: data.earningsDate,
          expiration: expirationText,
          strike,
          premium,
          contracts,
          income,
          optionYield,
          upside,
          rangeLow: range[0],
          rangeHigh: range[1],
          warning,
          category,
        };
      })
      .filter(Boolean);
  }, [portfolio, targetWeeksOut, targetPercentAbove]);

  const green = results.filter((r) => r.category === "green");
  const yellow = results.filter((r) => r.category === "yellow");
  const red = results.filter((r) => r.category === "red");

  const totalIncome = results.reduce((sum, r) => sum + r.income, 0);
  const greenIncome = green.reduce((sum, r) => sum + r.income, 0);
  const yellowIncome = yellow.reduce((sum, r) => sum + r.income, 0);
  const redIncome = red.reduce((sum, r) => sum + r.income, 0);

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

  function ResultCard({ r }) {
    return (
      <div className={`card result-card ${r.category}`} key={r.ticker}>
        <h2>{r.ticker}</h2>
        <p>Current stock price: <b>{currency(r.price)}</b></p>
        <p>Suggested strike: <b>{currency(r.strike)}</b></p>
        <p>Target above current price: <b>{r.upside.toFixed(2)}%</b></p>
        <p>Expiration: <b>{r.expiration}</b></p>
        <p>Premium estimate: <b>{currency(r.premium)}</b></p>
        <p>Estimated cash income: <b>{currency(r.income)}</b></p>
        <p>Option yield: <b>{r.optionYield.toFixed(2)}%</b></p>

        <div className="range-box">
          <b>{targetWeeksOut}-week trading range:</b><br />
          {currency(r.rangeLow)} – {currency(r.rangeHigh)}
          <br />
          <small>
            This helps compare the proposed strike to the stock’s recent trading range.
          </small>
        </div>

        <div className={`warning ${r.warning.color}`}>
          <b>Earnings check:</b><br />
          Earnings date: {r.earningsDate}<br />
          {r.warning.text}
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

          <button onClick={() => setPortfolio([...portfolio, { ticker: "", shares: 100 }])}>
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
            <>
              <div className="summary-grid">
                <div className="summary-card">
                  <span>Total potential earnings</span>
                  <b>{currency(totalIncome)}</b>
                </div>
                <div className="summary-card green">
                  <span>Green earnings</span>
                  <b>{currency(greenIncome)}</b>
                </div>
                <div className="summary-card yellow">
                  <span>Yellow earnings</span>
                  <b>{currency(yellowIncome)}</b>
                </div>
                <div className="summary-card red">
                  <span>Red earnings</span>
                  <b>{currency(redIncome)}</b>
                </div>
              </div>

              <h2 className="section-title green-text">Green — cleaner setups</h2>
              <div className="results-grid">{green.map((r) => <ResultCard key={r.ticker} r={r} />)}</div>

              <h2 className="section-title yellow-text">Yellow — near recent trading range</h2>
              <div className="results-grid">{yellow.map((r) => <ResultCard key={r.ticker} r={r} />)}</div>

              <h2 className="section-title red-text">Red — earnings risk</h2>
              <div className="results-grid">{red.map((r) => <ResultCard key={r.ticker} r={r} />)}</div>
            </>
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

          <label>Target strike above current stock price</label>
          <select
            value={targetPercentAbove}
            onChange={(e) => setTargetPercentAbove(Number(e.target.value))}
          >
            <option value={3}>3% above current price</option>
            <option value={4}>4% above current price</option>
            <option value={5}>5% above current price</option>
            <option value={6}>6% above current price</option>
            <option value={7}>7% above current price</option>
            <option value={8}>8% above current price</option>
            <option value={10}>10% above current price</option>
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
