import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Trash2, TrendingUp, ShieldCheck, DollarSign, AlertTriangle, Lock, User, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import './style.css';

const sampleMarketData = {
  AAPL: { price: 173.42, options: [{ expiration: '2026-05-15', strike: 180, bid: 1.42, ask: 1.55, volume: 11430 }] },
  MSFT: { price: 421.18, options: [{ expiration: '2026-05-15', strike: 435, bid: 3.25, ask: 3.55, volume: 7291 }] },
  NVDA: { price: 907.66, options: [{ expiration: '2026-05-15', strike: 960, bid: 13.8, ask: 14.6, volume: 15901 }] },
  AMZN: { price: 184.35, options: [{ expiration: '2026-05-15', strike: 195, bid: 1.85, ask: 2.01, volume: 6504 }] },
  TSLA: { price: 169.76, options: [{ expiration: '2026-05-15', strike: 185, bid: 4.1, ask: 4.45, volume: 20192 }] },
};

function currency(value) { return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }); }
function pct(value) { return `${value.toFixed(2)}%`; }
function scoreTrade(row, option) {
  const mid = (option.bid + option.ask) / 2;
  const contracts = Math.floor(row.shares / 100);
  const premiumIncome = mid * 100 * contracts;
  const yieldOnStock = (mid / row.price) * 100;
  const upside = ((option.strike - row.price) / row.price) * 100;
  const liquidityScore = option.volume > 10000 ? 95 : option.volume > 5000 ? 82 : 68;
  const safetyScore = upside > 7 ? 92 : upside > 4 ? 80 : 62;
  const incomeScore = yieldOnStock > 1.5 ? 93 : yieldOnStock > 0.75 ? 80 : 65;
  const totalScore = Math.round(incomeScore * 0.35 + safetyScore * 0.4 + liquidityScore * 0.25);
  const risk = totalScore >= 85 ? 'Conservative' : totalScore >= 75 ? 'Balanced' : 'Aggressive';
  return { mid, contracts, premiumIncome, yieldOnStock, upside, liquidityScore, safetyScore, incomeScore, totalScore, risk };
}
function Button({children, onClick, variant=''}) { return <button className={`btn ${variant}`} onClick={onClick}>{children}</button>; }
function Input(props) { return <input className="input" {...props}/>; }
function Card({children, className=''}) { return <div className={`card ${className}`}>{children}</div>; }
function Badge({children}) { return <span className="badge">{children}</span>; }

