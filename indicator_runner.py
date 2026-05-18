"""
Indicator Runner — Imports and runs ALL internal strategies from each of
the 6 indicator folders. Each strategy's last signal becomes a vote (+1/-1/0).
Majority voting within each indicator determines that indicator's overall signal.
"""
import os
import sys
import logging
import importlib
from pathlib import Path

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Root path for all indicator folders
ROOT = Path(__file__).resolve().parent.parent


def _run_strategy_isolated(folder_name: str, module_path: str, class_name: str,
                           df: pd.DataFrame, init_style: str = "params",
                           params: dict = None, method: str = "generate_signals"):
    """
    Import, instantiate, and run a strategy entirely inside an isolated context.
    This ensures lazy imports inside strategy methods can still find 'core' etc.

    init_style: "params" = cls(params=params), "kwargs" = cls(**params)
    method: "generate_signals" or "compute"
    Returns the signal Series, or None on failure.
    """
    folder = str(ROOT / folder_name)
    file_path = os.path.join(folder, module_path.replace(".", os.sep) + ".py")

    if not os.path.exists(file_path):
        return None

    original_path = sys.path.copy()
    conflicting_prefixes = ("strategies", "core", "config", "indicators", "risk",
                            "data", "engine", "utils", "backtesting", "trading")
    saved_modules = {}
    for k, v in list(sys.modules.items()):
        for p in conflicting_prefixes:
            if k == p or k.startswith(p + "."):
                saved_modules[k] = v
                break

    try:
        # Remove conflicting modules
        for k in list(saved_modules.keys()):
            if k in sys.modules:
                del sys.modules[k]

        # Set path: this folder first, then only standard/site-packages
        sys.path = [folder] + [p for p in original_path if "Algo indi" not in p]

        # Clear cached module entries
        parts = module_path.split(".")
        for i in range(len(parts)):
            partial = ".".join(parts[:i+1])
            if partial in sys.modules:
                del sys.modules[partial]

        # Import
        module = importlib.import_module(module_path)
        cls = getattr(module, class_name, None)
        if cls is None:
            return None

        # Instantiate
        p = params or {}
        if init_style == "params":
            strategy = cls(params=p) if p else cls()
        else:
            strategy = cls(**p) if p else cls()

        # Run - all inside the isolated context so lazy imports work
        run_method = getattr(strategy, method)
        result = run_method(df.copy())
        return _extract_signal(result)

    except Exception as e:
        logger.warning(f"{folder_name}/{class_name} failed: {e}")
        return None
    finally:
        sys.path = original_path
        for k in list(sys.modules.keys()):
            for p in conflicting_prefixes:
                if k == p or k.startswith(p + "."):
                    del sys.modules[k]
                    break
        sys.modules.update(saved_modules)


def _get_last_stance(signal_series: pd.Series) -> int:
    """Get the last non-zero signal (carried-forward stance)."""
    non_zero = signal_series[signal_series != 0].dropna()
    if non_zero.empty:
        return 0
    return int(non_zero.iloc[-1])


def _extract_signal(result_df: pd.DataFrame) -> pd.Series:
    """Extract the signal column from a strategy result, handling different formats."""
    if "signal" not in result_df.columns:
        return pd.Series(0, index=result_df.index)
    sig = result_df["signal"].copy()
    # Handle BB Signal enum (LONG=1, SHORT=-1, EXIT=0, HOLD=None)
    sig = sig.fillna(0)
    # Ensure integer values
    sig = sig.apply(lambda x: int(x) if x in (1, -1, 0, 1.0, -1.0, 0.0) else 0)
    return sig


def _majority_vote(stances: dict[str, int]) -> tuple[int, dict]:
    """
    Majority voting among strategy stances.
    Returns (winning_signal, details_dict).
    """
    buy_count = sum(1 for v in stances.values() if v == 1)
    sell_count = sum(1 for v in stances.values() if v == -1)
    hold_count = sum(1 for v in stances.values() if v == 0)
    total = len(stances)

    if buy_count > sell_count and buy_count > hold_count:
        result = 1
    elif sell_count > buy_count and sell_count > hold_count:
        result = -1
    else:
        result = 0

    details = {
        "buy_votes": buy_count,
        "sell_votes": sell_count,
        "hold_votes": hold_count,
        "total_strategies": total,
        "strategy_stances": stances,
        "result": result,
    }
    return result, details


# =============================================================================
# 1. ADX/DI INDICATOR — 12 strategies
# =============================================================================

