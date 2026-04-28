import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

function currency(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  return Number(n).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState("portfolio");
  const [targetWeeksOut, setTargetWeeksOut] = useState(2);
  const [targetPercentAbove, setTargetPercentAbove] = useState(5);
  const [ran, setRan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [portfolio, setPortfolio] = useState([
    { ticker: "AAPL", shares: 300 },
    { ticker: "MSFT", shares: 200 },
    { ticker: "NVDA", shares: 100 },
  ]);

  const [results, setResults] = useState([]);

  const portfolioValue = useMemo(() => {
    return results.reduce((sum, row) => {
      return sum + Number(row.price || 0) * Number(row.shares || 0);
    }, 0);
  }, [results]);

  const green = results.filter((r) => r.category === "green");
  const yellow = results.filter((r) => r.category === "yellow");
  const red = results.filter((r) => r.category === "red");

  const totalIncome = results.reduce((sum, r) => sum + Number(r.income || 0), 0);
  const greenIncome = green.reduce((sum, r) => sum + Number(r.income || 0), 0);
  const yellowIncome = yellow.reduce((sum, r) => sum + Number(r.income || 0), 0);
  const redIncome = red.reduce((sum, r) => sum + Number(r.income || 0), 0);

  async function runAnalysis() {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          portfolio,
          targetWeeksOut,
          targetPercentAbove,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResults(data.results || []);
      setRan(true);
      setActivePage("resultsTable");
    } catch (error) {
      setErrorMessage(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function ResultsSummary() {
    return (
      <div className="summary-grid">
        <div className="summary-card">
          <span>Total Potential Earnings</span>
          <b>{currency(totalIncome)}</b>
        </div>

        <div className="summary-card green">
          <span>Green Earnings</span>
          <b>{currency(greenIncome)}</b>
        </div>

        <div className="summary-card yellow">
          <span>Yellow Earnings</span>
          <b>{currency(yellowIncome)}</b>
        </div>

        <div className="summary-card red">
          <span>Red Earnings</span>
          <b>{currency(redIncome)}</b>
        </div>
      </div>
    );
  }

  function ResultCard({ r }) {
    return (
      <div className={`card result-card ${r.category}`}>
        <h2>{r.ticker}</h2>

        <p>Current stock price: <b>{currency(r.price)}</b></p>
        <p>Strike you are selling: <b>{currency(r.strike)}</b></p>
        <p>Minimum % above current price: <b>{Number(r.upside || 0).toFixed(2)}%</b></p>
        <p>Expiration: <b>{r.expiration}</b></p>
        <p>Premium you will receive: <b>{currency(r.premium)}</b></p>
        <p>Estimated cash income: <b>{currency(r.income)}</b></p>
        <p>Return from premium: <b>{Number(r.optionYield || 0).toFixed(2)}%</b></p>
        <p>Assignment risk score: <b>{r.risk}</b></p>

        <div className="range-box">
          <b>{targetWeeksOut}-week trading range:</b><br />
          {currency(r.rangeLow)} – {currency(r.rangeHigh)}
        </div>

        <div className={`warning ${r.warning?.color || "green"}`}>
          <b>Earnings check:</b><br />
          Earnings date: {r.earningsDate || "Coming soon"}<br />
          {r.warning?.text || "Earnings check will be added next."}
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
              tickers, run weekly scans, and get simple income recommendations.
            </p>
            <div className="hero-list">
              <div>🔒 User login and saved portfolios</div>
              <div>📊 Covered call scoring and recommendation cards</div>
              <div>💵 Built for monthly subscription access</div>
            </div>
          </div>

          <div className="card login-card">
            <h2>Sign in</h2>
            <p>Demo login for prototype</p>
            <label>Email</label>
            <input value="demo@yieldpilot.com" readOnly />
            <label>Password</label>
            <input value="password123" type="password" readOnly />
            <button onClick={() => setLoggedIn(true)}>Open Dashboard</button>
            <p className="small-note">
              In the real product this connects to user accounts, saved portfolios,
              live market data, and Stripe subscription status.
            </p>
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
        <button onClick={() => setActivePage("resultsTable")}>Results Table</button>
        <button onClick={() => setActivePage("resultsCards")}>Results Cards</button>
        <button onClick={() => setActivePage("settings")}>Settings</button>
      </nav>

      {activePage === "portfolio" && (
        <section className="card">
          <h2>Saved Portfolio</h2>
          <p>Enter ticker symbols and shares.</p>

          {errorMessage && (
            <div className="warning red">
              <b>Error:</b><br />
              {errorMessage}
            </div>
          )}

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
                const matchingResult = results.find(
                  (r) => r.ticker === row.ticker.toUpperCase().trim()
                );
                const price = matchingResult ? matchingResult.price : null;
                const value = price ? price * Number(row.shares || 0) : null;

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

                    <td>{price ? currency(price) : "Run analysis"}</td>
                    <td><b>{value ? currency(value) : "-"}</b></td>
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

          <button onClick={runAnalysis} disabled={loading}>
            {loading ? "Running..." : "Run Covered Call Analysis"}
          </button>
        </section>
      )}

      {activePage === "resultsTable" && (
        <section>
          {!ran ? (
            <div className="card">
              <h2>No table yet</h2>
              <p>Go to Portfolio and click Run Covered Call Analysis.</p>
            </div>
          ) : (
            <>
              <ResultsSummary />

              <div className="card">
                <h2>Results Table</h2>
                <p>
                  Same recommendations as the card view, shown in a spreadsheet-style format.
                </p>

                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Ticker</th>
                      <th>Shares</th>
                      <th>Stock<br />Price</th>
                      <th>Strike<br />you are<br />selling</th>
                      <th>Expiration</th>
                      <th>Premium<br />you will<br />receive</th>
                      <th>Cash<br />Income</th>
                      <th>Return<br />from<br />Premium</th>
                      <th>Minimum %<br />above<br />current price</th>
                      <th>Risk</th>
                    </tr>
                  </thead>

                  <tbody>
                    {results.map((r) => (
                      <React.Fragment key={r.ticker}>
                        <tr className={`table-main-row ${r.category}`}>
                          <td>
                            <span className={`status-pill ${r.category}`}>
                              {r.category.toUpperCase()}
                            </span>
                          </td>
                          <td><b>{r.ticker}</b></td>
                          <td>{r.shares}</td>
                          <td>{currency(r.price)}</td>
                          <td><b>{currency(r.strike)}</b></td>
                          <td>{r.expiration}</td>
                          <td>{currency(r.premium)}</td>
                          <td><b>{currency(r.income)}</b></td>
                          <td>{Number(r.optionYield || 0).toFixed(2)}%</td>
                          <td>{Number(r.upside || 0).toFixed(2)}%</td>
                          <td><b>{r.risk}</b></td>
                        </tr>

                        <tr className={`table-detail-row ${r.category}`}>
                          <td></td>
                          <td colSpan="10">
                            <div className="table-detail-grid">
                              <div>
                                <b>{targetWeeksOut}-week trading range:</b><br />
                                {currency(r.rangeLow)} – {currency(r.rangeHigh)}
                              </div>

                              <div>
                                <b>Earnings date:</b><br />
                                {r.earningsDate || "Coming soon"}
                              </div>

                              <div>
                                <b>Earnings check:</b><br />
                                {r.warning?.text || "Earnings check will be added next."}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan="7"><b>Total Potential Earnings</b></td>
                      <td><b>{currency(totalIncome)}</b></td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {activePage === "resultsCards" && (
        <section>
          {!ran ? (
            <div className="card">
              <h2>No analysis run yet</h2>
              <p>Go to Portfolio and click Run Covered Call Analysis.</p>
            </div>
          ) : (
            <>
              <ResultsSummary />

              <h2 className="section-title green-text">Green — cleaner setups</h2>
              <div className="results-grid">
                {green.map((r) => <ResultCard key={r.ticker} r={r} />)}
              </div>

              <h2 className="section-title yellow-text">Yellow — near recent trading range</h2>
              <div className="results-grid">
                {yellow.map((r) => <ResultCard key={r.ticker} r={r} />)}
              </div>

              <h2 className="section-title red-text">Red — earnings risk</h2>
              <div className="results-grid">
                {red.map((r) => <ResultCard key={r.ticker} r={r} />)}
              </div>
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
