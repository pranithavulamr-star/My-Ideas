"""
Six indicator systems — each produces a signal: +1 (BUY), -1 (SELL), 0 (HOLD).

Indicators derived from the 6 strategy folders:
  1. ADX/DI System   — DI crossover filtered by ADX > 25
  2. Bollinger Bands  — Mean reversion at band extremes
  3. Breadth System   — McClellan Oscillator zero-line crossover
  4. EMA Cross        — 9/21 EMA crossover
  5. RSI System       — Overbought/Oversold (70/30)
  6. Supertrend       — Supertrend direction flip
"""
import numpy as np
import pandas as pd

from config import (
    ADX_PERIOD, ADX_THRESHOLD,
    BB_PERIOD, BB_STD_DEV,
    EMA_FAST_PERIOD, EMA_SLOW_PERIOD,
    RSI_PERIOD, RSI_OVERBOUGHT, RSI_OVERSOLD,
    ST_ATR_PERIOD, ST_MULTIPLIER,
    BREADTH_FAST_EMA, BREADTH_SLOW_EMA,
)


# =============================================================================
# Helper: Wilder's smoothing (used by ADX and Supertrend)
# =============================================================================

def _wilder_smooth(series: pd.Series, period: int) -> pd.Series:
    result = series.copy()
    result.iloc[:period] = np.nan
    result.iloc[period - 1] = series.iloc[:period].mean()
    for i in range(period, len(series)):
        result.iloc[i] = (result.iloc[i - 1] * (period - 1) + series.iloc[i]) / period
    return result


def _true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    return pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)


# =============================================================================
# 1. ADX / DI System
# =============================================================================

def compute_adx_di(df: pd.DataFrame) -> pd.DataFrame:
    """Compute +DI, -DI, ADX. Returns DataFrame with these columns added."""
    high, low, close = df["high"], df["low"], df["close"]
    period = ADX_PERIOD

    # Directional Movement
    up_move = high - high.shift(1)
    down_move = low.shift(1) - low
    plus_dm = pd.Series(np.where((up_move > down_move) & (up_move > 0), up_move, 0),
                        index=df.index)
    minus_dm = pd.Series(np.where((down_move > up_move) & (down_move > 0), down_move, 0),
                         index=df.index)

    tr = _true_range(high, low, close)
    atr = _wilder_smooth(tr, period)
    smooth_plus_dm = _wilder_smooth(plus_dm, period)
    smooth_minus_dm = _wilder_smooth(minus_dm, period)

    plus_di = 100 * smooth_plus_dm / atr
    minus_di = 100 * smooth_minus_dm / atr

    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di)
    adx = _wilder_smooth(dx, period)

    df["plus_di"] = plus_di
    df["minus_di"] = minus_di
    df["adx"] = adx
    return df


def signal_adx_di(df: pd.DataFrame) -> pd.Series:
    """
    ADX/DI Strategy: DI crossover filtered by ADX > threshold.
    BUY: +DI crosses above -DI while ADX > 25
    SELL: -DI crosses above +DI while ADX > 25
    """
    df = compute_adx_di(df.copy())
    adx_ok = df["adx"] >= ADX_THRESHOLD
    plus_above = df["plus_di"] > df["minus_di"]
    prev_plus_above = plus_above.shift(1).fillna(False)

    bull_cross = plus_above & ~prev_plus_above & adx_ok
    bear_cross = ~plus_above & prev_plus_above & adx_ok

    signal = pd.Series(0, index=df.index)
    signal[bull_cross] = 1
    signal[bear_cross] = -1
    return signal


# =============================================================================
# 2. Bollinger Bands System
# =============================================================================