function RecommendationCard({ result }) {
  return <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><Card className={result.score.totalScore >= 85 ? 'green' : result.score.totalScore >= 75 ? 'blue' : 'amber'}>
    <div className="row between top"><div><div className="row gap"><h3>{result.ticker}</h3><Badge>{result.score.risk}</Badge></div><p>Current stock price: <b>{currency(result.price)}</b></p></div><div className="score"><small>YieldPilot Score</small><b>{result.score.totalScore}</b></div></div>
    <div className="grid4"><div><small>Suggested strike</small><b>{currency(result.option.strike)}</b></div><div><small>Expiration</small><b>{result.option.expiration}</b></div><div><small>Estimated premium</small><b>{currency(result.score.mid)}</b></div><div><small>Cash income</small><b>{currency(result.score.premiumIncome)}</b></div></div>
    <div className="grid3"><span><TrendingUp size={16}/> Upside: <b>{pct(result.score.upside)}</b></span><span><DollarSign size={16}/> Option yield: <b>{pct(result.score.yieldOnStock)}</b></span><span><ShieldCheck size={16}/> Liquidity: <b>{result.score.liquidityScore}</b></span></div>
    <p className="takeaway"><b>Plain-English takeaway:</b> This trade offers {pct(result.score.yieldOnStock)} premium income with {pct(result.score.upside)} room before the stock reaches the strike. It is ranked as {result.score.risk.toLowerCase()} based on income, upside cushion, and option liquidity.</p>
  </Card></motion.div>;
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState('portfolio');
  const [ran, setRan] = useState(false);
  const [portfolio, setPortfolio] = useState([{ticker:'AAPL',shares:300},{ticker:'MSFT',shares:200},{ticker:'NVDA',shares:100}]);
  const eligibleRows = useMemo(() => portfolio.map(r => ({...r, ticker:r.ticker.trim().toUpperCase(), market:sampleMarketData[r.ticker.trim().toUpperCase()]})).filter(r => r.market && r.shares >= 100).map(r => { const price = r.market.price; const option = r.market.options[0]; return {ticker:r.ticker, shares:r.shares, price, option, score:scoreTrade({...r, price}, option)}; }).sort((a,b)=>b.score.totalScore-a.score.totalScore), [portfolio]);
  const totalIncome = eligibleRows.reduce((s,r)=>s+r.score.premiumIncome,0);
  const totalMarketValue = eligibleRows.reduce((s,r)=>s+r.price*r.shares,0);
  if (!loggedIn) return <div className="hero"><div className="heroInner"><motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}><Badge>Covered Call SaaS Prototype</Badge><h1>YieldPilot</h1><p>A portfolio-based covered call analyzer where subscribers save tickers, run weekly scans, and get simple income recommendations.</p><div className="features"><span><Lock/> User login and saved portfolios</span><span><BarChart3/> Covered call recommendation cards</span><span><DollarSign/> Built for monthly subscription access</span></div></motion.div><Card className="login"><div className="row gap"><User/><div><h2>Sign in</h2><p>Demo login</p></div></div><label>Email</label><Input defaultValue="demo@yieldpilot.com"/><label>Password</label><Input type="password" value="password123" readOnly/><Button onClick={()=>setLoggedIn(true)}>Open Dashboard</Button><small>In the real product this connects to Supabase/Firebase auth and Stripe subscription status.</small></Card></div></div>;
  return <div className="app"><div className="wrap"><div className="row between"><div><h1>YieldPilot Dashboard</h1><p>Logged in as demo@yieldpilot.com</p></div><Button variant="outline" onClick={()=>setLoggedIn(false)}>Log out</Button></div><div className="tabs"><button onClick={()=>setTab('portfolio')} className={tab==='portfolio'?'active':''}>Portfolio</button><button onClick={()=>setTab('results')} className={tab==='results'?'active':''}>Results</button><button onClick={()=>setTab('settings')} className={tab==='settings'?'active':''}>Settings</button></div>{tab==='portfolio' && <div className="layout"><Card className="main"><div className="row between"><div><h2>Saved Portfolio</h2><p>Enter ticker symbols and share count. Covered calls require at least 100 shares.</p></div><Button variant="outline" onClick={()=>setPortfolio([...portfolio,{ticker:'',shares:100}])}><Plus size={16}/> Add</Button></div>{portfolio.map((row,i)=><div className="portfolioRow" key={i}><Input value={row.ticker} onChange={e=>setPortfolio(portfolio.map((r,idx)=>idx===i?{...r,ticker:e.target.value.toUpperCase()}:r))} placeholder="Ticker"/><Input type="number" value={row.shares} onChange={e=>setPortfolio(portfolio.map((r,idx)=>idx===i?{...r,shares:Number(e.target.value)}:r))}/><Button variant="outline" onClick={()=>setPortfolio(portfolio.filter((_,idx)=>idx!==i))}><Trash2 size={16}/></Button></div>)}<Button onClick={()=>{setRan(true); setTab('results')}}>Run Covered Call Analysis</Button></Card><Card><h2>Account Plan</h2><p>Example subscription structure.</p><div className="plan"><small>Current plan</small><b>Pro</b><span>$29/month</span></div><p>✓ Saved portfolios<br/>✓ Weekly scans<br/>✓ Income and risk scoring<br/>✓ Exportable reports</p></Card></div>}{tab==='results' && (!ran ? <Card className="empty"><AlertTriangle/><h2>No analysis run yet</h2><p>Go to Portfolio and click “Run Covered Call Analysis.”</p></Card> : <div className="results"><div className="stats"><Card><small>Estimated cash income</small><b>{currency(totalIncome)}</b></Card><Card><small>Covered market value</small><b>{currency(totalMarketValue)}</b></Card><Card><small>Eligible positions</small><b>{eligibleRows.length}</b></Card></div>{eligibleRows.map(r=><RecommendationCard key={r.ticker} result={r}/>)}</div>)}{tab==='settings' && <Card><h2>Analysis Settings</h2><p>These would control the agent logic in the live version.</p><div className="settings"><label>Target weeks out<Input defaultValue="2-4"/></label><label>Minimum strike above stock<Input defaultValue="4%"/></label><label>Minimum option volume<Input defaultValue="500"/></label></div><p className="note"><b>Compliance note:</b> The production version should present this as educational software, not personalized financial advice.</p></Card>}</div></div>;
}

createRoot(document.getElementById('root')).render(<App/>);