ADX_STRATEGIES = [
    ("strategies.di_crossover",       "DICrossoverStrategy",      {}),
    ("strategies.extreme_point_rule", "ExtremePointRuleStrategy",  {}),
    ("strategies.adx_breakout",       "ADXBreakoutStrategy",       {}),
    ("strategies.adx_di_combined",    "ADXDICombinedStrategy",     {}),
    ("strategies.wilders_dmi",        "WildersDMIStrategy",        {}),
    ("strategies.ema_adx_filter",     "EMAAdxFilterStrategy",      {}),
    ("strategies.rsi_adx_regime",     "RSIAdxRegimeStrategy",      {}),
    ("strategies.macd_adx",           "MACDAdxStrategy",           {}),
    ("strategies.bollinger_adx",      "BollingerAdxStrategy",      {}),
    ("strategies.ichimoku_adx",       "IchimokuAdxStrategy",       {}),
    ("strategies.vwap_adx",           "VWAPAdxStrategy",           {}),
    ("strategies.stochastic_adx",     "StochasticAdxStrategy",     {}),
]


def run_adx_indicator(df: pd.DataFrame) -> tuple[int, dict]:
    """Run all ADX/DI strategies and return majority vote."""
    folder = "ADX_DI_Trading_System"
    stances = {}

    for module_path, class_name, params in ADX_STRATEGIES:
        sig = _run_strategy_isolated(folder, module_path, class_name, df,
                                     init_style="params", params=params)
        stances[class_name] = _get_last_stance(sig) if sig is not None else 0

    return _majority_vote(stances)


# =============================================================================
# 2. BOLLINGER BANDS INDICATOR — 12 strategies
# =============================================================================

BB_STRATEGIES = [
    ("strategies.squeeze_breakout", "SqueezeBreakout",  {}),
    ("strategies.band_walk",        "BandWalk",         {}),
    ("strategies.w_bottom_m_top",   "WBottomMTop",      {}),
    ("strategies.mean_reversion",   "MeanReversion",    {}),
    ("strategies.pct_b_pullback",   "PctBPullback",     {}),
    ("strategies.ttm_squeeze",      "TTMSqueeze",       {}),
    ("strategies.double_bb",        "DoubleBB",         {}),
    ("strategies.bb_rsi",           "BBonRSI",          {}),
    ("strategies.bb_macd",          "BBWithMACD",       {}),
    ("strategies.bb_stochastic",    "BBStochastic",     {}),
    ("strategies.multi_timeframe",  "MultiTimeframe",   {}),
    ("strategies.adaptive_bb",      "AdaptiveBB",       {}),
]


def run_bb_indicator(df: pd.DataFrame) -> tuple[int, dict]:
    """Run all Bollinger Band strategies and return majority vote."""
    folder = "Bollinger_Bands_System"
    stances = {}

    for module_path, class_name, params in BB_STRATEGIES:
        sig = _run_strategy_isolated(folder, module_path, class_name, df,
                                     init_style="kwargs", params=params)
        stances[class_name] = _get_last_stance(sig) if sig is not None else 0

    return _majority_vote(stances)


# =============================================================================
# 3. BREADTH INDICATOR — 8 strategies
# =============================================================================

BREADTH_STRATEGIES = [
    ("strategies.adl_divergence",           "ADLDivergenceStrategy",          {}),
    ("strategies.mcclellan_signals",        "McClellanSignalsStrategy",       {}),
    ("strategies.trin_mean_reversion",      "TRINMeanReversionStrategy",     {}),
    ("strategies.zweig_breadth_thrust",     "ZweigBreadthThrustStrategy",    {}),
    ("strategies.pct_above_ma_timing",      "PctAboveMATimingStrategy",      {}),
    ("strategies.sector_breadth_rotation",  "SectorBreadthRotationStrategy", {}),
    ("strategies.breadth_vix_regime",       "BreadthVIXRegimeStrategy",      {}),
    ("strategies.multi_indicator_framework","MultiIndicatorFrameworkStrategy",{}),
]