def compute_bollinger(df: pd.DataFrame) -> pd.DataFrame:
    """Compute Bollinger Bands and %B."""
    close = df["close"]
    sma = close.rolling(BB_PERIOD).mean()
    std = close.rolling(BB_PERIOD).std()
    df["bb_upper"] = sma + BB_STD_DEV * std
    df["bb_lower"] = sma - BB_STD_DEV * std
    df["bb_mid"] = sma
    df["bb_pct_b"] = (close - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"])
    return df


def signal_bollinger(df: pd.DataFrame) -> pd.Series:
    """
    Bollinger Bands Mean Reversion:
    BUY: Close touches/breaks lower band (%B <= 0.05)
    SELL: Close touches/breaks upper band (%B >= 0.95)
    """
    df = compute_bollinger(df.copy())
    pct_b = df["bb_pct_b"]
    prev_pct_b = pct_b.shift(1)

    signal = pd.Series(0, index=df.index)
    signal[(pct_b <= 0.05) & (prev_pct_b > 0.05)] = 1
    signal[(pct_b >= 0.95) & (prev_pct_b < 0.95)] = -1
    return signal


# =============================================================================
# 3. Breadth System (McClellan Oscillator from constituent stocks)
# =============================================================================

def compute_mcclellan(breadth_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute McClellan Oscillator from advance/decline data.
    breadth_df must have columns: 'advancing', 'declining'
    McClellan = EMA_fast(net_advances) - EMA_slow(net_advances)
    """
    net_adv = breadth_df["advancing"] - breadth_df["declining"]
    fast_ema = net_adv.ewm(span=BREADTH_FAST_EMA, adjust=False).mean()
    slow_ema = net_adv.ewm(span=BREADTH_SLOW_EMA, adjust=False).mean()
    breadth_df["mcclellan"] = fast_ema - slow_ema
    return breadth_df


def signal_breadth(breadth_df: pd.DataFrame) -> pd.Series:
    """
    McClellan Oscillator zero-line crossover:
    BUY: McClellan crosses above 0
    SELL: McClellan crosses below 0
    If breadth_df is empty, returns all HOLD.
    """
    if breadth_df is None or breadth_df.empty or "advancing" not in breadth_df.columns:
        return pd.Series(dtype=int)

    breadth_df = compute_mcclellan(breadth_df.copy())
    mc = breadth_df["mcclellan"]
    prev_mc = mc.shift(1)

    signal = pd.Series(0, index=breadth_df.index)
    signal[(mc > 0) & (prev_mc <= 0)] = 1
    signal[(mc < 0) & (prev_mc >= 0)] = -1
    return signal


def compute_breadth_from_components(component_data: dict[str, pd.DataFrame],
                                     index_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build advance/decline series from individual stock DataFrames.
    Each stock DataFrame has 'close' column. A stock advances if its
    close > previous close, declines otherwise.

    Returns DataFrame aligned to index_df's index with 'advancing' and 'declining' columns.
    """
    if not component_data:
        return pd.DataFrame()

    adv_count = pd.Series(0, index=index_df.index, dtype=int)
    dec_count = pd.Series(0, index=index_df.index, dtype=int)

    for symbol, stock_df in component_data.items():
        if stock_df.empty or "close" not in stock_df.columns:
            continue
        # Align to index dates
        stock_close = stock_df["close"].reindex(index_df.index, method="ffill")
        change = stock_close.diff()
        adv_count += (change > 0).astype(int)
        dec_count += (change < 0).astype(int)

    result = pd.DataFrame({
        "advancing": adv_count,
        "declining": dec_count,
    }, index=index_df.index)
    return result


# =============================================================================
# 4. EMA Cross System
# =============================================================================

def signal_ema_cross(df: pd.DataFrame) -> pd.Series:
    """
    Dual EMA Crossover (9/21):
    BUY: Fast EMA crosses above Slow EMA
    SELL: Fast EMA crosses below Slow EMA
    """
    close = df["close"]
    fast = close.ewm(span=EMA_FAST_PERIOD, adjust=False).mean()
    slow = close.ewm(span=EMA_SLOW_PERIOD, adjust=False).mean()

    fast_above = fast > slow
    prev_fast_above = fast_above.shift(1).fillna(False)

    signal = pd.Series(0, index=df.index)
    signal[fast_above & ~prev_fast_above] = 1
    signal[~fast_above & prev_fast_above] = -1
    return signal


# =============================================================================
# 5. RSI System
# =============================================================================

def compute_rsi(close: pd.Series, period: int = RSI_PERIOD) -> pd.Series:
    """Wilder's RSI."""
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = _wilder_smooth(gain, period)
    avg_loss = _wilder_smooth(loss, period)
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def signal_rsi(df: pd.DataFrame) -> pd.Series:
    """
    RSI Overbought/Oversold:
    BUY: RSI crosses above oversold level (30) from below
    SELL: RSI crosses below overbought level (70) from above
    """
    rsi = compute_rsi(df["close"])
    prev_rsi = rsi.shift(1)

    signal = pd.Series(0, index=df.index)
    signal[(rsi > RSI_OVERSOLD) & (prev_rsi <= RSI_OVERSOLD)] = 1
    signal[(rsi < RSI_OVERBOUGHT) & (prev_rsi >= RSI_OVERBOUGHT)] = -1
    return signal


# =============================================================================
# 6. Supertrend System
# =============================================================================

def compute_supertrend(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute Supertrend using Wilder's ATR smoothing.
    Adds 'supertrend', 'st_direction' columns.
    """
    high, low, close = df["high"], df["low"], df["close"]
    period = ST_ATR_PERIOD
    multiplier = ST_MULTIPLIER

    tr = _true_range(high, low, close)
    atr = _wilder_smooth(tr, period)

    hl2 = (high + low) / 2
    basic_upper = hl2 + multiplier * atr
    basic_lower = hl2 - multiplier * atr

    final_upper = basic_upper.copy()
    final_lower = basic_lower.copy()
    supertrend = pd.Series(np.nan, index=df.index)
    direction = pd.Series(1, index=df.index)

    for i in range(period, len(df)):
        # Clamp upper band (can only decrease)
        if (basic_upper.iloc[i] < final_upper.iloc[i - 1] or
                close.iloc[i - 1] > final_upper.iloc[i - 1]):
            final_upper.iloc[i] = basic_upper.iloc[i]
        else:
            final_upper.iloc[i] = final_upper.iloc[i - 1]

        # Clamp lower band (can only increase)
        if (basic_lower.iloc[i] > final_lower.iloc[i - 1] or
                close.iloc[i - 1] < final_lower.iloc[i - 1]):
            final_lower.iloc[i] = basic_lower.iloc[i]
        else:
            final_lower.iloc[i] = final_lower.iloc[i - 1]

        # Direction logic
        if i == period:
            direction.iloc[i] = 1 if close.iloc[i] > final_upper.iloc[i] else -1
        else:
            prev_dir = direction.iloc[i - 1]
            if prev_dir == 1:
                direction.iloc[i] = -1 if close.iloc[i] < final_lower.iloc[i] else 1
            else:
                direction.iloc[i] = 1 if close.iloc[i] > final_upper.iloc[i] else -1

        supertrend.iloc[i] = (final_lower.iloc[i] if direction.iloc[i] == 1
                              else final_upper.iloc[i])

    df["supertrend"] = supertrend
    df["st_direction"] = direction
    return df


def signal_supertrend(df: pd.DataFrame) -> pd.Series:
    """
    Supertrend direction flip:
    BUY: Direction flips from -1 to 1
    SELL: Direction flips from 1 to -1
    """
    df = compute_supertrend(df.copy())
    direction = df["st_direction"]
    prev_dir = direction.shift(1)

    signal = pd.Series(0, index=df.index)
    signal[(direction == 1) & (prev_dir == -1)] = 1
    signal[(direction == -1) & (prev_dir == 1)] = -1
    return signal
