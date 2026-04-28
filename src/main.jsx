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
      text: "Earnings occur before expiration — consider waiting.",
    };
  }

  return {
    color: "green",
    text: "No earnings risk detected.",
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
      const data = sampleMarketData[row.ticker];
      return data ? sum + data.price * row.shares : sum;
    }, 0);
  }, [portfolio]);

  const results = useMemo(() => {
    return portfolio
      .map((p) => {
        const data = sampleMarketData[p.ticker];
        if (!data || p.shares < 100) return null;

        const expiration = new Date();
        expiration.setDate(expiration.getDate() + targetWeeksOut * 7);

        const strike = data.price * (1 + targetPercentAbove / 100);
        const premium = Math.max(0.35, data.price * 0.006);

        const income = premium * 100 * Math.floor(p.shares / 100);
        const optionYield = (premium / data.price) * 100;
        const upside = ((strike - data.price) / data.price) * 100;
        const range = data.ranges[targetWeeksOut];

        const warning = getEarningsWarning(
          data.earningsDate,
          expiration.toISOString()
        );

        let category = "green";
        if (warning.color === "red") category = "red";
        else if (strike < range[1]) category = "yellow";

        return {
          ...p,
          price: data.price,
          strike,
          premium,
          income,
          optionYield,
          upside,
          expiration: expiration.toISOString().slice(0, 10),
          earningsDate: data.earningsDate,
          range,
          warning,
          category,
        };
      })
      .filter(Boolean);
  }, [portfolio, targetWeeksOut, targetPercentAbove]);

  function ResultCard({ r }) {
    const risk =
      r.category === "green"
        ? "Low"
        : r.category === "yellow"
        ? "Medium"
        : "High";

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
        <p>Assignment risk score: <b>{risk}</b></p>

        <div className="range-box">
          <b>{targetWeeksOut}-week range:</b><br />
          {currency(r.range[0])} – {currency(r.range[1])}
        </div>

        <div className={`warning ${r.warning.color}`}>
          <b>Earnings:</b><br />
          {r.earningsDate}<br />
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
            <div className="badge">Covered Call SaaS</div>
            <h1>YieldPilot</h1>
          </div>
          <div className="card">
            <button onClick={() => setLoggedIn(true)}>Enter</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="tabs">
        <button onClick={() => setActivePage("portfolio")}>Portfolio</button>
        <button onClick={() => setActivePage("results")}>Results</button>
      </nav>

      {activePage === "portfolio" && (
        <section className="card">
          <h2>Portfolio</h2>

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
              {portfolio.map((row, i) => {
                const data = sampleMarketData[row.ticker];
                const price = data?.price || 0;
                const value = price * row.shares;

                return (
                  <tr key={i}>
                    <td>
                      <input
                        value={row.ticker}
                        onChange={(e) => {
                          const copy = [...portfolio];
                          copy[i].ticker = e.target.value.toUpperCase();
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
                          copy[i].shares = Number(e.target.value);
                          setPortfolio(copy);
                        }}
                      />
                    </td>
                    <td>{price ? currency(price) : "-"}</td>
                    <td><b>{value ? currency(value) : "-"}</b></td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td></td>
                <td></td>
                <td><b>Total</b></td>
                <td><b>{currency(portfolioValue)}</b></td>
              </tr>
            </tfoot>
          </table>

          <button onClick={() => setRan(true)}>Run Analysis</button>
          <button onClick={() => setActivePage("results")}>View Results</button>
        </section>
      )}

      {activePage === "results" && (
        <section>
          {!ran ? (
            <div className="card">Run analysis first</div>
          ) : (
            <div className="results-grid">
              {results.map((r) => (
                <ResultCard key={r.ticker} r={r} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