def build_breadth_df(sensex_df: pd.DataFrame,
                     component_data: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Build a breadth DataFrame from component stocks.
    Computes advancing/declining counts and volume aggregates.
    """
    adv_count = pd.Series(0, index=sensex_df.index, dtype=int)
    dec_count = pd.Series(0, index=sensex_df.index, dtype=int)
    adv_vol = pd.Series(0.0, index=sensex_df.index)
    dec_vol = pd.Series(0.0, index=sensex_df.index)

    for symbol, stock_df in component_data.items():
        if stock_df.empty or "close" not in stock_df.columns:
            continue
        stock_close = stock_df["close"].reindex(sensex_df.index, method="ffill")
        stock_vol = stock_df["volume"].reindex(sensex_df.index, method="ffill").fillna(0) \
            if "volume" in stock_df.columns else pd.Series(1.0, index=sensex_df.index)
        change = stock_close.diff()

        is_adv = change > 0
        is_dec = change < 0
        adv_count += is_adv.astype(int)
        dec_count += is_dec.astype(int)
        adv_vol += stock_vol.where(is_adv, 0.0)
        dec_vol += stock_vol.where(is_dec, 0.0)

    breadth = pd.DataFrame({
        "close": sensex_df["close"],
        "advancing": adv_count,
        "declining": dec_count,
        "adv_volume": adv_vol,
        "dec_volume": dec_vol,
    }, index=sensex_df.index)

    return breadth


def run_breadth_indicator(sensex_df: pd.DataFrame,
                          component_data: dict[str, pd.DataFrame] | None
                          ) -> tuple[int, dict]:
    """Run all Breadth strategies and return majority vote."""
    if not component_data:
        return 0, {"error": "No component data", "result": 0,
                   "buy_votes": 0, "sell_votes": 0, "hold_votes": 0,
                   "total_strategies": 0, "strategy_stances": {}}

    folder = "Breadth_Trading_System"
    breadth_df = build_breadth_df(sensex_df, component_data)
    stances = {}

    for module_path, class_name, params in BREADTH_STRATEGIES:
        sig = _run_strategy_isolated(folder, module_path, class_name, breadth_df,
                                     init_style="params", params=params)
        stances[class_name] = _get_last_stance(sig) if sig is not None else 0

    return _majority_vote(stances)


# =============================================================================
# 4. EMA CROSS INDICATOR — 5 strategies
# =============================================================================

EMA_STRATEGIES = [
    ("strategies.dual_ema",  "DualEMACross",  {}),
    ("strategies.triple_ema","TripleEMACross", {}),
    ("strategies.ribbon",    "EMARibbon",      {}),
    ("strategies.gmma",      "GMMA",           {}),
    ("strategies.hybrid",    "HybridCross",    {}),
]


def run_ema_indicator(df: pd.DataFrame) -> tuple[int, dict]:
    """Run all EMA Cross strategies and return majority vote."""
    folder = "EMA_Cross"
    stances = {}

    for module_path, class_name, params in EMA_STRATEGIES:
        # EMA strategies use .compute() not .generate_signals()
        sig = _run_strategy_isolated(folder, module_path, class_name, df,
                                     init_style="kwargs", params=params,
                                     method="compute")
        stances[class_name] = _get_last_stance(sig) if sig is not None else 0

    return _majority_vote(stances)


# =============================================================================
# 5. RSI INDICATOR — 8 strategies
# =============================================================================

RSI_STRATEGIES = [
    ("strategies.overbought_oversold",  "OverboughtOversoldStrategy",   {}),
    ("strategies.centerline_crossover", "CenterlineCrossoverStrategy",  {}),
    ("strategies.failure_swings",       "FailureSwingsStrategy",        {}),
    ("strategies.regular_divergence",   "RegularDivergenceStrategy",    {}),
    ("strategies.hidden_divergence",    "HiddenDivergenceStrategy",     {}),
    ("strategies.rsi_trendlines",       "RSITrendlinesStrategy",        {}),
    ("strategies.cardwell_range_rules", "CardwellRangeRulesStrategy",   {}),
    ("strategies.rsi_ma_signal",        "RSIMASignalStrategy",          {}),
]


def run_rsi_indicator(df: pd.DataFrame) -> tuple[int, dict]:
    """Run all RSI strategies and return majority vote."""
    folder = "RSI_Trading_System"
    stances = {}

    for module_path, class_name, params in RSI_STRATEGIES:
        sig = _run_strategy_isolated(folder, module_path, class_name, df,
                                     init_style="params", params=params)
        stances[class_name] = _get_last_stance(sig) if sig is not None else 0

    return _majority_vote(stances)


# =============================================================================
# 6. SUPERTREND INDICATOR — 17 strategies
# =============================================================================

ST_STRATEGIES = [
    ("strategies.basic_signals",            "BasicSignals",            {}),
    ("strategies.trailing_stop",            "TrailingStopStrategy",    {}),
    ("strategies.multi_supertrend",         "MultiSupertrend",         {}),
    ("strategies.ema_crossover",            "EMACrossover",            {}),
    ("strategies.rsi_supertrend",           "RSISupertrend",           {}),
    ("strategies.macd_supertrend",          "MACDSupertrend",          {}),
    ("strategies.adx_supertrend",           "ADXSupertrend",           {}),
    ("strategies.volume_supertrend",        "VolumeSupertrend",        {}),
    ("strategies.ema200_filter",            "EMA200Filter",            {}),
    ("strategies.vwap_supertrend",          "VWAPSupertrend",          {}),
    ("strategies.bb_supertrend",            "BBSupertrend",            {}),
    ("strategies.stochastic_supertrend",    "StochasticSupertrend",    {}),
    ("strategies.ichimoku_supertrend",      "IchimokuSupertrend",      {}),
    ("strategies.candlestick_supertrend",   "CandlestickSupertrend",  {}),
    ("strategies.heikin_ashi_supertrend",   "HeikinAshiSupertrend",   {}),
    ("strategies.adaptive_supertrend",      "AdaptiveSupertrend",      {}),
    ("strategies.double_triple_supertrend", "DoubleTripleSupertrend",  {}),
]


def run_supertrend_indicator(df: pd.DataFrame) -> tuple[int, dict]:
    """Run all Supertrend strategies and return majority vote."""
    folder = "Supertrend_Trading_System"
    stances = {}

    for module_path, class_name, params in ST_STRATEGIES:
        sig = _run_strategy_isolated(folder, module_path, class_name, df,
                                     init_style="kwargs", params=params)
        stances[class_name] = _get_last_stance(sig) if sig is not None else 0

    return _majority_vote(stances)


# =============================================================================
# MASTER RUNNER — Run all 6 indicators
# =============================================================================

INDICATOR_NAMES = [
    "ADX_DI",
    "Bollinger_Bands",
    "Breadth",
    "EMA_Cross",
    "RSI",
    "Supertrend",
]


def run_all_indicators(sensex_df: pd.DataFrame,
                       component_data: dict[str, pd.DataFrame] | None = None
                       ) -> dict:
    """
    Run all 6 indicators (each with multiple internal strategies).
    Returns a dict with each indicator's signal, details, and the overall consensus.
    """
    results = {}

    logger.info("Running ADX/DI indicator (12 strategies)...")
    adx_signal, adx_details = run_adx_indicator(sensex_df)
    results["ADX_DI"] = {"signal": adx_signal, "details": adx_details}

    logger.info("Running Bollinger Bands indicator (12 strategies)...")
    bb_signal, bb_details = run_bb_indicator(sensex_df)
    results["Bollinger_Bands"] = {"signal": bb_signal, "details": bb_details}

    logger.info("Running Breadth indicator (8 strategies)...")
    br_signal, br_details = run_breadth_indicator(sensex_df, component_data)
    results["Breadth"] = {"signal": br_signal, "details": br_details}

    logger.info("Running EMA Cross indicator (5 strategies)...")
    ema_signal, ema_details = run_ema_indicator(sensex_df)
    results["EMA_Cross"] = {"signal": ema_signal, "details": ema_details}

    logger.info("Running RSI indicator (8 strategies)...")
    rsi_signal, rsi_details = run_rsi_indicator(sensex_df)
    results["RSI"] = {"signal": rsi_signal, "details": rsi_details}

    logger.info("Running Supertrend indicator (17 strategies)...")
    st_signal, st_details = run_supertrend_indicator(sensex_df)
    results["Supertrend"] = {"signal": st_signal, "details": st_details}

    # Cross-indicator consensus: need >= 4 of 6 to agree
    signals = {name: results[name]["signal"] for name in INDICATOR_NAMES}
    buy_indicators = sum(1 for s in signals.values() if s == 1)
    sell_indicators = sum(1 for s in signals.values() if s == -1)

    REQUIRED_AGREEMENT = 4

    if buy_indicators >= REQUIRED_AGREEMENT:
        consensus = 1
    elif sell_indicators >= REQUIRED_AGREEMENT:
        consensus = -1
    else:
        consensus = 0

    results["_consensus"] = {
        "signal": consensus,
        "buy_indicators": buy_indicators,
        "sell_indicators": sell_indicators,
        "required": REQUIRED_AGREEMENT,
        "indicator_signals": signals,
        "label": {1: "BUY", -1: "SELL", 0: "HOLD"}.get(consensus, "HOLD"),
    }

    return results
