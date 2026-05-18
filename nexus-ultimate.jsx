import{useState,useEffect,useRef,useMemo,useCallback}from"react";

// ════════════════════════════════════════════════════════════════════════════
// NEXUS ULTIMATE — The Complete Trading Intelligence Operating System
// 23 Layers · 9 Cohorts · 5 Engines · 17 Panels · From Intelligence to Execution
// ════════════════════════════════════════════════════════════════════════════

const C={bg:"#030711",s1:"#0a1118",s2:"#0e1722",s3:"#141f2e",bd:"#1a2844",
ac:"#00d4ff",a2:"#8b5cf6",a3:"#10b981",gn:"#22c55e",rd:"#ef4444",am:"#f59e0b",
or:"#f97316",pk:"#ec4899",tx:"#e2e8f0",t2:"#64748b",t3:"#334155"};
const FM=`'IBM Plex Mono',monospace`,FD=`'Lexend',sans-serif`;

// ─── CANDLE DATA ─────────────────────────────────────────
const genCandles=(n=60)=>{let p=79800;return Array.from({length:n},(_,i)=>{
  const o=p,c=o+(Math.random()-.48)*120,h=Math.max(o,c)+(Math.random()*60),l=Math.min(o,c)-(Math.random()*60),v=Math.random()*800+200;
  p=c;return{o:+o.toFixed(0),c:+c.toFixed(0),h:+h.toFixed(0),l:+l.toFixed(0),v:+v.toFixed(0),t:i};
})};
const CANDLES=genCandles(80);

// ─── CORE DATA ───────────────────────────────────────────
const LAYERS=[
  {id:1,n:"Pre-Market Intel",cat:"INPUT",lt:340,cf:94},{id:2,n:"Data Ingestion",cat:"INPUT",lt:12,cf:99},
  {id:3,n:"Internet Access",cat:"INPUT",lt:890,cf:87},{id:4,n:"Alt Data",cat:"INPUT",lt:2100,cf:76},
  {id:5,n:"Sentiment",cat:"SIGNAL",lt:450,cf:88},{id:6,n:"MM Detection",cat:"SIGNAL",lt:85,cf:82},
  {id:7,n:"Retail Exploit",cat:"SIGNAL",lt:320,cf:79},{id:8,n:"Inst. Flow",cat:"SIGNAL",lt:180,cf:91},
  {id:9,n:"Query Parser",cat:"PROCESS",lt:95,cf:96},{id:10,n:"Context Engine",cat:"PROCESS",lt:210,cf:93},
  {id:11,n:"Regime Intel",cat:"ANALYSIS",lt:420,cf:89},{id:12,n:"Adversarial",cat:"ANALYSIS",lt:65,cf:85},
  {id:13,n:"Orchestration",cat:"CORE",lt:48,cf:95},{id:14,n:"9 Cohorts",cat:"CORE",lt:380,cf:90},
  {id:15,n:"Knowledge Base",cat:"STORAGE",lt:8,cf:98},{id:16,n:"Risk Engine",cat:"RISK",lt:55,cf:97},
  {id:17,n:"Stat Validation",cat:"RISK",lt:290,cf:92},{id:18,n:"Execution",cat:"EXEC",lt:23,cf:96},
  {id:19,n:"Compliance",cat:"EXEC",lt:5,cf:100},{id:20,n:"Self-Improve",cat:"EVOLVE",lt:15e3,cf:86},
  {id:21,n:"Feedback Loop",cat:"EVOLVE",lt:1200,cf:88},{id:22,n:"Human Ctrl",cat:"CTRL",lt:2,cf:100},
  {id:23,n:"Synthesizer",cat:"OUTPUT",lt:650,cf:91},
];

const STOCKS=[
  {s:"RELIANCE",n:"Reliance Ind.",p:2847.5,ch:2.34,sec:"Energy",ai:87,imp:72,sig:["Bullish","OBI+"],ev:["Jio tariff→ARPU","Crude drop→margins"],gk:{d:.68,g:.04,t:-12.5,v:18.2}},
  {s:"TCS",n:"Tata Consultancy",p:4012.8,ch:-.87,sec:"IT",ai:62,imp:45,sig:["Mean Rev","Weak Vol"],ev:["US recession→IT cut","Q3 pipeline $8.1B"],gk:{d:-.32,g:.02,t:-8.4,v:12.1}},
  {s:"HDFCBANK",n:"HDFC Bank",p:1678.3,ch:1.12,sec:"Banking",ai:78,imp:68,sig:["Breakout","Strong OFI"],ev:["RBI cut→NIM","NPA 5yr low"],gk:{d:.55,g:.03,t:-10.1,v:15.8}},
  {s:"INFY",n:"Infosys",p:1823.6,ch:-1.45,sec:"IT",ai:48,imp:55,sig:["Bear Div","Delta-"],ev:["Whistleblower","AI revenue+"],gk:{d:-.45,g:.03,t:-9.2,v:14.3}},
  {s:"BHARTIARTL",n:"Bharti Airtel",p:1567.2,ch:3.21,sec:"Telecom",ai:82,imp:78,sig:["Uptrend","OBI Surge"],ev:["5G→200M subs","ARPU→₹300"],gk:{d:.72,g:.05,t:-15.3,v:22.1}},
  {s:"TATAMOTORS",n:"Tata Motors",p:945.7,ch:4.56,sec:"Auto",ai:91,imp:85,sig:["Breakout!","Vol Spike"],ev:["JLR EV success","EV share 73%"],gk:{d:.82,g:.06,t:-18.7,v:25.4}},
  {s:"SBIN",n:"State Bank",p:782.4,ch:-.32,sec:"PSU Bank",ai:56,imp:42,sig:["Range","Neutral"],ev:["Disinvestment","Rural credit+"],gk:{d:.15,g:.01,t:-5.2,v:8.3}},
  {s:"ICICIBANK",n:"ICICI Bank",p:1245.9,ch:.78,sec:"Banking",ai:74,imp:61,sig:["Accumulation","Greeks+"],ev:["Credit 16% YoY","Digital+45%"],gk:{d:.48,g:.02,t:-7.8,v:11.5}},
];

const EVENTS=[
  {id:1,tm:"09:15",t:"RBI MPC: Rate Cut 25bps",sv:"high",cat:"Policy",stk:["HDFCBANK","ICICIBANK","SBIN"],se:.72,rg:"India"},
  {id:2,tm:"10:30",t:"Brent Crude < $68",sv:"high",cat:"Commodity",stk:["RELIANCE","BHARTIARTL"],se:.65,rg:"Global"},
  {id:3,tm:"11:45",t:"Fed Chair: Dovish Pivot",sv:"med",cat:"Macro",stk:["TCS","INFY"],se:.58,rg:"US"},
  {id:4,tm:"13:00",t:"Tata Motors Q3 Beat",sv:"high",cat:"Earnings",stk:["TATAMOTORS"],se:.89,rg:"India"},
  {id:5,tm:"14:30",t:"SEBI F&O Tightening",sv:"med",cat:"Regulatory",stk:["HDFCBANK","ICICIBANK"],se:-.34,rg:"India"},
  {id:6,tm:"15:00",t:"Iran-Israel: Hormuz",sv:"high",cat:"Geopolitical",stk:["RELIANCE","SBIN"],se:-.55,rg:"M.East"},
];

const APIS_INIT=[
  {id:1,n:"Zerodha Kite",ty:"Broker",st:"active",lt:"23ms",ic:"📊"},{id:2,n:"Angel One",ty:"Broker",st:"active",lt:"31ms",ic:"📈"},
  {id:3,n:"NSE Live Feed",ty:"Data",st:"active",lt:"12ms",ic:"🏛️"},{id:4,n:"TrueData",ty:"Data",st:"active",lt:"8ms",ic:"⚡"},
  {id:5,n:"Reuters Wire",ty:"News",st:"active",lt:"120ms",ic:"📰"},{id:6,n:"Twitter/X",ty:"Sentiment",st:"paused",lt:"—",ic:"🐦"},
  {id:7,n:"Amazon Bedrock",ty:"AI/LLM",st:"active",lt:"380ms",ic:"🧠"},{id:8,n:"NSDL FPI",ty:"Flow",st:"active",lt:"450ms",ic:"🏦"},
  {id:9,n:"RBI DBIE",ty:"Macro",st:"active",lt:"230ms",ic:"🇮🇳"},{id:10,n:"GIFT Nifty",ty:"Data",st:"active",lt:"45ms",ic:"🌏"},
  {id:11,n:"BSE Bhavcopy",ty:"Data",st:"active",lt:"67ms",ic:"📋"},{id:12,n:"Google Trends",ty:"Alt",st:"active",lt:"1.2s",ic:"📊"},
];

const GEX=Array.from({length:25},(_,i)=>{const s=78800+i*100,d=(s-79800)/400;
  const cg=Math.max(0,900-Math.abs(d)*180+Math.random()*100);const pg=Math.max(0,700-Math.abs(d)*160+Math.random()*80);
  return{s,cg:Math.round(cg),pg:-Math.round(pg),net:Math.round(cg-pg)};
});

const COUNTRIES=[
  {n:"US",x:18,y:36,w:14,h:10,rk:"med",v:"+0.84%"},{n:"China",x:66,y:33,w:10,h:9,rk:"high",v:"-1.2%"},
  {n:"India",x:61,y:46,w:5,h:7,rk:"low",v:"+0.72%"},{n:"Japan",x:79,y:33,w:5,h:5,rk:"low",v:"+1.1%"},
  {n:"Russia",x:54,y:18,w:18,h:10,rk:"crit",v:"-2.1%"},{n:"Saudi",x:51,y:43,w:4,h:4,rk:"high",v:"-0.8%"},
  {n:"UK",x:41,y:26,w:4,h:4,rk:"med",v:"+0.31%"},{n:"Brazil",x:25,y:58,w:7,h:8,rk:"med",v:"+0.22%"},
];
const RK={low:C.gn,med:C.am,high:C.or,crit:C.rd};

// Options chain data for heatmap
const OI_CHAIN=Array.from({length:15},(_,i)=>{const s=79100+i*100;return{
  s,ce_oi:Math.round(Math.random()*50000+5000),pe_oi:Math.round(Math.random()*50000+5000),
  ce_iv:+(12+Math.random()*8+(Math.abs(i-7))*1.2).toFixed(1),pe_iv:+(13+Math.random()*8+(Math.abs(i-7))*1.4).toFixed(1),
  ce_chg:+(Math.random()*20-8).toFixed(1),pe_chg:+(Math.random()*20-8).toFixed(1),
}});

