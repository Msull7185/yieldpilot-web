import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

const sampleData = {
  AAPL: { price: 173, earnings: "2026-05-07" },
  MSFT: { price: 421, earnings: "2026-04-30" },
  NVDA: { price: 907, earnings: "2026-05-20" },
};

function daysUntil(date) {
  const today = new Date();
  const target = new Date(date);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function App() {
  const [portfolio, setPortfolio] = useState([
    { ticker: "AAPL", shares: 100 },
  ]);

  const [weeksOut, setWeeksOut] = useState(2);
  const [results, setResults] = useState([]);

  function runAnalysis() {
    const output = portfolio.map((p) => {
      const data = sampleData[p.ticker];
      if (!data) return null;

      const earningsDays = daysUntil(data.earnings);

      let warning = "No earnings risk";
      if (earningsDays < weeksOut * 7 && earningsDays > 0) {
        warning = "⚠️ Earnings before expiration — consider waiting";
      }

      return {
        ...p,
        price: data.price,
        earnings: data.earnings,
        warning,
      };
    });

    setResults(output);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>YieldPilot</h1>

      <h3>Portfolio</h3>
      {portfolio.map((p, i) => (
        <div key={i}>
          <input
            value={p.ticker}
            onChange={(e) => {
              const copy = [...portfolio];
              copy[i].ticker = e.target.value.toUpperCase();
              setPortfolio(copy);
            }}
          />
          <input
            type="number"
            value={p.shares}
            onChange={(e) => {
              const copy = [...portfolio];
              copy[i].shares = e.target.value;
              setPortfolio(copy);
            }}
          />
        </div>
      ))}

      <h3>Target Weeks Out</h3>
      <select
        value={weeksOut}
        onChange={(e) => setWeeksOut(Number(e.target.value))}
      >
        <option value={1}>1 week</option>
        <option value={2}>2 weeks</option>
        <option value={3}>3 weeks</option>
        <option value={4}>4 weeks</option>
      </select>

      <br /><br />

      <button onClick={runAnalysis}>Run Analysis</button>

      <h3>Results</h3>
      {results.map((r, i) => (
        <div key={i} style={{ marginTop: 10, padding: 10, border: "1px solid black" }}>
          <b>{r.ticker}</b><br />
          Price: ${r.price}<br />
          Earnings: {r.earnings}<br />
          <span style={{ color: "red" }}>{r.warning}</span>
        </div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
