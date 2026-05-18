"""
Paper Trading Bot for Sensex using the 6-indicator consensus system.

Uses ALL internal strategies from each of the 6 indicator folders.
Each strategy votes (+1/-1/0). Majority within each indicator determines
that indicator's signal. Then 4 of 6 indicators must agree for a trade.

Logs every completed trade to a CSV file with full signal details.
"""
import csv
import logging
import os
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, field

import pandas as pd
from kiteconnect import KiteConnect

from config import (
    SENSEX_INSTRUMENT_TOKEN, SENSEX_COMPONENTS, EXCHANGE,
    INITIAL_CAPITAL, RISK_PER_TRADE_PCT,
    POLLING_INTERVAL_SEC, CANDLE_INTERVAL, LOOKBACK_DAYS,
    ST_ATR_PERIOD,
)
from indicator_runner import run_all_indicators, INDICATOR_NAMES

logger = logging.getLogger(__name__)

# Kite API max days per request by interval
MAX_DAYS = {
    "minute": 60, "5minute": 100, "15minute": 200,
    "60minute": 400, "day": 2000,
}

TRADE_LOG_CSV = os.path.join(os.path.dirname(__file__), "trade_log.csv")

CSV_HEADERS = [
    "trade_no", "entry_time", "exit_time", "direction",
    "entry_price", "exit_price", "quantity", "pnl", "exit_reason",
    "indicators_agreed", "consensus_signal",
    "ADX_DI_signal", "ADX_DI_buy_votes", "ADX_DI_sell_votes", "ADX_DI_total",
    "Bollinger_Bands_signal", "BB_buy_votes", "BB_sell_votes", "BB_total",
    "Breadth_signal", "Breadth_buy_votes", "Breadth_sell_votes", "Breadth_total",
    "EMA_Cross_signal", "EMA_buy_votes", "EMA_sell_votes", "EMA_total",
    "RSI_signal", "RSI_buy_votes", "RSI_sell_votes", "RSI_total",
    "Supertrend_signal", "ST_buy_votes", "ST_sell_votes", "ST_total",
    "equity_after",
]


