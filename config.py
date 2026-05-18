"""
Configuration for the Combined Indicator Paper Trading Bot — Sensex.
Reads API credentials from api_key.txt in the same directory.
"""
from pathlib import Path

# ── Read API credentials from api_key.txt ───────────────────────────────
_creds_path = Path(__file__).parent / "api_key.txt"
_lines = _creds_path.read_text().strip().splitlines()

KITE_API_KEY = _lines[0].strip()
KITE_API_SECRET = _lines[1].strip()
KITE_USER_ID = _lines[2].strip()
KITE_PASSWORD = _lines[3].strip()
KITE_TOTP_SECRET = _lines[4].strip()

# ── Sensex instrument ───────────────────────────────────────────────────
SENSEX_INSTRUMENT_TOKEN = 265
SENSEX_TRADING_SYMBOL = "SENSEX"
EXCHANGE = "BSE"

# ── Trading parameters ──────────────────────────────────────────────────
INITIAL_CAPITAL = 1_000_000        # Rs 10 lakh paper capital
RISK_PER_TRADE_PCT = 1.0           # 1% risk per trade
CONSENSUS_THRESHOLD = 0.40         # 40% of indicators must agree
POLLING_INTERVAL_SEC = 60          # check every 60 seconds
CANDLE_INTERVAL = "5minute"        # candle timeframe for signals
LOOKBACK_DAYS = 60                 # historical data for indicator warmup

# ── Indicator default parameters ────────────────────────────────────────
# ADX/DI
ADX_PERIOD = 14
ADX_THRESHOLD = 25

# Bollinger Bands
BB_PERIOD = 20
BB_STD_DEV = 2.0

# EMA Cross
EMA_FAST_PERIOD = 9
EMA_SLOW_PERIOD = 21

# RSI
RSI_PERIOD = 14
RSI_OVERBOUGHT = 70
RSI_OVERSOLD = 30

# Supertrend
ST_ATR_PERIOD = 10
ST_MULTIPLIER = 3.0

# Breadth (uses Sensex top components)
BREADTH_FAST_EMA = 19
BREADTH_SLOW_EMA = 39

# ── Sensex 30 component tokens (BSE instrument tokens) ─────────────────
# These are the top Sensex constituent stocks for breadth calculation
SENSEX_COMPONENTS = {
    "RELIANCE": 738561,
    "TCS": 2953217,
    "HDFCBANK": 341249,
    "INFY": 408065,
    "ICICIBANK": 1270529,
    "HINDUNILVR": 356865,
    "ITC": 424961,
    "SBIN": 779521,
    "BHARTIARTL": 2714625,
    "KOTAKBANK": 492033,
    "LT": 2939649,
    "AXISBANK": 1510401,
    "ASIANPAINT": 60417,
    "MARUTI": 2815745,
    "TITAN": 897537,
    "SUNPHARMA": 857857,
    "BAJFINANCE": 81153,
    "ULTRACEMCO": 2952193,
    "WIPRO": 969473,
    "HCLTECH": 1850625,
    "NTPC": 2977281,
    "POWERGRID": 3834113,
    "TATAMOTORS": 884737,
    "TATASTEEL": 895745,
    "INDUSINDBK": 1346049,
    "BAJAJFINSV": 4268801,
    "TECHM": 3465729,
    "NESTLEIND": 4598529,
    "M&M": 519937,
    "JSWSTEEL": 3001089,
}

# ── Logging ─────────────────────────────────────────────────────────────
LOG_FILE = "q1/paper_trading.log"
