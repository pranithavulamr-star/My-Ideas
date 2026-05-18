"""
Consensus Engine — combines signals from all 6 indicator systems.

Rule: When >= 40% of indicators agree on BUY or SELL, take that action.
With 6 indicators, 40% = 2.4, so we need >= 3 indicators to agree.
"""
import logging
import pandas as pd
import numpy as np

from indicators import (
    signal_adx_di,
    signal_bollinger,
    signal_breadth,
    signal_ema_cross,
    signal_rsi,
    signal_supertrend,
    compute_breadth_from_components,
)
from config import CONSENSUS_THRESHOLD

logger = logging.getLogger(__name__)

INDICATOR_NAMES = [
    "ADX_DI",
    "Bollinger_Bands",
    "Breadth_McClellan",
    "EMA_Cross",
    "RSI",
    "Supertrend",
]


def compute_all_signals(df: pd.DataFrame,
                         component_data: dict[str, pd.DataFrame] | None = None
                         ) -> pd.DataFrame:
    """
    Run all 6 indicator systems and return a DataFrame with individual
    signals and the consensus signal.

    Parameters
    ----------
    df : pd.DataFrame
        SENSEX OHLCV data with columns: open, high, low, close, volume
    component_data : dict, optional
        Dict of {symbol: DataFrame} for Sensex component stocks.
        Used by the Breadth system. If None, breadth is excluded from count.

    Returns
    -------
    pd.DataFrame with columns:
        - ADX_DI, Bollinger_Bands, Breadth_McClellan, EMA_Cross, RSI, Supertrend
        - buy_count, sell_count, active_indicators
        - consensus_signal: +1 (BUY), -1 (SELL), 0 (HOLD)
        - consensus_pct: fraction of indicators agreeing
    """
    signals = pd.DataFrame(index=df.index)

    # 1. ADX/DI
    logger.info("Computing ADX/DI signals...")
    signals["ADX_DI"] = signal_adx_di(df)

    # 2. Bollinger Bands
    logger.info("Computing Bollinger Bands signals...")
    signals["Bollinger_Bands"] = signal_bollinger(df)

    # 3. Breadth (McClellan)
    logger.info("Computing Breadth/McClellan signals...")
    if component_data:
        breadth_df = compute_breadth_from_components(component_data, df)
        breadth_signal = signal_breadth(breadth_df)
        if not breadth_signal.empty:
            signals["Breadth_McClellan"] = breadth_signal
        else:
            signals["Breadth_McClellan"] = 0
    else:
        signals["Breadth_McClellan"] = 0
        logger.warning("No component data — Breadth indicator excluded")

    # 4. EMA Cross
    logger.info("Computing EMA Cross signals...")
    signals["EMA_Cross"] = signal_ema_cross(df)

    # 5. RSI
    logger.info("Computing RSI signals...")
    signals["RSI"] = signal_rsi(df)

    # 6. Supertrend
    logger.info("Computing Supertrend signals...")
    signals["Supertrend"] = signal_supertrend(df)

    # ── Consensus calculation ───────────────────────────────────────────
    # Track the *last known signal* from each indicator (carry forward)
    # This way we know the current "stance" of each indicator
    indicator_cols = [c for c in INDICATOR_NAMES if c in signals.columns]

    # Create a "stance" DataFrame: carry forward last non-zero signal
    stance = signals[indicator_cols].copy()
    for col in indicator_cols:
        stance[col] = stance[col].replace(0, np.nan).ffill().fillna(0).astype(int)

    # Count active indicators (those that have ever produced a signal)
    has_signal = (stance != 0)

    # Count buy and sell stances
    signals["buy_count"] = (stance == 1).sum(axis=1)
    signals["sell_count"] = (stance == -1).sum(axis=1)
    signals["active_indicators"] = has_signal.sum(axis=1)

    # Consensus: need >= 40% of active indicators to agree (vectorized)
    active = signals["active_indicators"].replace(0, np.nan)
    buy_pct = signals["buy_count"] / active
    sell_pct = signals["sell_count"] / active

    consensus = pd.Series(0, index=signals.index)
    consensus_pct = pd.Series(0.0, index=signals.index)

    buy_mask = buy_pct >= CONSENSUS_THRESHOLD
    sell_mask = (~buy_mask) & (sell_pct >= CONSENSUS_THRESHOLD)
    hold_mask = ~buy_mask & ~sell_mask

    consensus[buy_mask] = 1
    consensus[sell_mask] = -1
    consensus_pct[buy_mask] = buy_pct[buy_mask]
    consensus_pct[sell_mask] = sell_pct[sell_mask]
    consensus_pct[hold_mask] = np.maximum(buy_pct[hold_mask], sell_pct[hold_mask])

    signals["consensus_signal"] = consensus.fillna(0).astype(int)
    signals["consensus_pct"] = consensus_pct.fillna(0)

    # Detect changes in consensus (only trade on transitions)
    signals["consensus_change"] = signals["consensus_signal"].diff().fillna(0)

    return signals


def get_latest_consensus(signals_df: pd.DataFrame) -> dict:
    """
    Get the latest consensus status from the signals DataFrame.
    Returns a dict with current stance of each indicator and the consensus.
    """
    last = signals_df.iloc[-1]
    indicator_cols = [c for c in INDICATOR_NAMES if c in signals_df.columns]

    # Get carried-forward stances
    stances = {}
    for col in indicator_cols:
        non_zero = signals_df[col][signals_df[col] != 0]
        stances[col] = int(non_zero.iloc[-1]) if not non_zero.empty else 0

    result = {
        "indicator_stances": stances,
        "buy_count": int(last.get("buy_count", 0)),
        "sell_count": int(last.get("sell_count", 0)),
        "active_indicators": int(last.get("active_indicators", 0)),
        "consensus_signal": int(last.get("consensus_signal", 0)),
        "consensus_pct": float(last.get("consensus_pct", 0)),
        "consensus_changed": last.get("consensus_change", 0) != 0,
        "signal_label": {1: "BUY", -1: "SELL", 0: "HOLD"}.get(
            int(last.get("consensus_signal", 0)), "HOLD"
        ),
    }
    return result