// Trade autopsy data
const TRADES=[
  {id:1,sym:"SENSEX 79800CE",dir:"BUY",entry:245,exit:312,pnl:"+₹6,700",q:"GP/GO",layers:"L11(85%)+L6(GEX+)+L5(72)",dur:"2h 15m"},
  {id:2,sym:"NIFTY 24900PE",dir:"SELL",entry:180,exit:145,pnl:"+₹3,500",q:"GP/GO",layers:"L11(range)+L6(PutWall)+L17(valid)",dur:"4h 30m"},
  {id:3,sym:"SENSEX 80200CE",dir:"BUY",entry:120,exit:98,pnl:"-₹2,200",q:"GP/BO",layers:"L11(trending)+L8(FII+)—theta decay",dur:"1d 2h"},
  {id:4,sym:"NIFTY 24700PE",dir:"BUY",entry:155,exit:210,pnl:"+₹5,500",q:"BP/GO",layers:"L14/C6 overrode L11—lucky reversal⚠",dur:"45m"},
  {id:5,sym:"SENSEX 79500PE",dir:"SELL",entry:195,exit:260,pnl:"-₹6,500",q:"BP/BO",layers:"Ignored L12 anomaly flag. Root cause: spoofing",dur:"3h"},
];

// Strategy lifecycle
const STRATEGIES=[
  {n:"iron_condor_adaptive",st:"Live Full",sh:1.87,wr:72,dd:-6.2,elo:1720,phase:5},
  {n:"momentum_breakout_v3",st:"Paper",sh:1.42,wr:61,dd:-8.7,elo:1580,phase:3},
  {n:"vwap_reversion_v2",st:"Backtest",sh:1.18,wr:58,dd:-11.2,elo:1450,phase:2},
  {n:"oi_divergence_signal",st:"Dev",sh:.94,wr:55,dd:-13.8,elo:1380,phase:1},
  {n:"fvg_momentum_play",st:"Live Small",sh:1.65,wr:67,dd:-7.1,elo:1680,phase:4},
  {n:"gamma_scalp_v4",st:"Live Full",sh:2.12,wr:74,dd:-4.8,elo:1715,phase:5},
  {n:"mean_rev_bollinger",st:"Retired",sh:.42,wr:49,dd:-18.3,elo:1280,phase:0},
];

const NOTIFICATIONS=[
  {p:0,t:"Layer 12 anomaly: VPIN spike 0.91 on SENSEX options",tm:"2m ago",c:C.rd},
  {p:1,t:"New signal: SENSEX 80000CE BUY @ ₹248 (88% conf)",tm:"5m ago",c:C.or},
  {p:1,t:"P&L alert: +₹12,450 today (+1.55%)",tm:"12m ago",c:C.gn},
  {p:2,t:"Tool approval needed: momentum_breakout_v3",tm:"2h ago",c:C.am},
  {p:2,t:"Engine 2: CUSUM alert on Cohort 3 (Volume)",tm:"3h ago",c:C.am},
  {p:3,t:"Daily summary generated — 8 trades, 6 winners",tm:"6h ago",c:C.t2},
];

// ─── COMPONENTS ──────────────────────────────────────────
const Bd=({children,color:c=C.ac,s})=><span style={{display:"inline-flex",padding:s?"1px 4px":"2px 6px",borderRadius:3,fontSize:s?7:8,fontFamily:FM,fontWeight:600,color:c,background:`${c}12`,border:`1px solid ${c}20`,letterSpacing:.3,lineHeight:s?"11px":"13px",whiteSpace:"nowrap"}}>{children}</span>;
const Br=({v,mx=100,c,h=3})=><div style={{width:"100%",height:h,background:C.bd,borderRadius:2,overflow:"hidden"}}><div style={{width:`${Math.min(100,(v/mx)*100)}%`,height:"100%",background:c,borderRadius:2,transition:"width .5s"}}/></div>;
const Cd=({children,style:st={},gl})=><div style={{background:C.s1,border:`1px solid ${gl||C.bd}`,borderRadius:5,padding:10,...st}}>{children}</div>;
const Lb=({children,c=C.ac,i})=><div style={{fontSize:8,fontWeight:600,letterSpacing:1.5,color:c,marginBottom:6,fontFamily:FM,display:"flex",alignItems:"center",gap:3}}>{i&&<span style={{fontSize:10}}>{i}</span>}{children}</div>;
const St=({l,v,s,c=C.ac,sm})=><div style={{background:C.s2,borderRadius:3,padding:sm?"4px 5px":"6px 8px",textAlign:"center"}}><div style={{fontSize:7,color:C.t2,letterSpacing:.8}}>{l}</div><div style={{fontSize:sm?11:14,fontWeight:700,fontFamily:FD,color:c}}>{v}</div>{s&&<div style={{fontSize:7,color:C.t2}}>{s}</div>}</div>;
const Sk=({data,c,w=56,h=14})=>{const mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1;return<svg width={w} height={h}><polyline points={data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/r)*h}`).join(" ")} fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>};
const spk=k=>{if(!window._s)window._s={};if(!window._s[k])window._s[k]=Array.from({length:20},()=>Math.random()*100);return window._s[k]};
const CC={INPUT:"#22d3ee",SIGNAL:C.a3,PROCESS:C.a2,ANALYSIS:C.am,CORE:C.ac,STORAGE:"#818cf8",RISK:C.rd,EXEC:C.or,EVOLVE:C.pk,CTRL:C.gn,OUTPUT:"#a78bfa"};

// ─── CANDLESTICK CHART ───────────────────────────────────
const CandleChart=({data,width:W=600,height:H=220})=>{
  const vis=data.slice(-50);const mn=Math.min(...vis.map(c=>c.l));const mx=Math.max(...vis.map(c=>c.h));
  const vMx=Math.max(...vis.map(c=>c.v));const r=mx-mn||1;const cW=(W-40)/vis.length;const pH=H-40;const vH=35;
  const y=v=>8+(1-(v-mn)/r)*(pH-vH);
  return(
    <svg width={W} height={H} style={{display:"block"}}>
      <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.ac} stopOpacity=".3"/><stop offset="1" stopColor={C.ac} stopOpacity="0"/></linearGradient></defs>
      {[.25,.5,.75].map(p=><g key={p}><line x1="30" y1={8+(1-p)*(pH-vH)} x2={W} y2={8+(1-p)*(pH-vH)} stroke={C.bd} strokeWidth=".5" strokeDasharray="2"/>
        <text x="2" y={8+(1-p)*(pH-vH)+3} fill={C.t3} fontSize="7" fontFamily={FM}>{(mn+r*p).toFixed(0)}</text></g>)}
      {vis.map((c,i)=>{const x=30+i*cW+cW/2;const bull=c.c>=c.o;const cl=bull?C.gn:C.rd;
        return(<g key={i}>
          <rect x={x-1} y={H-5-(c.v/vMx)*vH} width={Math.max(2,cW-3)} height={(c.v/vMx)*vH} fill={`${cl}25`} rx="1"/>
          <line x1={x} y1={y(c.h)} x2={x} y2={y(c.l)} stroke={cl} strokeWidth=".8"/>
          <rect x={x-Math.max(1,(cW-4)/2)} y={y(Math.max(c.o,c.c))} width={Math.max(2,cW-4)} height={Math.max(1,Math.abs(y(c.o)-y(c.c)))} fill={bull?cl:`${cl}`} rx=".5" stroke={cl} strokeWidth=".3"/>
        </g>);
      })}
      <line x1="30" y1={y(79800)} x2={W} y2={y(79800)} stroke={C.ac} strokeWidth=".5" strokeDasharray="3"/>
      <text x={W-40} y={y(79800)-3} fill={C.ac} fontSize="7" fontFamily={FM}>79,800</text>
    </svg>
  );
};

// ─── GAUGE COMPONENT ─────────────────────────────────────
const Gauge=({value,label,min=0,max=100})=>{
  const pct=(value-min)/(max-min);const angle=-90+pct*180;
  const c=pct<.25?C.gn:pct<.5?C.am:pct<.75?C.or:C.rd;
  const labels=["EXTREME FEAR","FEAR","NEUTRAL","GREED","EXTREME GREED"];
  const idx=Math.min(4,Math.floor(pct*5));
  return(
    <div style={{textAlign:"center"}}>
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke={C.bd} strokeWidth="8" strokeLinecap="round"/>
        <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke={`url(#gg)`} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct*188} 188`}/>
        <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.gn}/><stop offset=".5" stopColor={C.am}/><stop offset="1" stopColor={C.rd}/></linearGradient></defs>
        <line x1="70" y1="70" x2={70+Math.cos(angle*Math.PI/180)*45} y2={70+Math.sin(angle*Math.PI/180)*45} stroke={c} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="70" cy="70" r="4" fill={c}/>
        <text x="70" y="58" textAnchor="middle" fill={c} fontSize="18" fontWeight="700" fontFamily={FD}>{value}</text>
      </svg>
      <div style={{fontSize:8,color:c,fontWeight:600,fontFamily:FM,marginTop:-4}}>{labels[idx]}</div>
      <div style={{fontSize:7,color:C.t2}}>{label}</div>
    </div>
  );
};