def _ensure_csv_header():
    """Create CSV file with headers if it doesn't exist."""
    if not os.path.exists(TRADE_LOG_CSV):
        with open(TRADE_LOG_CSV, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(CSV_HEADERS)


def _log_trade_to_csv(trade_no: int, trade, indicator_results: dict, equity: float):
    """Append a completed trade row to the CSV log."""
    _ensure_csv_header()

    consensus = indicator_results.get("_consensus", {})
    label_map = {1: "BUY", -1: "SELL", 0: "HOLD"}
    dir_label = "LONG" if trade.direction == 1 else "SHORT"

    row = [
        trade_no,
        trade.entry_time,
        trade.exit_time,
        dir_label,
        f"{trade.entry_price:.2f}",
        f"{trade.exit_price:.2f}",
        trade.quantity,
        f"{trade.pnl:.2f}",
        trade.exit_reason,
        consensus.get("buy_indicators", 0) if trade.direction == 1
            else consensus.get("sell_indicators", 0),
        label_map.get(consensus.get("signal", 0), "HOLD"),
    ]

    # Add per-indicator details
    for name in INDICATOR_NAMES:
        ind = indicator_results.get(name, {})
        details = ind.get("details", {})
        row.append(label_map.get(ind.get("signal", 0), "HOLD"))
        row.append(details.get("buy_votes", 0))
        row.append(details.get("sell_votes", 0))
        row.append(details.get("total_strategies", 0))

    row.append(f"{equity:.2f}")

    for attempt in range(5):
        try:
            with open(TRADE_LOG_CSV, "a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(row)
            break
        except PermissionError:
            if attempt < 4:
                import time as _time
                logger.warning(f"CSV locked, retrying in 2s (attempt {attempt+1}/5)...")
                _time.sleep(2)
            else:
                logger.error(f"Could not write to CSV after 5 attempts. Trade data: {row}")

    logger.info(f"Trade #{trade_no} logged to {TRADE_LOG_CSV}")


@dataclass
class PaperTrade:
    entry_time: datetime
    entry_price: float
    direction: int              # +1 = LONG, -1 = SHORT
    quantity: int
    stop_loss: float
    take_profit: float
    exit_time: datetime | None = None
    exit_price: float | None = None
    pnl: float = 0.0
    exit_reason: str = ""


@dataclass
class PaperPortfolio:
    initial_capital: float = INITIAL_CAPITAL
    cash: float = INITIAL_CAPITAL
    position: PaperTrade | None = None
    closed_trades: list = field(default_factory=list)
    equity_curve: list = field(default_factory=list)

    @property
    def total_pnl(self) -> float:
        return sum(t.pnl for t in self.closed_trades)

    @property
    def equity(self) -> float:
        return self.cash

    @property
    def win_rate(self) -> float:
        if not self.closed_trades:
            return 0.0
        wins = sum(1 for t in self.closed_trades if t.pnl > 0)
        return wins / len(self.closed_trades) * 100

    def summary(self) -> dict:
        trades = self.closed_trades
        wins = [t for t in trades if t.pnl > 0]
        losses = [t for t in trades if t.pnl <= 0]
        return {
            "total_trades": len(trades),
            "winning_trades": len(wins),
            "losing_trades": len(losses),
            "win_rate": f"{self.win_rate:.1f}%",
            "total_pnl": f"Rs {self.total_pnl:,.2f}",
            "avg_win": f"Rs {(sum(t.pnl for t in wins) / len(wins)):,.2f}" if wins else "N/A",
            "avg_loss": f"Rs {(sum(t.pnl for t in losses) / len(losses)):,.2f}" if losses else "N/A",
            "current_equity": f"Rs {self.equity:,.2f}",
            "return_pct": f"{(self.equity - self.initial_capital) / self.initial_capital * 100:.2f}%",
            "position": "LONG" if self.position and self.position.direction == 1
                        else "SHORT" if self.position and self.position.direction == -1
                        else "FLAT",
        }


def fetch_historical(kite: KiteConnect, token: int,
                     from_date: datetime, to_date: datetime,
                     interval: str = "day") -> pd.DataFrame:
    """Fetch historical OHLCV data with auto-pagination."""
    max_days = MAX_DAYS.get(interval, 60)
    all_data = []
    current = from_date

    while current < to_date:
        chunk_end = min(current + timedelta(days=max_days), to_date)
        try:
            data = kite.historical_data(token, current, chunk_end, interval)
            all_data.extend(data)
        except Exception as e:
            logger.error(f"Error fetching data {current.date()}-{chunk_end.date()}: {e}")
        current = chunk_end + timedelta(days=1)

    if not all_data:
        return pd.DataFrame(columns=["date", "open", "high", "low", "close", "volume"])

    df = pd.DataFrame(all_data)
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    return df


def fetch_component_data(kite: KiteConnect, from_date: datetime,
                          to_date: datetime, interval: str = "day"
                          ) -> dict[str, pd.DataFrame]:
    """Fetch historical data for all Sensex component stocks."""
    component_data = {}
    for symbol, token in SENSEX_COMPONENTS.items():
        try:
            df = fetch_historical(kite, token, from_date, to_date, interval)
            if not df.empty:
                component_data[symbol] = df
                logger.info(f"Fetched {symbol}: {len(df)} bars")
        except Exception as e:
            logger.warning(f"Failed to fetch {symbol}: {e}")
    return component_data


def compute_atr(df: pd.DataFrame, period: int = ST_ATR_PERIOD) -> pd.Series:
    """Compute ATR for position sizing."""
    high, low, close = df["high"], df["low"], df["close"]
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.rolling(period).mean()


class PaperTradingBot:
    """
    Live paper trading bot for Sensex.
    Uses all internal strategies from 6 indicator folders.
    Majority vote within each indicator, then 4/6 consensus for trades.
    Logs every trade to CSV.
    """

    def __init__(self, kite: KiteConnect):
        self.kite = kite
        self.portfolio = PaperPortfolio()
        self.running = False
        self._last_signal = 0
        self._last_indicator_results = {}
        self._trade_count = 0

    def _fetch_latest_data(self) -> tuple[pd.DataFrame, dict[str, pd.DataFrame] | None]:
        """Fetch recent historical data for all indicators."""
        to_date = datetime.now()
        from_date = to_date - timedelta(days=LOOKBACK_DAYS)

        logger.info(f"Fetching Sensex data from {from_date.date()} to {to_date.date()}...")
        sensex_df = fetch_historical(
            self.kite, SENSEX_INSTRUMENT_TOKEN,
            from_date, to_date, CANDLE_INTERVAL
        )

        # Fetch component data for breadth calculation
        logger.info("Fetching component stock data for breadth...")
        try:
            component_data = fetch_component_data(
                self.kite, from_date, to_date, CANDLE_INTERVAL
            )
        except Exception as e:
            logger.warning(f"Component data fetch failed: {e}. Breadth excluded.")
            component_data = None

        return sensex_df, component_data

    def _calculate_position_size(self, entry_price: float, stop_loss: float) -> int:
        """Risk-based position sizing: risk 1% of equity per trade."""
        risk_amount = self.portfolio.equity * (RISK_PER_TRADE_PCT / 100)
        risk_per_unit = abs(entry_price - stop_loss)
        if risk_per_unit <= 0:
            return 0
        qty = int(risk_amount / risk_per_unit)
        return max(qty, 1)

    def _open_position(self, direction: int, price: float, atr: float, timestamp):
        """Open a paper trade."""
        stop_loss = price - (2.0 * atr * direction)
        take_profit = price + (3.0 * atr * direction)
        qty = self._calculate_position_size(price, stop_loss)

        trade = PaperTrade(
            entry_time=timestamp,
            entry_price=price,
            direction=direction,
            quantity=qty,
            stop_loss=stop_loss,
            take_profit=take_profit,
        )
        self.portfolio.position = trade

        dir_label = "LONG" if direction == 1 else "SHORT"
        logger.info(
            f"{'='*60}\n"
            f"  PAPER TRADE OPENED: {dir_label}\n"
            f"  Entry: Rs {price:,.2f} | Qty: {qty}\n"
            f"  Stop Loss: Rs {stop_loss:,.2f} | Take Profit: Rs {take_profit:,.2f}\n"
            f"  Time: {timestamp}\n"
            f"{'='*60}"
        )
        print(
            f"\n>>> PAPER TRADE OPENED: {dir_label} @ Rs {price:,.2f} "
            f"| Qty: {qty} | SL: Rs {stop_loss:,.2f} | TP: Rs {take_profit:,.2f}"
        )

    def _close_position(self, price: float, timestamp, reason: str):
        """Close current paper trade, record P&L, and log to CSV."""
        trade = self.portfolio.position
        if trade is None:
            return

        trade.exit_time = timestamp
        trade.exit_price = price
        trade.pnl = (price - trade.entry_price) * trade.direction * trade.quantity
        trade.exit_reason = reason
        self.portfolio.cash += trade.pnl
        self.portfolio.closed_trades.append(trade)
        self.portfolio.position = None
        self._trade_count += 1

        pnl_sign = "+" if trade.pnl >= 0 else ""
        dir_label = "LONG" if trade.direction == 1 else "SHORT"
        logger.info(
            f"{'='*60}\n"
            f"  PAPER TRADE CLOSED: {dir_label} ({reason})\n"
            f"  Exit: Rs {price:,.2f} | P&L: {pnl_sign}Rs {trade.pnl:,.2f}\n"
            f"  Equity: Rs {self.portfolio.equity:,.2f}\n"
            f"{'='*60}"
        )
        print(
            f"\n<<< PAPER TRADE CLOSED: {dir_label} @ Rs {price:,.2f} "
            f"| P&L: {pnl_sign}Rs {trade.pnl:,.2f} | Reason: {reason}"
        )

        # Log to CSV
        _log_trade_to_csv(
            self._trade_count, trade,
            self._last_indicator_results,
            self.portfolio.equity
        )

    def _check_stops(self, current_price: float, timestamp):
        """Check if stop loss or take profit is hit."""
        trade = self.portfolio.position
        if trade is None:
            return

        if trade.direction == 1:  # LONG
            if current_price <= trade.stop_loss:
                self._close_position(trade.stop_loss, timestamp, "stop_loss")
            elif current_price >= trade.take_profit:
                self._close_position(trade.take_profit, timestamp, "take_profit")
        else:  # SHORT
            if current_price >= trade.stop_loss:
                self._close_position(trade.stop_loss, timestamp, "stop_loss")
            elif current_price <= trade.take_profit:
                self._close_position(trade.take_profit, timestamp, "take_profit")

    def _print_status(self, indicator_results: dict, current_price: float):
        """Print current indicator status with per-indicator strategy breakdowns."""
        consensus = indicator_results.get("_consensus", {})
        indicator_signals = consensus.get("indicator_signals", {})
        labels = {1: "BUY ", -1: "SELL", 0: "HOLD"}

        print(f"\n{'-'*70}")
        print(f"  SENSEX: Rs {current_price:,.2f} | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'-'*70}")
        print("  Indicator Verdicts (majority of internal strategies):")

        for name in INDICATOR_NAMES:
            ind = indicator_results.get(name, {})
            sig = ind.get("signal", 0)
            details = ind.get("details", {})
            buy_v = details.get("buy_votes", 0)
            sell_v = details.get("sell_votes", 0)
            hold_v = details.get("hold_votes", 0)
            total = details.get("total_strategies", 0)
            marker = "[*]" if sig != 0 else "[ ]"
            print(f"    {marker} {name:<18s} -> {labels.get(sig, 'HOLD')}  "
                  f"(B:{buy_v} S:{sell_v} H:{hold_v} / {total} strategies)")

        print(f"{'-'*70}")
        buy_ind = consensus.get("buy_indicators", 0)
        sell_ind = consensus.get("sell_indicators", 0)
        print(f"  Indicators: BUY={buy_ind} | SELL={sell_ind} | Required=4")
        print(f"  CONSENSUS: {consensus.get('label', 'HOLD')}")

        pos = self.portfolio.position
        if pos:
            dir_label = "LONG" if pos.direction == 1 else "SHORT"
            unrealized = (current_price - pos.entry_price) * pos.direction * pos.quantity
            print(f"  Position: {dir_label} @ Rs {pos.entry_price:,.2f} "
                  f"| Unrealized: Rs {unrealized:,.2f}")
        else:
            print(f"  Position: FLAT")
        print(f"  Equity: Rs {self.portfolio.equity:,.2f} "
              f"| Trades: {len(self.portfolio.closed_trades)} "
              f"| Win Rate: {self.portfolio.win_rate:.1f}%")
        print(f"{'-'*70}")

    def run(self):
        """Main trading loop -- polls at regular intervals."""
        self.running = True
        _ensure_csv_header()

        print(f"\n{'='*70}")
        print(f"  SENSEX PAPER TRADING BOT v2.0")
        print(f"  Capital: Rs {INITIAL_CAPITAL:,.2f}")
        print(f"  Rule: 4 of 6 indicators must agree (majority of internal strategies)")
        print(f"  Strategies: ADX(12) + BB(12) + Breadth(8) + EMA(5) + RSI(8) + ST(17) = 62")
        print(f"  Polling: {POLLING_INTERVAL_SEC}s | Candles: {CANDLE_INTERVAL}")
        print(f"  Trade log: {TRADE_LOG_CSV}")
        print(f"{'='*70}\n")

        while self.running:
            try:
                # Fetch latest data
                sensex_df, component_data = self._fetch_latest_data()

                if sensex_df.empty or len(sensex_df) < 50:
                    logger.warning("Insufficient data, waiting...")
                    time.sleep(POLLING_INTERVAL_SEC)
                    continue

                # Run all 62 strategies across 6 indicators
                indicator_results = run_all_indicators(sensex_df, component_data)
                self._last_indicator_results = indicator_results

                # Current price
                current_price = sensex_df["close"].iloc[-1]
                current_time = sensex_df.index[-1]

                # Compute ATR for position sizing
                atr = compute_atr(sensex_df)
                current_atr = atr.iloc[-1] if not pd.isna(atr.iloc[-1]) else current_price * 0.01

                # Print status
                self._print_status(indicator_results, current_price)

                # Check stops on existing position
                self._check_stops(current_price, current_time)

                # Process consensus signal
                consensus = indicator_results.get("_consensus", {})
                signal = consensus.get("signal", 0)

                if self.portfolio.position is None:
                    # No position -- open on consensus
                    if signal == 1:
                        self._open_position(1, current_price, current_atr, current_time)
                    elif signal == -1:
                        self._open_position(-1, current_price, current_atr, current_time)
                else:
                    # Has position -- check for reversal
                    pos_dir = self.portfolio.position.direction
                    if signal != 0 and signal != pos_dir:
                        self._close_position(current_price, current_time, "signal_reversal")
                        self._open_position(signal, current_price, current_atr, current_time)

                # Track equity
                self.portfolio.equity_curve.append({
                    "time": current_time,
                    "equity": self.portfolio.equity,
                    "price": current_price,
                    "signal": signal,
                })

                self._last_signal = signal

            except KeyboardInterrupt:
                logger.info("Keyboard interrupt -- stopping bot...")
                self.stop()
                break
            except Exception as e:
                logger.error(f"Error in trading loop: {e}", exc_info=True)
                print(f"\n[ERROR] {e}")

            # Wait for next poll
            time.sleep(POLLING_INTERVAL_SEC)

    def stop(self):
        """Stop the bot and print final summary."""
        self.running = False

        # Close any open position
        if self.portfolio.position:
            print("\nClosing open position at last known price...")
            last_price = (self.portfolio.equity_curve[-1]["price"]
                         if self.portfolio.equity_curve else 0)
            self._close_position(last_price, datetime.now(), "bot_stopped")

        summary = self.portfolio.summary()
        print(f"\n{'='*70}")
        print(f"  PAPER TRADING SESSION SUMMARY")
        print(f"{'='*70}")
        for key, val in summary.items():
            print(f"  {key:<20s}: {val}")
        print(f"  trade_log_csv      : {TRADE_LOG_CSV}")
        print(f"{'='*70}\n")

    def run_backtest(self, from_date: datetime, to_date: datetime,
                     interval: str = "day"):
        """
        Backtest over historical data using daily candles.
        Fetches data in yearly chunks, runs all 62 strategies at each bar,
        and simulates trades. Results logged to CSV.
        """
        print(f"\n{'='*70}")
        print(f"  BACKTEST: {from_date.date()} to {to_date.date()}")
        print(f"  Interval: {interval}")
        print(f"  Strategies: 62 across 6 indicators, 4/6 consensus")
        print(f"{'='*70}\n")

        # Fetch Sensex data
        print("Fetching Sensex historical data...")
        sensex_df = fetch_historical(
            self.kite, SENSEX_INSTRUMENT_TOKEN,
            from_date, to_date, interval
        )
        if sensex_df.empty:
            print("No data available for backtest period.")
            return
        print(f"  Sensex: {len(sensex_df)} bars loaded")

        # Fetch component data for breadth
        print("Fetching component stock data for breadth...")
        try:
            component_data = fetch_component_data(
                self.kite, from_date, to_date, interval
            )
            print(f"  Components: {len(component_data)} stocks loaded")
        except Exception as e:
            logger.warning(f"Component data fetch failed: {e}")
            component_data = None

        # We need a lookback window for indicator warmup
        WARMUP = 200  # bars needed for indicators like 200 EMA
        total_bars = len(sensex_df)

        if total_bars <= WARMUP:
            print(f"Not enough data ({total_bars} bars, need > {WARMUP}).")
            return

        atr = compute_atr(sensex_df)

        print(f"\nRunning backtest across {total_bars - WARMUP} bars...\n")

        for i in range(WARMUP, total_bars):
            # Use data up to bar i for signal computation
            window_df = sensex_df.iloc[:i+1]
            current_price = sensex_df["close"].iloc[i]
            current_time = sensex_df.index[i]
            current_atr = atr.iloc[i] if not pd.isna(atr.iloc[i]) else current_price * 0.01

            # Check stops first
            self._check_stops(current_price, current_time)

            # Run all indicators on the window
            # Build component window too
            comp_window = None
            if component_data:
                comp_window = {}
                for sym, sdf in component_data.items():
                    mask = sdf.index <= current_time
                    if mask.any():
                        comp_window[sym] = sdf.loc[mask]

            indicator_results = run_all_indicators(window_df, comp_window)
            self._last_indicator_results = indicator_results

            consensus = indicator_results.get("_consensus", {})
            signal = consensus.get("signal", 0)

            # Trade logic
            if self.portfolio.position is None:
                if signal == 1:
                    self._open_position(1, current_price, current_atr, current_time)
                elif signal == -1:
                    self._open_position(-1, current_price, current_atr, current_time)
            else:
                pos_dir = self.portfolio.position.direction
                if signal != 0 and signal != pos_dir:
                    self._close_position(current_price, current_time, "signal_reversal")
                    self._open_position(signal, current_price, current_atr, current_time)

            self.portfolio.equity_curve.append({
                "time": current_time,
                "equity": self.portfolio.equity,
                "price": current_price,
                "signal": signal,
            })

            # Progress update every 50 bars
            done = i - WARMUP + 1
            total = total_bars - WARMUP
            if done % 50 == 0 or done == total:
                pct = done / total * 100
                trades = len(self.portfolio.closed_trades)
                print(f"  [{pct:5.1f}%] Bar {done}/{total} | "
                      f"Date: {current_time.strftime('%Y-%m-%d')} | "
                      f"Price: {current_price:,.2f} | "
                      f"Trades: {trades} | Equity: Rs {self.portfolio.equity:,.2f}")

        # Final summary
        self.stop()
