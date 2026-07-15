import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BarChart3, BriefcaseBusiness, Calculator, ChevronRight, CircleAlert,
  Download, LogOut, Plus, RefreshCw, Save, Settings, ShieldCheck,
  Trash2, TrendingUp
} from "lucide-react";
import "./style.css";

const STORAGE_KEY = "yieldpilot-state-v2";
const DEFAULT_PORTFOLIO = [
  { ticker: "AAPL", shares: 300 },
  { ticker: "MSFT", shares: 200 },
  { ticker: "NVDA", shares: 100 }
];

function money(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function percent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      portfolio: Array.isArray(saved?.portfolio) && saved.portfolio.length ? saved.portfolio : DEFAULT_PORTFOLIO,
      targetWeeksOut: Number(saved?.targetWeeksOut || 2),
      targetPercentAbove: Number(saved?.targetPercentAbove || 5)
    };
  } catch {
    return { portfolio: DEFAULT_PORTFOLIO, targetWeeksOut: 2, targetPercentAbove: 5 };
  }
}

function App() {
  const initial = loadState();
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem("yieldpilot-demo-login") === "1");
  const [activePage, setActivePage] = useState("portfolio");
  const [portfolio, setPortfolio] = useState(initial.portfolio);
  const [targetWeeksOut, setTargetWeeksOut] = useState(initial.targetWeeksOut);
  const [targetPercentAbove, setTargetPercentAbove] = useState(initial.targetPercentAbove);
  const [results, setResults] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ portfolio, targetWeeksOut, targetPercentAbove }));
  }, [portfolio, targetWeeksOut, targetPercentAbove]);

  const validResults = results.filter((row) => !row.error);
  const failedResults = results.filter((row) => row.error);

  const totals = useMemo(() => {
    return validResults.reduce((acc, row) => {
      acc.value += row.price * row.shares;
      acc.income += row.income;
      acc.contracts += row.contracts;
      acc.coveredShares += row.coveredShares;
      acc.green += row.category === "green" ? row.income : 0;
      acc.yellow += row.category === "yellow" ? row.income : 0;
      acc.red += row.category === "red" ? row.income : 0;
      return acc;
    }, { value: 0, income: 0, contracts: 0, coveredShares: 0, green: 0, yellow: 0, red: 0 });
  }, [validResults]);

  const weightedAnnualYield = totals.value
    ? validResults.reduce((sum, r) => sum + r.annualizedYield * r.price * r.coveredShares, 0) /
      Math.max(1, validResults.reduce((sum, r) => sum + r.price * r.coveredShares, 0))
    : 0;

  function updateRow(index, field, value) {
    setPortfolio((current) =>
      current.map((row, i) => i === index ? { ...row, [field]: value } : row)
    );
    setResults([]);
  }

  function addPosition() {
    setPortfolio((current) => [...current, { ticker: "", shares: 100 }]);
  }

  function removePosition(index) {
    setPortfolio((current) => current.filter((_, i) => i !== index));
    setResults([]);
  }

  async function runAnalysis() {
    const clean = portfolio
      .map((row) => ({
        ticker: String(row.ticker || "").toUpperCase().trim(),
        shares: Number(row.shares || 0)
      }))
      .filter((row) => row.ticker && row.shares > 0);

    if (!clean.length) {
      setMessage("Add at least one ticker and share count.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio: clean,
          targetWeeksOut,
          targetPercentAbove
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setResults(data.results || []);
      setGeneratedAt(data.generatedAt || new Date().toISOString());
      setActivePage("results");
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const headers = [
      "Ticker","Shares","Contracts","Stock Price","Strike","Expiration",
      "Estimated Premium","Cash Income","Option Yield","Annualized Yield",
      "Upside","Break Even","Volatility","Earnings Date","YieldPilot Score","Risk"
    ];
    const lines = validResults.map((r) => [
      r.ticker, r.shares, r.contracts, r.price, r.strike, r.expiration,
      r.premium, r.income, r.optionYield, r.annualizedYield,
      r.upside, r.breakEven, r.annualizedVolatility, r.earningsDate || "",
      r.score, r.risk
    ]);
    const csv = [headers, ...lines].map((row) =>
      row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")
    ).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `yieldpilot-results-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!loggedIn) {
    return (
      <main className="login-shell">
        <section className="login-copy">
          <div className="brand-mark">YP</div>
          <p className="eyebrow">Covered-call income dashboard</p>
          <h1>Turn your stock portfolio into a clearer weekly income plan.</h1>
          <p className="lead">
            YieldPilot compares income, upside, earnings timing, recent price range,
            and volatility in one simple score.
          </p>
          <div className="feature-strip">
            <span><ShieldCheck size={18}/> Earnings warnings</span>
            <span><TrendingUp size={18}/> Yield comparisons</span>
            <span><Save size={18}/> Saved portfolio</span>
          </div>
        </section>
        <section className="login-card">
          <h2>Open your dashboard</h2>
          <p>This prototype uses a demo sign-in. Your portfolio is saved on this device.</p>
          <label>Email<input type="email" placeholder="you@example.com" /></label>
          <label>Password<input type="password" placeholder="••••••••" /></label>
          <button className="primary" onClick={() => {
            sessionStorage.setItem("yieldpilot-demo-login", "1");
            setLoggedIn(true);
          }}>Sign in <ChevronRight size={18}/></button>
          <small>Educational software only. Not individualized investment advice.</small>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark small">YP</div><div><b>YieldPilot</b><span>Income dashboard</span></div></div>
        <nav>
          <button className={activePage === "portfolio" ? "active" : ""} onClick={() => setActivePage("portfolio")}><BriefcaseBusiness/>Portfolio</button>
          <button className={activePage === "results" ? "active" : ""} onClick={() => setActivePage("results")}><BarChart3/>Results</button>
          <button className={activePage === "settings" ? "active" : ""} onClick={() => setActivePage("settings")}><Settings/>Settings</button>
        </nav>
        <button className="logout" onClick={() => {
          sessionStorage.removeItem("yieldpilot-demo-login");
          setLoggedIn(false);
        }}><LogOut/>Log out</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Portfolio income planning</p>
            <h1>{activePage === "portfolio" ? "Your portfolio" : activePage === "results" ? "Covered-call results" : "Analysis settings"}</h1>
          </div>
          <button className="primary compact" onClick={runAnalysis} disabled={loading}>
            <RefreshCw className={loading ? "spin" : ""} size={17}/>
            {loading ? "Analyzing" : "Run analysis"}
          </button>
        </header>

        {message && <div className="alert"><CircleAlert size={18}/>{message}</div>}

        {activePage === "portfolio" && (
          <>
            <section className="metric-grid">
              <Metric label="Positions" value={portfolio.filter(r => r.ticker).length} />
              <Metric label="Analyzed value" value={money(totals.value)} />
              <Metric label="Covered contracts" value={totals.contracts || "—"} />
              <Metric label="Potential income" value={totals.income ? money(totals.income) : "Run analysis"} />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><h2>Saved positions</h2><p>Only complete 100-share lots can be covered.</p></div>
                <button className="secondary" onClick={addPosition}><Plus size={17}/>Add position</button>
              </div>
              <div className="portfolio-table">
                <div className="portfolio-head"><span>Ticker</span><span>Shares</span><span>Live price</span><span>Market value</span><span></span></div>
                {portfolio.map((row, index) => {
                  const result = validResults.find((r) => r.ticker === String(row.ticker).toUpperCase().trim());
                  return (
                    <div className="portfolio-row" key={`${index}-${row.ticker}`}>
                      <input aria-label="Ticker" value={row.ticker} onChange={(e) => updateRow(index, "ticker", e.target.value.toUpperCase())} placeholder="AAPL" />
                      <input aria-label="Shares" type="number" min="0" step="1" value={row.shares} onChange={(e) => updateRow(index, "shares", Number(e.target.value))} />
                      <span data-label="Live price">{result ? money(result.price, 2) : "Run analysis"}</span>
                      <span data-label="Market value">{result ? money(result.price * row.shares) : "—"}</span>
                      <button className="icon-button" aria-label="Remove position" onClick={() => removePosition(index)}><Trash2 size={17}/></button>
                    </div>
                  );
                })}
              </div>
              <div className="panel-footer">
                <span>Portfolio changes save automatically in this browser.</span>
                <button className="primary" onClick={runAnalysis} disabled={loading}>{loading ? "Analyzing…" : "Analyze covered calls"}</button>
              </div>
            </section>
          </>
        )}

        {activePage === "results" && (
          <>
            {!validResults.length ? (
              <section className="empty-state">
                <Calculator size={40}/>
                <h2>No results yet</h2>
                <p>Run an analysis from the Portfolio page.</p>
                <button className="primary" onClick={() => setActivePage("portfolio")}>Go to portfolio</button>
              </section>
            ) : (
              <>
                <section className="metric-grid five">
                  <Metric label="Potential income" value={money(totals.income)} />
                  <Metric label="Annualized yield" value={percent(weightedAnnualYield)} />
                  <Metric label="Green income" value={money(totals.green)} tone="green" />
                  <Metric label="Yellow income" value={money(totals.yellow)} tone="yellow" />
                  <Metric label="Red income" value={money(totals.red)} tone="red" />
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recommendations</h2>
                      <p>{generatedAt ? `Updated ${new Date(generatedAt).toLocaleString()}` : ""}</p>
                    </div>
                    <button className="secondary" onClick={exportCsv}><Download size={17}/>Export CSV</button>
                  </div>
                  <div className="result-cards">
                    {validResults.map((row) => <ResultCard key={row.ticker} row={row} />)}
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading"><div><h2>Comparison table</h2><p>Sort mentally by score, yield, and risk color.</p></div></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr>
                        <th>Status</th><th>Ticker</th><th>Shares</th><th>Price</th><th>Strike</th><th>Expiration</th>
                        <th>Est. premium</th><th>Income</th><th>Ann. yield</th><th>Upside</th><th>Volatility</th><th>Score</th>
                      </tr></thead>
                      <tbody>
                        {validResults.map((r) => (
                          <tr key={r.ticker}>
                            <td><span className={`status ${r.category}`}>{r.risk}</span></td>
                            <td><b>{r.ticker}</b></td><td>{r.shares}</td><td>{money(r.price,2)}</td><td>{money(r.strike,2)}</td>
                            <td>{r.expiration}</td><td>{money(r.premium,2)}</td><td>{money(r.income)}</td>
                            <td>{percent(r.annualizedYield)}</td><td>{percent(r.upside)}</td>
                            <td>{percent(r.annualizedVolatility)}</td><td><b>{r.score}</b></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {failedResults.length > 0 && (
                  <section className="panel error-list">
                    <h2>Positions needing attention</h2>
                    {failedResults.map((r) => <p key={r.ticker}><b>{r.ticker}</b>: {r.error}</p>)}
                  </section>
                )}

                <div className="disclosure">
                  Premiums are modeled estimates based on realized stock volatility, not executable option-chain quotes.
                  Confirm the actual bid, ask, volume, open interest, expiration, and strike with your broker before trading.
                </div>
              </>
            )}
          </>
        )}

        {activePage === "settings" && (
          <section className="settings-grid">
            <div className="panel">
              <div className="panel-heading"><div><h2>Trade target</h2><p>These choices apply to the whole portfolio.</p></div></div>
              <label>Target expiration
                <select value={targetWeeksOut} onChange={(e) => { setTargetWeeksOut(Number(e.target.value)); setResults([]); }}>
                  <option value={1}>About 1 week</option><option value={2}>About 2 weeks</option>
                  <option value={3}>About 3 weeks</option><option value={4}>About 4 weeks</option>
                </select>
              </label>
              <label>Minimum strike above current price
                <select value={targetPercentAbove} onChange={(e) => { setTargetPercentAbove(Number(e.target.value)); setResults([]); }}>
                  {[3,4,5,6,7,8,10,12,15].map((n) => <option key={n} value={n}>{n}% above current price</option>)}
                </select>
              </label>
              <button className="primary" onClick={runAnalysis} disabled={loading}>Save and run analysis</button>
            </div>
            <div className="panel explainer">
              <h2>How the score works</h2>
              <p>The YieldPilot Score combines estimated income, strike distance, recent trading range, realized volatility, and earnings timing.</p>
              <div className="legend"><span className="status green">Lower</span><p>No identified earnings conflict and more room above the recent range.</p></div>
              <div className="legend"><span className="status yellow">Moderate</span><p>Strike is near the recent high or the score is weaker.</p></div>
              <div className="legend"><span className="status red">High</span><p>Earnings occur before or very near expiration.</p></div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value, tone = "" }) {
  return <div className={`metric ${tone}`}><span>{label}</span><b>{value}</b></div>;
}

function ResultCard({ row }) {
  return (
    <article className={`result-card ${row.category}`}>
      <div className="result-top">
        <div><span className={`status ${row.category}`}>{row.risk} risk</span><h3>{row.ticker}</h3></div>
        <div className="score"><span>Score</span><b>{row.score}</b></div>
      </div>
      <div className="trade-line"><div><span>Sell</span><b>{row.contracts} × {money(row.strike, 2)} call</b></div><div><span>Expiration</span><b>{row.expiration}</b></div></div>
      <div className="card-stats">
        <div><span>Estimated premium</span><b>{money(row.premium, 2)}</b></div>
        <div><span>Cash income</span><b>{money(row.income)}</b></div>
        <div><span>Annualized yield</span><b>{percent(row.annualizedYield)}</b></div>
        <div><span>Upside retained</span><b>{percent(row.upside)}</b></div>
        <div><span>Break-even</span><b>{money(row.breakEven, 2)}</b></div>
        <div><span>Realized volatility</span><b>{percent(row.annualizedVolatility)}</b></div>
      </div>
      <div className="range">
        <span>Recent range {money(row.rangeLow,2)}–{money(row.rangeHigh,2)}</span>
        <span>Earnings {row.earningsDate || "not found in next 120 days"}</span>
      </div>
      <p className="warning">{row.warning}</p>
      {row.uncoveredShares > 0 && <p className="micro">{row.uncoveredShares} shares remain uncovered because calls use 100-share contracts.</p>}
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