// ─── ORDER BOOK DOM ──────────────────────────────────────
const DOM=()=>{
  const bids=Array.from({length:8},(_,i)=>({p:79800-i*5,q:Math.round(Math.random()*400+50)}));
  const asks=Array.from({length:8},(_,i)=>({p:79805+i*5,q:Math.round(Math.random()*400+50)}));
  const mx=Math.max(...[...bids,...asks].map(x=>x.q));
  return(
    <div style={{fontSize:9}}>
      {asks.reverse().map((a,i)=>(
        <div key={`a${i}`} style={{display:"flex",alignItems:"center",gap:4,padding:"1px 0",position:"relative"}}>
          <div style={{position:"absolute",right:0,height:"100%",width:`${(a.q/mx)*100}%`,background:`${C.rd}12`,borderRadius:2}}/>
          <span style={{width:50,textAlign:"right",color:C.rd,fontWeight:500,zIndex:1}}>{a.p.toLocaleString()}</span>
          <span style={{width:40,textAlign:"right",color:C.t2,zIndex:1}}>{a.q}</span>
        </div>
      ))}
      <div style={{padding:"3px 0",borderTop:`1px solid ${C.gn}30`,borderBottom:`1px solid ${C.rd}30`,textAlign:"center",fontWeight:700,color:C.ac,fontSize:11,margin:"2px 0"}}>79,802 <span style={{fontSize:8,color:C.t2}}>SPREAD: ₹5</span></div>
      {bids.map((b,i)=>(
        <div key={`b${i}`} style={{display:"flex",alignItems:"center",gap:4,padding:"1px 0",position:"relative"}}>
          <div style={{position:"absolute",right:0,height:"100%",width:`${(b.q/mx)*100}%`,background:`${C.gn}12`,borderRadius:2}}/>
          <span style={{width:50,textAlign:"right",color:C.gn,fontWeight:500,zIndex:1}}>{b.p.toLocaleString()}</span>
          <span style={{width:40,textAlign:"right",color:C.t2,zIndex:1}}>{b.q}</span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function Nexus(){
  const[tab,setTab]=useState("cmd");
  const[sub,setSub]=useState(null);
  const[stocks,setStocks]=useState(STOCKS);
  const[apis,setApis]=useState(APIS_INIT);
  const[showAdd,setShowAdd]=useState(null);
  const[nA,setNA]=useState({n:"",ty:"Data"});
  const[nS,setNS]=useState({s:"",n:""});
  const[selStk,setSelStk]=useState(null);
  const[selL,setSelL]=useState(null);
  const[selC,setSelC]=useState(null);
  const[chat,setChat]=useState([{r:"sys",t:"NEXUS ULTIMATE online. All 23 layers nominal. 9 cohorts active. 5 self-improvement engines running. Awaiting commands."}]);
  const[ci,setCi]=useState("");
  const[think,setThink]=useState(false);
  const[tm,setTm]=useState(new Date());
  const[killA,setKillA]=useState(false);
  const[killed,setKilled]=useState(false);
  const[apprs,setApprs]=useState([{id:1,n:"momentum_breakout_v3",sh:1.42,wr:61,st:"pending"},{id:2,n:"vwap_reversion_v2",sh:1.18,wr:58,st:"pending"}]);
  const[fgVal]=useState(68);
  const[globeRot,setGlobeRot]=useState(0);
  const cr=useRef(null);

  useEffect(()=>{const t=setInterval(()=>{setTm(new Date());setGlobeRot(r=>r+.15)},1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{cr.current?.scrollIntoView({behavior:"smooth"})},[chat]);

  const doChat=()=>{
    if(!ci.trim())return;setChat(p=>[...p,{r:"user",t:ci.trim()}]);setCi("");setThink(true);
    setTimeout(()=>{
      const R=[
`═══ FULL SIGNAL SYNTHESIS (All 23 Layers) ═══

L1 Pre-Market: GIFT Nifty +45pts, gap UP predicted (XGBoost conf: 78%)
L2 Data: Tick stream nominal, IV surface calibrated via SVI
L3 Internet: 3 bullish articles (ET, MC), 0 bearish. SEBI: no new circulars
L4 Alt Data: Google Trends "stock crash" at 12-month LOW → bullish signal
L5 Sentiment: Composite 72/100 (NLP:68, Social:75, Options:78, FII:71)
L6 GEX: +ve above 79,500. Gamma flip 79,780. Call Wall 80,200
L7 Retail: Dumb money buying 80,500CE aggressively → contrarian SHORT signal
L8 Institutional: VPIN 0.52 (normal). FII +₹2,400Cr. Block deals: 2 bullish
L9→L10: Query parsed, 3 analogues retrieved (Nov'24, Jul'24, Mar'24)
L11 Regime: TRENDING (HMM S3, P=85%). GARCH σ=14.2%. Kalman: ↑
L12 Adversarial: No anomalies. Trust scores: all >0.85
L13 Orchestration: Weighted vote → BULLISH 88%. No conflicts
L14 Cohorts: C1(RSI 68.4✓) C2(Delta+₹12Cr✓) C4(FVG 79,800✓) C5(GEX+✓)
L15 KB: 3 similar setups found, avg return +2.1% in 3 days
L16 Risk: Half-Kelly → 3 lots. VaR₉₅: ₹24,800. Within all limits
L17 Validation: p=0.003 ✓, PBO=0.18 ✓, SPRT: CONTINUE
L18 Execution: Adaptive limit ₹248, walk up ₹1/5s. VWAP slice
L19 Compliance: SEBI compliant. OPS: 4.2/s. Margin OK
L23 Output: SENSEX 80000CE BUY | Entry ₹245-255 | SL ₹198 | TP ₹310/365/420`,
`═══ SELF-IMPROVEMENT REPORT (Layer 20, 5 Engines) ═══

🔬 ENGINE 1 — TRADE AUTOPSY (Shapley Attribution)
Last 50 trades: 34 GP/GO, 8 GP/BO, 4 BP/GO⚠, 4 BP/BO
Top alpha source: C5 Options (32% Shapley value)
Worst: C7 Game Theory (-4%) → weight reduced 0.05→0.03
4 BP/GO flagged: lucky reversals where L14/C6 overrode L11

⛏️ ENGINE 2 — PATTERN FAILURE (CUSUM/SPRT/BOCD)
CUSUM ALERT: Cohort 3 (Volume) — RVOL signal degraded
20-trade WR: 58%→49%. Root cause: regime shift low-vol→trending
SPRT: REJECT edge for RVOL in trending regime → auto-downweight

🔍 ENGINE 3 — GAP DETECTOR (DBSCAN)
7 gaps found in coverage matrix [regime × vol × time × instrument]
Top 3 priorities: (1) High-vol bear + expiry day, (2) Pre-open auction signals, (3) FII flow reversal detection
These gaps being fed to Engine 4

🧬 ENGINE 4 — TOOL DEVELOPER (LLM + Genetic Programming)
Generated: momentum_breakout_v3 (hybrid LLM+GP)
Docker sandbox: PASSED (no net, 100MB, 30s)
Walk-forward: Sharpe 1.42, WR 61.2%, DD -8.7%, PBO 0.18
Correlation with existing: 0.23 (low = good diversification)
→ Submitted for your approval

🧪 ENGINE 5 — STRATEGY EVOLUTION (Optuna TPE)
500 trials completed. Best: iron_condor_adaptive (Sharpe 1.87)
PROMOTED: Paper → Live Small (25% size, 30-day eval)
DEMOTED: mean_rev_bollinger (Sharpe <0.5 for 60 days)
RETIRED: spread_fade_v1 (SPRT rejected edge)

📊 LAYER 21 — FEEDBACK LOOP
Thompson Sampling: Beta posteriors updated for all 9 cohorts
ELO: gamma_scalp_v4 climbed to 1715 (+35 this week)
ADWIN: No concept drift detected
TD(λ): 847 trades processed, temporal credit assigned`,
`═══ GEX + MARKET MICROSTRUCTURE (Layer 6) ═══

GAMMA EXPOSURE PROFILE (Lot size = 20):
GEX = Σ[OI_call × Γ_call × 20 × S² × 0.01 − OI_put × Γ_put × 20 × S² × 0.01]

Current Sensex: 79,802
Gamma Flip Level: 79,780 → ABOVE → Positive GEX territory
Call Wall: 80,200 (₹342Cr gamma) — HARD RESISTANCE
Put Wall: 79,200 (₹287Cr gamma) — STRONG SUPPORT
Max Pain: 79,800 — Gravitational pull for Thursday expiry

DEALER POSITIONING: LONG GAMMA
→ Dealers delta-hedge by selling rallies, buying dips
→ Expect MEAN-REVERTING price action within 79,200-80,200
→ Breakout requires: catalyst > Call Wall OR VPIN spike > 0.8

FLOW METRICS:
Charm Flow: +₹185 Cr/day delta-hedging from θ decay (supportive)
Vanna Flow: +₹42 Cr from IV decline → mildly bullish
Kyle's λ: 0.0034 (moderate price impact per unit volume)
VPIN: 0.52 (48th percentile — no informed trading detected)
Amihud ILLIQ: 0.0012 (highly liquid, tight spreads ₹0.5-₹2 ATM)

ORDER BOOK ANALYSIS:
Bid stacking at 79,750-79,780 (institutional accumulation zone)
Ask thinning above 80,100 → breakout would be fast if triggered
Cumulative Delta: +₹12.4Cr (persistent buying pressure)

⚠ Note: NSE has NO designated market makers for index options.
GEX calculations adjusted for prop desk/HFT liquidity structure.`
      ];setChat(p=>[...p,{r:"ai",t:R[Math.floor(Math.random()*R.length)]}]);setThink(false);
    },2500);
  };

  const IS={padding:"4px 6px",background:C.s2,border:`1px solid ${C.bd}`,borderRadius:3,color:C.tx,fontSize:9,fontFamily:FM,outline:"none"};

  const tabs=[
    {id:"cmd",l:"COMMAND",i:"◉"},{id:"chart",l:"CHARTS",i:"📊"},{id:"layers",l:"23 LAYERS",i:"▣"},
    {id:"geo",l:"GEO",i:"🌍"},{id:"sig",l:"SIGNALS",i:"⧫"},{id:"stk",l:"STOCKS",i:"▦"},
    {id:"gex",l:"GEX",i:"◆"},{id:"evt",l:"EVENTS",i:"⚡"},{id:"autopsy",l:"AUTOPSY",i:"🔬"},
    {id:"strat",l:"STRATEGIES",i:"🧪"},{id:"risk",l:"RISK",i:"◈"},{id:"api",l:"APIs",i:"⬢"},
    {id:"aws",l:"AWS",i:"☁"},{id:"ctrl",l:"CONTROL",i:"⏻"},{id:"notif",l:"ALERTS",i:"🔔"},
    {id:"chat",l:"TERMINAL",i:"▸"},
  ];

  return(
    <div style={{height:"100vh",background:C.bg,color:C.tx,fontFamily:FM,fontSize:10,display:"flex",flexDirection:"column"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Lexend:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;scrollbar-width:thin;scrollbar-color:${C.bd} transparent}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.bd};border-radius:2px}
        @keyframes p{0%,100%{opacity:1}50%{opacity:.3}}@keyframes su{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        input,select{font-family:${FM};outline:none}button{cursor:pointer;transition:all .12s}button:hover{filter:brightness(1.15)}`}</style>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 12px",borderBottom:`1px solid ${C.bd}`,background:C.s1,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:20,height:20,borderRadius:3,background:`linear-gradient(135deg,${C.ac},${C.a2})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:9,fontFamily:FD,color:C.bg}}>N</div>
          <span style={{fontFamily:FD,fontWeight:700,fontSize:11,letterSpacing:2,color:C.ac}}>NEXUS</span>
          <span style={{fontSize:7,color:C.t2,letterSpacing:1}}>ULTIMATE · 23L·9C·5E</span>
          {killed&&<Bd color={C.rd}>KILLED</Bd>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:9}}>
          <span style={{color:C.t2,fontSize:7}}>SENSEX</span><span style={{fontWeight:600,color:C.gn}}>79,876</span><span style={{color:C.gn,fontSize:7}}>+0.84%</span>
          <div style={{width:1,height:10,background:C.bd}}/>
          <span style={{color:C.t2,fontSize:7}}>NIFTY</span><span style={{fontWeight:600,color:C.gn}}>24,876</span>
          <div style={{width:1,height:10,background:C.bd}}/>
          <span style={{color:C.t2,fontSize:7}}>VIX</span><span style={{fontWeight:600,color:C.am}}>14.2</span>
          <div style={{width:1,height:10,background:C.bd}}/>
          <Gauge value={fgVal} label="" min={0} max={100}/>
          <div style={{width:1,height:10,background:C.bd}}/>
          <span style={{width:5,height:5,borderRadius:"50%",background:killed?C.rd:C.gn,animation:"p 2s infinite"}}/>
          <span style={{color:C.t2,fontVariantNumeric:"tabular-nums",fontSize:8}}>{tm.toLocaleTimeString("en-IN",{hour12:false})}</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.bd}`,background:C.s1,overflowX:"auto",flexShrink:0}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setSub(null)}} style={{padding:"4px 8px",border:"none",background:tab===t.id?`${C.ac}0c`:"transparent",color:tab===t.id?C.ac:C.t2,fontSize:8,fontFamily:FM,fontWeight:tab===t.id?600:400,letterSpacing:.5,borderBottom:tab===t.id?`2px solid ${C.ac}`:"2px solid transparent",display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}>
            <span style={{fontSize:9}}>{t.i}</span>{t.l}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflow:"auto",padding:8}}>

        {/* ═══ COMMAND CENTER ═══ */}
        {tab==="cmd"&&<div style={{display:"flex",flexDirection:"column",gap:6,animation:"su .3s"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:5}}>
            {[{l:"PORTFOLIO",v:"₹8,04,230",c:C.gn},{l:"TODAY P&L",v:"+₹12,450",c:C.gn},{l:"23 LAYERS",v:"23/23",c:C.a3},{l:"9 COHORTS",v:"9/9",c:C.ac},{l:"CONFIDENCE",v:"88%",c:C.ac},{l:"REGIME",v:"TRENDING",c:C.gn},{l:"FEAR/GREED",v:fgVal+"",c:C.or},{l:"GTI",v:"71.4",c:C.rd}].map((c,i)=>
              <St key={i} l={c.l} v={c.v} c={c.c} sm/>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:6}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <Cd>
                <Lb i="📊">SENSEX — LIVE CANDLESTICK</Lb>
                <CandleChart data={CANDLES} width={520} height={180}/>
              </Cd>
              <Cd>
                <Lb i="⧫">LIVE SIGNALS</Lb>
                {[{sym:"SENSEX 80000CE",dir:"BUY",cf:88,en:"₹245-255",sl:"₹198",rr:"2.4x"},{sym:"NIFTY 24900CE",dir:"BUY",cf:82,en:"₹185-195",sl:"₹145",rr:"2.6x"},{sym:"SENSEX 79500PE",dir:"SELL",cf:76,en:"₹180-190",sl:"₹245",rr:"1.8x"}].map((s,i)=>(
                  <div key={i} style={{background:C.s2,borderRadius:4,padding:7,marginBottom:4,borderLeft:`3px solid ${s.dir==="BUY"?C.gn:C.rd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><span style={{fontWeight:600,fontSize:11,fontFamily:FD}}>{s.sym}</span> <Bd color={s.dir==="BUY"?C.gn:C.rd} s>{s.dir}</Bd><div style={{fontSize:8,color:C.t2,marginTop:2}}>Entry:{s.en} SL:{s.sl} R:R:{s.rr}</div></div>
                    <span style={{fontSize:16,fontWeight:800,fontFamily:FD,color:s.cf>80?C.gn:C.am}}>{s.cf}%</span>
                  </div>
                ))}
              </Cd>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <Cd>
                <Lb i="▣">LAYER GRID</Lb>
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:2}}>
                  {LAYERS.map(l=><div key={l.id} onClick={()=>setTab("layers")} style={{background:C.s2,borderRadius:2,padding:"3px 1px",textAlign:"center",cursor:"pointer",border:`1px solid ${CC[l.cat]}10`}}>
                    <div style={{fontSize:7,fontWeight:600,color:CC[l.cat]}}>L{l.id}</div>
                    <span style={{width:4,height:4,borderRadius:"50%",background:C.gn,display:"inline-block"}}/>
                  </div>)}
                </div>
              </Cd>
              <Cd>
                <Lb i="📋">ORDER BOOK (DOM)</Lb>
                <DOM/>
              </Cd>
              <Cd>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <Lb i="🎯">FEAR & GREED</Lb>
                  <Gauge value={fgVal} label="Composite Index" min={0} max={100}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginTop:4}}>
                  {[["VIX Signal",62,C.or],["Momentum",74,C.gn],["Breadth",58,C.am],["PCR",71,C.gn]].map(([l,v,c])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:8,padding:"1px 0"}}>
                      <span style={{color:C.t2}}>{l}</span><span style={{fontWeight:600,color:c}}>{v}</span>
                    </div>
                  ))}
                </div>
              </Cd>
              <Cd>
                <Lb i="🔔" c={C.am}>LATEST ALERTS</Lb>
                {NOTIFICATIONS.slice(0,4).map((n,i)=>(
                  <div key={i} style={{padding:"2px 0",borderBottom:`1px solid ${C.bd}08`,fontSize:8,display:"flex",gap:4}}>
                    <Bd color={n.c} s>P{n.p}</Bd><span style={{color:C.t2,flex:1}}>{n.t}</span><span style={{color:C.t3,fontSize:7}}>{n.tm}</span>
                  </div>
                ))}
              </Cd>
            </div>
          </div>
        </div>}

        {/* ═══ CHARTS ═══ */}
        {tab==="chart"&&<div style={{animation:"su .3s"}}>
          <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:6}}>
            <Cd>
              <Lb i="📊">SENSEX — CANDLESTICK + VOLUME</Lb>
              <CandleChart data={CANDLES} width={620} height={260}/>
            </Cd>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <Cd><Lb i="📋">DOM DEPTH</Lb><DOM/></Cd>
              <Cd>
                <Lb i="📈">EQUITY CURVE</Lb>
                <Sk data={[100,102,101,105,108,106,112,115,113,118,122,120,125,128,130,127,132,135,138,142]} c={C.gn} w={200} h={50}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:8,marginTop:4}}>
                  <span style={{color:C.t2}}>30-day</span><span style={{color:C.gn,fontWeight:600}}>+₹1,42,350 (+21.5%)</span>
                </div>
              </Cd>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
            <Cd>
              <Lb i="🔥">OPTIONS CHAIN HEATMAP — OI by Strike</Lb>
              <div style={{display:"grid",gridTemplateColumns:"60px 1fr 40px 40px 40px 1fr 60px",gap:1,fontSize:8}}>
                <div style={{textAlign:"center",color:C.t2,padding:2}}>CE OI</div><div style={{textAlign:"center",color:C.t2}}>CE Bar</div><div style={{textAlign:"center",color:C.t2}}>CE IV</div>
                <div style={{textAlign:"center",color:C.ac,fontWeight:600}}>STRIKE</div><div style={{textAlign:"center",color:C.t2}}>PE IV</div><div style={{textAlign:"center",color:C.t2}}>PE Bar</div><div style={{textAlign:"center",color:C.t2}}>PE OI</div>
                {OI_CHAIN.map(r=>{const mxOI=Math.max(...OI_CHAIN.map(x=>Math.max(x.ce_oi,x.pe_oi)));const isATM=r.s===79800;return(
                  <React.Fragment key={r.s}>
                    <div style={{textAlign:"right",color:C.gn,padding:"1px 4px"}}>{(r.ce_oi/1000).toFixed(1)}K</div>
                    <div style={{display:"flex",justifyContent:"flex-end"}}><div style={{height:10,width:`${(r.ce_oi/mxOI)*100}%`,background:`${C.gn}${Math.round(30+r.ce_iv*2).toString(16)}`,borderRadius:1}}/></div>
                    <div style={{textAlign:"center",color:r.ce_iv>18?C.or:C.am}}>{r.ce_iv}</div>
                    <div style={{textAlign:"center",fontWeight:isATM?700:400,color:isATM?C.ac:C.tx,background:isATM?`${C.ac}15`:"transparent",borderRadius:2,padding:1}}>{r.s}</div>
                    <div style={{textAlign:"center",color:r.pe_iv>18?C.or:C.am}}>{r.pe_iv}</div>
                    <div style={{display:"flex"}}><div style={{height:10,width:`${(r.pe_oi/mxOI)*100}%`,background:`${C.rd}${Math.round(30+r.pe_iv*2).toString(16)}`,borderRadius:1}}/></div>
                    <div style={{textAlign:"left",color:C.rd,padding:"1px 4px"}}>{(r.pe_oi/1000).toFixed(1)}K</div>
                  </React.Fragment>
                )})}
              </div>
            </Cd>
            <Cd>
              <Lb i="🌡️">IV SURFACE (Strike × Expiry)</Lb>
              <div style={{display:"grid",gridTemplateColumns:"40px repeat(4,1fr)",gap:1,fontSize:7}}>
                <div/>{["This Thu","Next Thu","+2 Wk","Monthly"].map(e=><div key={e} style={{textAlign:"center",color:C.t2,padding:2}}>{e}</div>)}
                {[79200,79400,79600,79800,80000,80200,80400].map(s=><React.Fragment key={s}>
                  <div style={{textAlign:"right",color:C.t2,padding:"2px 4px"}}>{s}</div>
                  {[0,1,2,3].map(e=>{const iv=12+Math.abs(s-79800)/200*1.5+e*1.2+Math.random()*2;const pct=Math.min(1,(iv-10)/15);
                    return<div key={e} style={{background:`rgba(${Math.round(pct*239)},${Math.round((1-pct)*68)},68,${.3+pct*.5})`,borderRadius:2,padding:2,textAlign:"center",color:C.tx,fontWeight:500}}>{iv.toFixed(1)}</div>
                  })}
                </React.Fragment>)}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:7,color:C.t2}}>
                <span>Low IV</span>
                <div style={{flex:1,height:4,margin:"0 8px",borderRadius:2,background:`linear-gradient(90deg,${C.gn}60,${C.am}80,${C.rd})`}}/>
                <span>High IV</span>
              </div>
            </Cd>
          </div>
        </div>}

        {/* ═══ 23 LAYERS ═══ */}
        {tab==="layers"&&<div style={{display:"grid",gridTemplateColumns:selL?"1fr 1fr":"1fr",gap:6,animation:"su .3s"}}>
          <div>{LAYERS.map(l=>(
            <div key={l.id} onClick={()=>setSelL(selL===l.id?null:l.id)} style={{background:selL===l.id?C.s2:C.s1,border:`1px solid ${selL===l.id?CC[l.cat]+"50":C.bd}`,borderRadius:4,padding:"5px 7px",marginBottom:3,cursor:"pointer",borderLeft:`3px solid ${CC[l.cat]}`}}>
              <div style={{display:"grid",gridTemplateColumns:"22px 1fr 55px 45px 45px",alignItems:"center",gap:5}}>
                <span style={{fontSize:10,fontWeight:700,fontFamily:FD,color:CC[l.cat]}}>L{l.id}</span>
                <span style={{fontSize:9,fontWeight:500}}>{l.n}</span>
                <Bd color={CC[l.cat]} s>{l.cat}</Bd>
                <span style={{fontSize:8,textAlign:"center",color:l.lt<100?C.gn:l.lt<1000?C.am:C.or}}>{l.lt<1000?l.lt+"ms":(l.lt/1000).toFixed(1)+"s"}</span>
                <span style={{fontSize:8,textAlign:"center",fontWeight:600,color:l.cf>90?C.gn:C.am}}>{l.cf}%</span>
              </div>
            </div>
          ))}</div>
          {selL&&<Cd gl={CC[LAYERS.find(x=>x.id===selL).cat]+"40"} style={{position:"sticky",top:0,alignSelf:"start"}}>
            {(()=>{const l=LAYERS.find(x=>x.id===selL);return<>
              <div style={{fontSize:18,fontWeight:800,fontFamily:FD,color:CC[l.cat],marginBottom:4}}>L{l.id} — {l.n}</div>
              <Bd color={CC[l.cat]}>{l.cat}</Bd>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,margin:"10px 0"}}><St l="LATENCY" v={l.lt<1000?l.lt+"ms":(l.lt/1000).toFixed(1)+"s"} c={l.lt<100?C.gn:C.am} sm/><St l="CONFIDENCE" v={l.cf+"%"} c={l.cf>90?C.gn:C.am} sm/><St l="STATUS" v="ACTIVE" c={C.gn} sm/></div>
              <Sk data={spk(`l${l.id}`)} c={CC[l.cat]} w={280} h={35}/>
            </>})()}
          </Cd>}
        </div>}

        {/* ═══ GEO ═══ */}
        {tab==="geo"&&<div style={{display:"grid",gridTemplateColumns:"1fr 250px",gap:6,animation:"su .3s"}}>
          <Cd style={{minHeight:320,background:`radial-gradient(ellipse at 50% 40%,#0c1a30,${C.bg})`,position:"relative",overflow:"hidden"}}>
            <Lb i="🌍">GEOPOLITICAL RISK MAP — LIVE</Lb>
            {/* Animated globe background */}
            <svg viewBox="0 0 100 80" style={{width:"100%",height:"calc(100% - 20px)"}}>
              <circle cx="50" cy="40" r="28" fill="none" stroke={`${C.ac}08`} strokeWidth=".3"/>
              <ellipse cx="50" cy="40" rx="28" ry="10" fill="none" stroke={`${C.ac}06`} strokeWidth=".2" transform={`rotate(${globeRot*2} 50 40)`}/>
              <ellipse cx="50" cy="40" rx="10" ry="28" fill="none" stroke={`${C.ac}06`} strokeWidth=".2" transform={`rotate(${globeRot} 50 40)`}/>
              {COUNTRIES.map((c,i)=>(
                <g key={i} onClick={()=>setSelC(selC?.n===c.n?null:c)} style={{cursor:"pointer"}}>
                  <rect x={c.x} y={c.y} width={c.w} height={c.h} rx=".4" fill={`${RK[c.rk]}20`} stroke={selC?.n===c.n?C.ac:`${RK[c.rk]}40`} strokeWidth={selC?.n===c.n?".3":".12"}/>
                  <text x={c.x+c.w/2} y={c.y+c.h/2+.5} textAnchor="middle" fill={RK[c.rk]} fontSize="1.8" fontFamily={FM} fontWeight="600">{c.n}</text>
                  {c.rk==="crit"&&<circle cx={c.x+c.w-.8} cy={c.y+.8} r=".6" fill={C.rd}><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"/></circle>}
                </g>
              ))}
              {/* Connection arcs */}
              <path d="M 63,49 Q 55,38 51,44" fill="none" stroke={`${C.rd}30`} strokeWidth=".12" strokeDasharray=".3"><animate attributeName="stroke-dashoffset" from="0" to="2" dur="3s" repeatCount="indefinite"/></path>
              <path d="M 22,40 Q 35,28 41,28" fill="none" stroke={`${C.am}20`} strokeWidth=".12" strokeDasharray=".3"/>
            </svg>
          </Cd>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <Cd><Lb c={C.rd}>GTI: 71.4</Lb><Br v={71.4} c={C.rd} h={5}/><div style={{fontSize:8,color:C.t2,marginTop:4}}>3 hotspots active. Elevated tension weighted by India trade flow impact.</div></Cd>
            {selC?<Cd gl={`${C.ac}40`}>
              <Lb>{selC.n}</Lb>
              <div style={{fontSize:16,fontWeight:700,fontFamily:FD,color:selC.v.startsWith("+")?C.gn:C.rd,marginBottom:4}}>{selC.v}</div>
              <Bd color={RK[selC.rk]}>{selC.rk.toUpperCase()} RISK</Bd>
              <Sk data={spk(selC.n)} c={selC.v.startsWith("+")?C.gn:C.rd} w={200} h={40}/>
            </Cd>:<Cd style={{opacity:.4,textAlign:"center",padding:20}}><div style={{color:C.t2,fontSize:9}}>Click country for intel</div></Cd>}
            <Cd>
              <Lb i="🌐">SECTOR ROTATION</Lb>
              {[["Banking",78,C.gn],["IT",42,C.rd],["Energy",71,C.am],["Telecom",85,C.gn],["Auto",91,C.gn],["PSU Bank",48,C.or]].map(([s,v,c])=>(
                <div key={s} style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",fontSize:8,marginBottom:1}}><span style={{color:C.t2}}>{s}</span><span style={{fontWeight:600,color:c}}>{v}</span></div><Br v={v} c={c} h={4}/></div>
              ))}
            </Cd>
          </div>
        </div>}

        {/* ═══ SIGNALS ═══ */}
        {tab==="sig"&&<div style={{animation:"su .3s"}}>
          <Lb i="⧫">AI SIGNALS — Full 23-Layer Reasoning</Lb>
          {[{sym:"SENSEX 80000CE",dir:"BUY",cf:88,layers:[["L11","Trending HMM S3 85%"],["L6","GEX+ above 79,500"],["L5","Sentiment 72/100"],["L8","FII +₹2,400Cr×3"],["C4","FVG 79,800"],["L17","67% WR/142"]],en:"₹245-255",sl:"₹198",tp:["310","365","420"],rr:"2.4x",gk:{d:.52,g:.0045,t:-18.5,v:22.3}},
            {sym:"NIFTY 24900CE",dir:"BUY",cf:82,layers:[["L11","Trending GMM 81%"],["L6","γ flip 24,820"],["L5","68/100"],["L8","DII ₹4,200Cr"],["C4","CHoCH 24,780"],["L17","71% WR/167"]],en:"₹185-195",sl:"₹145",tp:["245","290","340"],rr:"2.6x",gk:{d:.48,g:.0052,t:-22.1,v:24.8}},
            {sym:"SENSEX 79500PE",dir:"SELL",cf:76,layers:[["L11","Low-vol range"],["L6","Put Wall 79,500"],["L5","58/100"],["L8","Neutral"],["C4","OB 79,450"],["L17","62% WR/89"]],en:"₹180-190",sl:"₹245",tp:["120","80"],rr:"1.8x",gk:{d:-.38,g:.0038,t:-15.2,v:19.1}},
          ].map((s,i)=>(
            <Cd key={i} gl={s.dir==="BUY"?`${C.gn}30`:`${C.rd}30`} style={{marginBottom:7}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>{s.sym}</span><Bd color={s.dir==="BUY"?C.gn:C.rd}>{s.dir}</Bd><span style={{fontSize:18,fontWeight:800,fontFamily:FD,color:s.cf>80?C.gn:C.am}}>{s.cf}%</span></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:6}}>
                    <St l="ENTRY" v={s.en} c={C.tx} sm/><St l="STOP" v={s.sl} c={C.rd} sm/><St l="R:R" v={s.rr} c={C.ac} sm/>
                  </div>
                  <div style={{display:"flex",gap:2}}>{s.tp.map(t=><Bd key={t} color={C.gn} s>TP ₹{t}</Bd>)}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:3,marginTop:6}}>
                    {[["Δ",s.gk.d],["Γ",s.gk.g],["Θ",s.gk.t],["V",s.gk.v]].map(([l,v])=><div key={l} style={{background:C.s2,borderRadius:2,padding:"2px",textAlign:"center",fontSize:8}}><span style={{color:C.a2}}>{l}</span> {v}</div>)}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:8,color:C.ac,fontWeight:600,letterSpacing:1,marginBottom:4}}>LAYER-BY-LAYER REASONING</div>
                  {s.layers.map(([l,v])=><div key={l} style={{display:"flex",fontSize:9,padding:"2px 0",borderBottom:`1px solid ${C.bd}08`}}><span style={{width:30,color:C.a2,fontWeight:500}}>{l}</span><span style={{color:C.t2}}>{v}</span></div>)}
                </div>
                <div>
                  <div style={{fontSize:8,color:C.ac,fontWeight:600,letterSpacing:1,marginBottom:4}}>RISK ASSESSMENT</div>
                  <div style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",fontSize:8}}><span style={{color:C.gn}}>Bullish</span><span style={{color:C.rd}}>Bearish</span></div><div style={{height:6,borderRadius:3,background:C.s2,overflow:"hidden"}}><div style={{height:"100%",width:`${50+s.cf/2-25}%`,background:`linear-gradient(90deg,${C.gn},${C.gn}80)`,borderRadius:3}}/></div></div>
                  <Sk data={spk(`sig${i}`)} c={s.dir==="BUY"?C.gn:C.rd} w={180} h={40}/>
                </div>
              </div>
            </Cd>
          ))}
        </div>}

        {/* ═══ STOCKS ═══ */}
        {tab==="stk"&&<div style={{animation:"su .3s"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <Lb i="▦">STOCK MATRIX — Add/Remove/Trade</Lb>
            <button onClick={()=>setShowAdd("stk")} style={{padding:"3px 8px",background:C.ac,border:"none",borderRadius:3,color:C.bg,fontSize:8,fontWeight:700,fontFamily:FM}}>+ ADD</button>
          </div>
          {showAdd==="stk"&&<Cd style={{marginBottom:5}}><div style={{display:"flex",gap:4,alignItems:"flex-end"}}>
            <input value={nS.s} onChange={e=>setNS({...nS,s:e.target.value})} placeholder="SYM" style={{...IS,width:80}}/>
            <input value={nS.n} onChange={e=>setNS({...nS,n:e.target.value})} placeholder="Name" style={{...IS,width:120}}/>
            <button onClick={()=>{if(nS.s.trim()){setStocks(p=>[...p,{s:nS.s.toUpperCase(),n:nS.n||nS.s,p:+(Math.random()*3000+200).toFixed(0),ch:+(Math.random()*8-4).toFixed(2),sec:"Other",ai:0,imp:0,sig:["New"],ev:["—"],gk:{d:0,g:0,t:0,v:0}}]);setNS({s:"",n:""});setShowAdd(null)}}} style={{padding:"4px 8px",background:C.ac,border:"none",borderRadius:3,color:C.bg,fontSize:8,fontFamily:FM}}>ADD</button>
            <button onClick={()=>setShowAdd(null)} style={{padding:"4px 6px",background:"transparent",border:`1px solid ${C.bd}`,borderRadius:3,color:C.t2,fontSize:8,fontFamily:FM}}>✕</button>
          </div></Cd>}
          {stocks.map(s=>(
            <div key={s.s} style={{marginBottom:3,background:C.s1,border:`1px solid ${selStk===s.s?`${C.ac}40`:C.bd}`,borderRadius:4,overflow:"hidden"}}>
              <div onClick={()=>setSelStk(selStk===s.s?null:s.s)} style={{display:"grid",gridTemplateColumns:"100px 75px 55px 50px 1fr 40px 22px",alignItems:"center",padding:"6px 8px",gap:5,cursor:"pointer"}}>
                <div><div style={{fontWeight:600,fontSize:10}}>{s.s}</div><div style={{fontSize:7,color:C.t2}}>{s.n}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:600}}>₹{s.p.toLocaleString()}</div><div style={{fontSize:8,color:s.ch>=0?C.gn:C.rd}}>{s.ch>=0?"+":""}{s.ch}%</div></div>
                <Sk data={spk(s.s)} c={s.ch>=0?C.gn:C.rd}/>
                <div style={{textAlign:"center"}}><div style={{fontSize:7,color:C.t2}}>AI</div><div style={{fontSize:12,fontWeight:700,fontFamily:FD,color:s.ai>75?C.gn:s.ai>50?C.am:C.rd}}>{s.ai}</div></div>
                <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{s.sig.map((g,j)=><Bd key={j} color={g.includes("Bull")||g.includes("Break")||g.includes("Up")||g.includes("+")?C.gn:g.includes("Bear")||g.includes("Weak")||g.includes("-")?C.rd:C.am} s>{g}</Bd>)}</div>
                <div style={{textAlign:"center",fontSize:10,fontWeight:600,color:s.imp>65?C.rd:C.am}}>{s.imp}</div>
                <button onClick={e=>{e.stopPropagation();setStocks(p=>p.filter(x=>x.s!==s.s))}} style={{width:18,height:18,borderRadius:2,border:`1px solid ${C.bd}`,background:"transparent",color:C.rd,fontSize:10}}>×</button>
              </div>
              {selStk===s.s&&<div style={{padding:"0 8px 7px",borderTop:`1px solid ${C.bd}`,paddingTop:6}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  <div>{[["Delta",s.gk.d,s.gk.d>0?C.gn:C.rd],["Gamma",s.gk.g,C.ac],["Theta",s.gk.t,C.rd],["Vega",s.gk.v,C.a2]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:9,padding:"1px 0"}}><span style={{color:C.t2}}>{l}</span><span style={{fontWeight:600,color:c}}>{v}</span></div>)}</div>
                  <div>{s.ev.map((e,j)=><div key={j} style={{fontSize:8,color:C.t2,padding:"1px 0"}}>• {e}</div>)}</div>
                  <div style={{display:"flex",gap:3}}><button style={{flex:1,padding:4,background:`${C.gn}15`,border:`1px solid ${C.gn}30`,borderRadius:3,color:C.gn,fontWeight:600,fontSize:8,fontFamily:FM}}>BUY</button><button style={{flex:1,padding:4,background:`${C.rd}15`,border:`1px solid ${C.rd}30`,borderRadius:3,color:C.rd,fontWeight:600,fontSize:8,fontFamily:FM}}>SELL</button></div>
                </div>
              </div>}
            </div>
          ))}
        </div>}

        {/* ═══ GEX ═══ */}
        {tab==="gex"&&<div style={{animation:"su .3s"}}>
          <Lb i="◆">LAYER 6 — GEX (CALL γ vs PUT γ, SEPARATED)</Lb>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:7}}>
            <St l="γ FLIP" v="79,780" c={C.ac}/><St l="CALL WALL" v="80,200" c={C.gn} s="Resistance"/><St l="PUT WALL" v="79,200" c={C.rd} s="Support"/><St l="MAX PAIN" v="79,800" c={C.am}/><St l="DEALER" v="LONG γ" c={C.a3} s="Mean-reverting"/>
          </div>
          <Cd style={{marginBottom:7}}>
            <Lb>CALL γ (green) vs PUT γ (red) + NET GEX overlay</Lb>
            <div style={{display:"flex",alignItems:"center",height:180,gap:1}}>
              {GEX.map((g,i)=>{const mx=Math.max(...GEX.map(x=>Math.max(x.cg,Math.abs(x.pg))));const hc=g.cg/mx*70;const hp=Math.abs(g.pg)/mx*70;
                return<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",position:"relative"}}>
                  {g.s===79800&&<div style={{position:"absolute",top:0,height:"100%",borderLeft:`1px dashed ${C.ac}60`,zIndex:2}}/>}
                  <div style={{width:"100%",height:hc,background:`${C.gn}60`,borderRadius:"2px 2px 0 0"}}/>
                  <div style={{width:"80%",height:2,background:g.net>0?C.gn:C.rd,borderRadius:1,margin:"1px 0"}}/>
                  <div style={{width:"100%",height:hp,background:`${C.rd}60`,borderRadius:"0 0 2px 2px"}}/>
                  {i%4===0&&<div style={{fontSize:6,color:C.t2,position:"absolute",bottom:-10}}>{g.s}</div>}
                </div>
              })}
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:14,fontSize:7}}>
              <span style={{color:C.gn}}>▲ Call γ</span><span style={{color:C.rd}}>▼ Put γ</span><span style={{color:C.ac}}>── Net GEX</span><span style={{color:C.ac}}>┊ Flip</span>
            </div>
          </Cd>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <Cd><Lb>FLOW METRICS</Lb>{[["Charm","+₹185Cr/d",C.gn],["Vanna","+₹42Cr",C.gn],["Kyle's λ","0.0034",C.am],["VPIN","0.52",C.gn],["Amihud","0.0012",C.gn]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:9}}><span style={{color:C.t2}}>{l}</span><span style={{fontWeight:600,color:c}}>{v}</span></div>)}</Cd>
            <Cd><Lb>FORMULAS</Lb><div style={{fontSize:8,color:C.t2,lineHeight:1.6}}><span style={{color:C.ac}}>GEX=</span>Σ[OI×Γ×20×S²×.01]<br/><span style={{color:C.ac}}>Γ=</span>N'(d₁)/(S×σ×√T)<br/><span style={{color:C.ac}}>λ=</span>Cov(ΔP,V)/Var(V)<br/><span style={{color:C.ac}}>VPIN=</span>Σ|Vb−Vs|/(n×Vb)</div></Cd>
            <Cd><Lb c={C.am}>⚠ NOTE</Lb><div style={{fontSize:9,color:C.t2,lineHeight:1.4}}>NSE has NO designated MMs for index options. GEX adjusted for prop desk/HFT. Sensex lot=20, weekly Thu expiry (BSE BFO).</div></Cd>
          </div>
        </div>}

        {/* ═══ EVENTS ═══ */}
        {tab==="evt"&&<div style={{animation:"su .3s"}}><Lb i="⚡">EVENT CASCADE</Lb>
          {EVENTS.map(e=><Cd key={e.id} style={{marginBottom:5}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <div><div style={{display:"flex",gap:3,marginBottom:2}}><Bd color={e.sv==="high"?C.rd:C.am} s>{e.sv.toUpperCase()}</Bd><Bd color={C.a2} s>{e.cat}</Bd><Bd color={C.t2} s>{e.rg}</Bd><span style={{fontSize:7,color:C.t2}}>{e.tm}</span></div><div style={{fontSize:11,fontWeight:600,fontFamily:FD}}>{e.t}</div></div>
              <div style={{fontSize:18,fontWeight:700,fontFamily:FD,color:e.se>0?C.gn:C.rd}}>{e.se>0?"+":""}{(e.se*100).toFixed(0)}%</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(4,e.stk.length)},1fr)`,gap:4}}>
              {e.stk.map(sym=>{const st=stocks.find(x=>x.s===sym);if(!st)return null;return<div key={sym} style={{background:C.s2,borderRadius:3,padding:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}><span style={{fontWeight:600}}>{sym}</span><span style={{color:e.se>0?C.gn:C.rd}}>{e.se>0?"▲":"▼"}</span></div>
                <div style={{fontSize:8,color:C.t2}}>AI:{st.ai} Δ:{st.gk.d}</div><Br v={Math.abs(e.se)*100} c={e.se>0?C.gn:C.rd} h={3}/>
              </div>})}
            </div>
          </Cd>)}
        </div>}

        {/* ═══ TRADE AUTOPSY ═══ */}
        {tab==="autopsy"&&<div style={{animation:"su .3s"}}>
          <Lb i="🔬">TRADE AUTOPSY — Layer 20, Engine 1 (Shapley Attribution)</Lb>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
            <Cd gl={`${C.gn}30`}><Lb c={C.gn}>GOOD PROCESS / GOOD OUTCOME</Lb><div style={{fontSize:9,color:C.t2,marginBottom:4}}>Reinforce these patterns</div><div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:C.gn}}>34</div><span style={{fontSize:8,color:C.t2}}>out of 50 trades</span></Cd>
            <Cd gl={`${C.am}30`}><Lb c={C.am}>GOOD PROCESS / BAD OUTCOME</Lb><div style={{fontSize:9,color:C.t2,marginBottom:4}}>Acceptable variance</div><div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:C.am}}>8</div><span style={{fontSize:8,color:C.t2}}>out of 50 trades</span></Cd>
            <Cd gl={`${C.or}30`}><Lb c={C.or}>BAD PROCESS / GOOD OUTCOME ⚠</Lb><div style={{fontSize:9,color:C.t2,marginBottom:4}}>DANGEROUS — flag immediately</div><div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:C.or}}>4</div><span style={{fontSize:8,color:C.t2}}>Lucky reversals where C6 overrode L11</span></Cd>
            <Cd gl={`${C.rd}30`}><Lb c={C.rd}>BAD PROCESS / BAD OUTCOME</Lb><div style={{fontSize:9,color:C.t2,marginBottom:4}}>Root cause analysis required</div><div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:C.rd}}>4</div><span style={{fontSize:8,color:C.t2}}>Ignored L12 anomaly flags</span></Cd>
          </div>
          <Cd>
            <Lb i="📋">TRADE LOG WITH AUTOPSY</Lb>
            {TRADES.map(t=>(
              <div key={t.id} style={{background:C.s2,borderRadius:3,padding:7,marginBottom:4,borderLeft:`3px solid ${t.q.includes("GO")?C.gn:C.rd}`,display:"grid",gridTemplateColumns:"120px 50px 60px 60px 1fr 60px",gap:6,alignItems:"center"}}>
                <div><div style={{fontWeight:500,fontSize:10}}>{t.sym}</div><Bd color={t.dir==="BUY"?C.gn:C.rd} s>{t.dir}</Bd></div>
                <div style={{textAlign:"center",fontSize:9}}>₹{t.entry}→₹{t.exit}</div>
                <div style={{fontWeight:600,fontSize:10,color:t.pnl.startsWith("+")?C.gn:C.rd}}>{t.pnl}</div>
                <Bd color={t.q==="GP/GO"?C.gn:t.q==="GP/BO"?C.am:t.q==="BP/GO"?C.or:C.rd}>{t.q}</Bd>
                <div style={{fontSize:8,color:C.t2}}>{t.layers}</div>
                <div style={{fontSize:8,color:C.t2,textAlign:"right"}}>{t.dur}</div>
              </div>
            ))}
          </Cd>
          <Cd style={{marginTop:6}}>
            <Lb i="📊" c={C.a2}>SHAPLEY VALUE ATTRIBUTION (Alpha by Cohort)</Lb>
            {[["C5 Options",32,C.gn],["C2 Order Flow",22,C.gn],["C4 SMC/ICT",18,C.a3],["C8 Quant/ML",14,C.ac],["C1 Foundation",8,C.am],["C9 Intermarket",6,C.am],["C3 Volume",3,C.am],["C6 Psychology",1,C.t2],["C7 Game Theory",-4,C.rd]].map(([l,v,c])=>(
              <div key={l} style={{marginBottom:4}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:1}}><span style={{color:C.t2}}>{l}</span><span style={{fontWeight:600,color:c}}>{v>0?"+":""}{v}%</span></div>
                <Br v={Math.abs(v)} mx={35} c={c} h={4}/>
              </div>
            ))}
          </Cd>
        </div>}

        {/* ═══ STRATEGY LIFECYCLE ═══ */}
        {tab==="strat"&&<div style={{animation:"su .3s"}}>
          <Lb i="🧪">STRATEGY LIFECYCLE & ELO RANKINGS</Lb>
          <div style={{display:"flex",gap:6,marginBottom:8,padding:"8px 0",overflowX:"auto"}}>
            {["Dev","Backtest","Paper","Live Small","Live Full","Retired"].map((ph,i)=>(
              <div key={ph} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:i<5?`${[C.t2,C.a2,C.am,C.or,C.gn][i]}20`:C.rd+"20",border:`2px solid ${i<5?[C.t2,C.a2,C.am,C.or,C.gn][i]:C.rd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:600,color:i<5?[C.t2,C.a2,C.am,C.or,C.gn][i]:C.rd}}>{i<5?i+1:"×"}</div>
                <span style={{fontSize:8,color:C.t2,whiteSpace:"nowrap"}}>{ph}</span>
                {i<5&&<div style={{width:20,height:1,background:C.bd}}/>}
              </div>
            ))}
          </div>
          {STRATEGIES.sort((a,b)=>b.elo-a.elo).map((s,i)=>(
            <Cd key={s.n} style={{marginBottom:4,borderLeft:`3px solid ${s.phase===5?C.gn:s.phase===4?C.or:s.phase===3?C.am:s.phase===0?C.rd:C.a2}`}}>
              <div style={{display:"grid",gridTemplateColumns:"20px 1fr 80px 60px 55px 55px 55px",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,fontWeight:700,fontFamily:FD,color:C.t2}}>#{i+1}</span>
                <div><div style={{fontWeight:600,fontSize:10,fontFamily:FD}}>{s.n}</div><Bd color={s.phase===5?C.gn:s.phase===4?C.or:s.phase===3?C.am:s.phase===0?C.rd:C.a2} s>{s.st}</Bd></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:7,color:C.t2}}>ELO</div><div style={{fontSize:14,fontWeight:700,fontFamily:FD,color:s.elo>1650?C.gn:s.elo>1400?C.am:C.rd}}>{s.elo}</div></div>
                <St l="SHARPE" v={s.sh+""} c={s.sh>1.5?C.gn:s.sh>1?C.am:C.rd} sm/>
                <St l="WR" v={s.wr+"%"} c={s.wr>65?C.gn:C.am} sm/>
                <St l="DD" v={s.dd+"%"} c={Math.abs(s.dd)<8?C.gn:C.am} sm/>
                <Sk data={spk(`st${s.n}`)} c={s.elo>1600?C.gn:C.am} w={60} h={16}/>
              </div>
            </Cd>
          ))}
          <Cd style={{marginTop:7}}>
            <Lb i="🎲" c={C.a2}>THOMPSON SAMPLING — Beta Posterior Distributions</Lb>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {COHORTS.slice(0,9).map((c,i)=>{const a=Math.round(c.acc*2);const b=200-a;return(
                <div key={c.id} style={{background:C.s2,borderRadius:3,padding:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:3}}>
                    <span style={{fontWeight:500}}>C{c.id} {c.n}</span><span style={{color:C.ac}}>β({a},{b})</span>
                  </div>
                  <svg width="100%" height="24" viewBox="0 0 100 24">
                    <path d={`M 0 24 ${Array.from({length:100},(_, x)=>{const t=x/100;const h=Math.pow(t,a/50)*Math.pow(1-t,(b)/50)*22;return`L ${x} ${24-h}`}).join(" ")} L 100 24 Z`} fill={`${[C.ac,C.a3,C.am,C.a2,C.gn,C.pk,C.or,C.rd,C.ac][i]}30`} stroke={[C.ac,C.a3,C.am,C.a2,C.gn,C.pk,C.or,C.rd,C.ac][i]} strokeWidth=".8"/>
                  </svg>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:C.t2}}><span>0</span><span>E[θ]={((a)/(a+b)).toFixed(2)}</span><span>1</span></div>
                </div>
              )})}
            </div>
          </Cd>
        </div>}

        {/* ═══ RISK ═══ */}
        {tab==="risk"&&<div style={{animation:"su .3s"}}>
          <Lb i="◈">LAYERS 11+16+17 — REGIME + RISK + VALIDATION</Lb>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:7}}>
            <St l="REGIME" v="TRENDING" s="HMM S3 P=85%" c={C.gn}/><St l="GARCH σ" v="14.2%" s="1d forecast" c={C.am}/><St l="KALMAN" v="↑ BULL" s="Slope:+0.34" c={C.gn}/><St l="VIX" v="NORMAL" s="14.2 (13-18)" c={C.am}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <Cd><Lb>POSITION SIZING</Lb>{[["Half-Kelly","12.4%",C.ac],["VaR 95%","₹24,800",C.rd],["CVaR/ES","₹38,200",C.rd],["SPAN","₹1,82,400",C.am],["Max Pos","4 lots",C.ac]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:9}}><span style={{color:C.t2}}>{l}</span><span style={{fontWeight:600,color:c}}>{v}</span></div>)}</Cd>
            <Cd><Lb>VALIDATION (L17)</Lb>{[["p-value","0.003 ✓",C.gn],["Defl. Sharpe","1.82",C.gn],["PBO","0.18",C.gn],["SPRT","CONTINUE",C.ac],["CUSUM","No alarm",C.gn]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:9}}><span style={{color:C.t2}}>{l}</span><span style={{fontWeight:600,color:c}}>{v}</span></div>)}</Cd>
            <Cd><Lb c={C.rd}>DRAWDOWN</Lb>{[["Daily","26%",C.gn],["Weekly","46%",C.am],["Max DD","40%",C.am]].map(([l,v,c])=><div key={l} style={{marginBottom:5}}><div style={{display:"flex",justifyContent:"space-between",fontSize:8,marginBottom:1}}><span style={{color:C.t2}}>{l} used</span><span style={{color:c}}>{v}</span></div><Br v={parseInt(v)} c={c} h={4}/></div>)}</Cd>
          </div>
          <Cd style={{marginTop:6}}>
            <Lb>CORRELATION MATRIX</Lb>
            <div style={{display:"grid",gridTemplateColumns:`30px repeat(${stocks.length},1fr)`,gap:1,fontSize:7}}>
              <div/>{stocks.map(s=><div key={s.s} style={{textAlign:"center",color:C.t2,fontWeight:500}}>{s.s.slice(0,3)}</div>)}
              {stocks.map((s1,i)=><React.Fragment key={i}>
                <div style={{textAlign:"right",color:C.t2,padding:"1px 3px"}}>{s1.s.slice(0,3)}</div>
                {stocks.map((s2,j)=>{const v=i===j?1:+(Math.sin(i*3+j*7)*.4+.3).toFixed(2);const c=v>0.5?C.gn:v>0?C.am:C.rd;
                  return<div key={j} style={{background:`${c}${Math.round(Math.abs(v)*40+10).toString(16).padStart(2,"0")}`,borderRadius:1,textAlign:"center",padding:1,color:i===j?C.tx:`${c}`,fontWeight:i===j?700:400}}>{v.toFixed(1)}</div>
                })}
              </React.Fragment>)}
            </div>
          </Cd>
        </div>}

        {/* ═══ APIs ═══ */}
        {tab==="api"&&<div style={{animation:"su .3s"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><Lb i="⬢">DATA SOURCES</Lb>
            <button onClick={()=>setShowAdd("api")} style={{padding:"3px 8px",background:C.ac,border:"none",borderRadius:3,color:C.bg,fontSize:8,fontWeight:700,fontFamily:FM}}>+ ADD</button>
          </div>
          {showAdd==="api"&&<Cd style={{marginBottom:5}}><div style={{display:"flex",gap:4,alignItems:"flex-end"}}>
            <input value={nA.n} onChange={e=>setNA({...nA,n:e.target.value})} placeholder="API Name" style={{...IS,width:140}}/>
            <select value={nA.ty} onChange={e=>setNA({...nA,ty:e.target.value})} style={IS}>{["Data","Broker","News","Sentiment","AI/LLM","Macro","Alt","Flow"].map(t=><option key={t}>{t}</option>)}</select>
            <button onClick={()=>{if(nA.n.trim()){setApis(p=>[...p,{id:Date.now(),n:nA.n,ty:nA.ty,st:"active",lt:"—",ic:"🔌"}]);setNA({n:"",ty:"Data"});setShowAdd(null)}}} style={{padding:"4px 8px",background:C.ac,border:"none",borderRadius:3,color:C.bg,fontSize:8,fontFamily:FM}}>ADD</button>
            <button onClick={()=>setShowAdd(null)} style={{padding:"4px 6px",background:"transparent",border:`1px solid ${C.bd}`,borderRadius:3,color:C.t2,fontSize:8,fontFamily:FM}}>✕</button>
          </div></Cd>}
          {apis.map(a=><Cd key={a.id} style={{marginBottom:3}}>
            <div style={{display:"grid",gridTemplateColumns:"20px 1fr 60px 50px 50px 55px",alignItems:"center",gap:5}}>
              <span style={{fontSize:14}}>{a.ic}</span>
              <div style={{fontWeight:500,fontSize:10}}>{a.n}</div>
              <Bd color={C.a2} s>{a.ty}</Bd>
              <Bd color={a.st==="active"?C.gn:C.rd} s>{a.st.toUpperCase()}</Bd>
              <span style={{textAlign:"center",fontSize:9,color:C.am}}>{a.lt}</span>
              <div style={{display:"flex",gap:2}}>
                <button onClick={()=>setApis(p=>p.map(x=>x.id===a.id?{...x,st:x.st==="active"?"paused":"active"}:x))} style={{padding:"2px 4px",background:"transparent",border:`1px solid ${C.bd}`,borderRadius:2,color:a.st==="active"?C.am:C.gn,fontSize:7,fontFamily:FM}}>{a.st==="active"?"⏸":"▶"}</button>
                <button onClick={()=>setApis(p=>p.filter(x=>x.id!==a.id))} style={{padding:"2px 4px",background:"transparent",border:`1px solid ${C.rd}20`,borderRadius:2,color:C.rd,fontSize:7,fontFamily:FM}}>×</button>
              </div>
            </div>
          </Cd>)}
        </div>}

        {/* ═══ AWS ═══ */}
        {tab==="aws"&&<div style={{animation:"su .3s"}}>
          <Lb i="☁">AWS — $850-$2,350/mo</Lb>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>
            {[{n:"ECS Fargate ×3",co:"$300",cpu:50},{n:"Aurora PostgreSQL",co:"$185",cpu:28},{n:"ElastiCache Valkey",co:"$72",cpu:15},{n:"OpenSearch",co:"$262",cpu:0},{n:"Kinesis 2 shards",co:"$27",cpu:0},{n:"Bedrock LLM",co:"$45",cpu:0},{n:"API Gateway WS",co:"$1",cpu:0},{n:"DynamoDB",co:"$5",cpu:0},{n:"S3+Glacier+KMS",co:"$18",cpu:0}].map((s,i)=>(
              <Cd key={i}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:9,fontWeight:500}}>{s.n}</span><span style={{fontSize:10,fontWeight:600,color:C.ac}}>{s.co}</span></div>
                {s.cpu>0&&<Br v={s.cpu} c={s.cpu>60?C.am:C.gn} h={3}/>}
              </Cd>
            ))}
          </div>
          <Cd style={{marginTop:6}}><Lb>PIPELINE</Lb><div style={{fontSize:8,color:C.t2,lineHeight:1.8,fontFamily:FM}}>
            <span style={{color:C.ac}}>Broker WS</span>→<span style={{color:C.a3}}>Fargate</span>→<span style={{color:C.a2}}>Kinesis</span>→<span style={{color:C.am}}>Lambda</span>→<span style={{color:C.or}}>Valkey</span>→<span style={{color:C.gn}}>23-Layer Engine</span>→<span style={{color:C.ac}}>EventBridge</span>→<span style={{color:C.rd}}>Execute</span>→<span style={{color:C.a2}}>Aurora</span>→<span style={{color:C.gn}}>Dashboard</span>
          </div></Cd>
        </div>}

        {/* ═══ CONTROL ═══ */}
        {tab==="ctrl"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,animation:"su .3s"}}>
          <Cd gl={killed?`${C.rd}40`:killA?`${C.am}40`:undefined}>
            <Lb c={C.rd} i="🚨">KILL SWITCH</Lb>
            <div style={{fontSize:9,color:C.t2,marginBottom:8}}>Emergency stop → Cancel all → Close positions → Disable engine → 2FA restore</div>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setKillA(!killA)} style={{padding:"5px 10px",background:killA?`${C.am}25`:C.s2,border:`1px solid ${killA?C.am:C.bd}`,borderRadius:3,color:killA?C.am:C.t2,fontSize:9,fontFamily:FM,fontWeight:600}}>{killA?"⚡ ARMED":"ARM"}</button>
              <button onClick={()=>{if(killA&&!killed){setKilled(true);setChat(p=>[...p,{r:"sys",t:"🚨 KILL SWITCH — All orders cancelled, positions closing, engine disabled."}])}}} disabled={!killA||killed} style={{padding:"5px 14px",background:killA&&!killed?`${C.rd}25`:C.s2,border:`1px solid ${killA&&!killed?C.rd:C.bd}`,borderRadius:3,color:killA&&!killed?C.rd:C.t3,fontSize:9,fontFamily:FM,fontWeight:700,opacity:killA&&!killed?1:.4}}>{killed?"🔴 KILLED":"EXECUTE"}</button>
              {killed&&<button onClick={()=>{setKilled(false);setKillA(false)}} style={{padding:"5px 10px",background:`${C.gn}15`,border:`1px solid ${C.gn}30`,borderRadius:3,color:C.gn,fontSize:9,fontFamily:FM}}>RESTORE</button>}
            </div>
          </Cd>
          <Cd><Lb c={C.am}>OVERRIDES</Lb>{[["Force Close","Market order, bypasses AI"],["Risk Override","→ Layer 16"],["Strategy Toggle","→ Registry"],["SL Mod","→ Autopsy log"]].map(([l,d])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${C.bd}08`}}><div><div style={{fontSize:9,fontWeight:500}}>{l}</div><div style={{fontSize:7,color:C.t3}}>{d}</div></div><button style={{padding:"2px 6px",background:C.s2,border:`1px solid ${C.bd}`,borderRadius:2,color:C.tx,fontSize:7,fontFamily:FM}}>RUN</button></div>)}</Cd>
          <Cd><Lb c={C.ac}>SEBI COMPLIANCE (L19)</Lb>{[["Algo IDs","COMPLIANT",C.gn],["Static IPs","ACTIVE",C.gn],["2FA TOTP","ON",C.gn],["OPS<10/s","4.2/s",C.gn],["Audit 5yr","RECORDING",C.gn],["STT→0.15%","MODELED",C.am]].map(([l,v,c])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:9}}><span style={{color:C.t2}}>{l}</span><Bd color={c} s>{v}</Bd></div>)}</Cd>
          <Cd><Lb c={C.a3}>APPROVALS (L22)</Lb>{apprs.map(a=><div key={a.id} style={{padding:"4px 0",borderBottom:`1px solid ${C.bd}10`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><span style={{fontSize:9,fontWeight:500,color:C.a2}}>{a.n}</span><div style={{fontSize:7,color:C.t2}}>SR:{a.sh} WR:{a.wr}%</div></div>
            {a.st==="pending"?<div style={{display:"flex",gap:2}}>
              <button onClick={()=>setApprs(p=>p.map(x=>x.id===a.id?{...x,st:"approved"}:x))} style={{padding:"2px 6px",background:`${C.gn}15`,border:`1px solid ${C.gn}30`,borderRadius:2,color:C.gn,fontSize:7,fontFamily:FM}}>✓</button>
              <button onClick={()=>setApprs(p=>p.map(x=>x.id===a.id?{...x,st:"rejected"}:x))} style={{padding:"2px 6px",background:`${C.rd}15`,border:`1px solid ${C.rd}30`,borderRadius:2,color:C.rd,fontSize:7,fontFamily:FM}}>✕</button>
            </div>:<Bd color={a.st==="approved"?C.gn:C.rd} s>{a.st}</Bd>}
          </div>)}</Cd>
        </div>}

        {/* ═══ NOTIFICATIONS ═══ */}
        {tab==="notif"&&<div style={{animation:"su .3s"}}>
          <Lb i="🔔">NOTIFICATION CENTER — P0-P3 Priority Routing</Lb>
          {[0,1,2,3].map(p=><div key={p}>
            <div style={{fontSize:8,fontWeight:600,color:[C.rd,C.or,C.am,C.t2][p],letterSpacing:1,margin:"8px 0 4px",fontFamily:FM}}>
              {["P0 CRITICAL — Telegram+SMS+Phone","P1 URGENT — Telegram+Email","P2 IMPORTANT — Telegram","P3 INFO — Email"][p]}
            </div>
            {NOTIFICATIONS.filter(n=>n.p===p).map((n,i)=>(
              <Cd key={i} style={{marginBottom:3,borderLeft:`3px solid ${n.c}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,color:C.tx}}>{n.t}</span>
                  <span style={{fontSize:7,color:C.t3}}>{n.tm}</span>
                </div>
              </Cd>
            ))}
          </div>)}
        </div>}

        {/* ═══ AI TERMINAL ═══ */}
        {tab==="chat"&&<div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 100px)",animation:"su .3s"}}>
          <Cd style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <Lb i="▸">AI TERMINAL — 23L · 9C · {apis.filter(a=>a.st==="active").length} APIs · Processing all layers for every query</Lb>
            <div style={{flex:1,overflow:"auto",marginBottom:5}}>
              {chat.map((m,i)=>(
                <div key={i} style={{marginBottom:5,padding:7,borderRadius:3,background:m.r==="user"?`${C.ac}05`:m.r==="ai"?C.s2:`${C.a2}05`,borderLeft:`3px solid ${m.r==="user"?C.ac:m.r==="ai"?C.a3:C.a2}`,animation:"su .2s"}}>
                  <div style={{fontSize:7,color:m.r==="user"?C.ac:m.r==="ai"?C.a3:C.a2,fontWeight:600,letterSpacing:1,marginBottom:2}}>{m.r==="user"?"PRAN":m.r==="ai"?"NEXUS AI":"SYSTEM"}</div>
                  <div style={{fontSize:9,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.t}</div>
                </div>
              ))}
              {think&&<div style={{padding:7,borderRadius:3,background:C.s2,borderLeft:`3px solid ${C.a3}`}}><div style={{fontSize:9,color:C.t2,animation:"p 1s infinite"}}>Processing through 23 layers...</div></div>}
              <div ref={cr}/>
            </div>
            <div style={{display:"flex",gap:4}}>
              <input value={ci} onChange={e=>setCi(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doChat()} placeholder="Full signal · GEX analysis · Self-improve report · Regime · Kelly sizing" style={{...IS,flex:1,padding:"6px 10px"}}/>
              <button onClick={doChat} style={{padding:"6px 12px",background:C.ac,border:"none",borderRadius:3,color:C.bg,fontSize:9,fontWeight:700,fontFamily:FM}}>SEND</button>
            </div>
            <div style={{display:"flex",gap:2,marginTop:4,flexWrap:"wrap"}}>
              {["Full 23-layer signal","GEX + microstructure","Self-improvement report","Run regime detection","Validate edge (L17)","Trade autopsy summary"].map(q=>(
                <button key={q} onClick={()=>setCi(q)} style={{padding:"1px 5px",background:"transparent",border:`1px solid ${C.bd}`,borderRadius:2,color:C.t2,fontSize:7,fontFamily:FM}}>{q}</button>
              ))}
            </div>
          </Cd>
        </div>}

      </div>

      {/* FOOTER */}
      <div style={{borderTop:`1px solid ${C.bd}`,padding:"3px 10px",display:"flex",justifyContent:"space-between",background:C.s1,flexShrink:0,fontSize:7,color:C.t2}}>
        <span>23L✓ · 9C✓ · 5E✓ · {apis.filter(a=>a.st==="active").length}APIs · SEBI✓ · {killed?"⚠HALTED":"LIVE"}</span>
        <span style={{color:C.t3}}>NEXUS ULTIMATE · Hybrid μs+2s SLA · Sensex lot=20 · Thu expiry</span>
      </div>
    </div>
  );
}
