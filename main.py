"""
Main entry point for the Combined Indicator Paper Trading Bot v2.0.

Runs 62 strategies across 6 indicator systems with majority voting.
4 of 6 indicators must agree for a trade. Trades logged to CSV.

Usage:
    cd q1
    python main.py                                        # Live paper trading
    python main.py --mode backtest                        # Backtest last 5 years
    python main.py --mode backtest --from 2022-01-01 --to 2025-01-01
    python main.py --mode backtest --interval 5minute     # Intraday backtest (shorter range)
"""
import argparse
import logging
import sys
from datetime import datetime, timedelta

from auth import generate_access_token
from paper_trader import PaperTradingBot

# -- Logging setup -----------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("paper_trading.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="Sensex Paper Trading Bot v2.0 - 62 Strategies, 6 Indicators, 4/6 Consensus"
    )
    parser.add_argument(
        "--mode", choices=["paper", "backtest"], default="paper",
        help="'paper' = live paper trading, 'backtest' = historical backtest"
    )
    parser.add_argument(
        "--from", dest="from_date", type=str, default=None,
        help="Backtest start date (YYYY-MM-DD). Default: 5 years ago"
    )
    parser.add_argument(
        "--to", dest="to_date", type=str, default=None,
        help="Backtest end date (YYYY-MM-DD). Default: today"
    )
    parser.add_argument(
        "--interval", type=str, default="5minute",
        help="Candle interval for backtest: day (default), 5minute, 15minute, 60minute"
    )
    args = parser.parse_args()

    # -- Authenticate ---------------------------------------------------------
    print("\nAuthenticating with Kite Connect...")
    try:
        kite, access_token = generate_access_token()
        print(f"Authentication successful! Token: {access_token[:8]}...\n")
    except Exception as e:
        logger.error(f"Authentication failed: {e}", exc_info=True)
        print(f"\n[ERROR] Authentication failed: {e}")
        print("Make sure your API credentials in api_key.txt are correct.")
        sys.exit(1)

    # -- Create and run bot ---------------------------------------------------
    bot = PaperTradingBot(kite)

    if args.mode == "backtest":
        to_date = (datetime.strptime(args.to_date, "%Y-%m-%d")
                   if args.to_date else datetime.now())
        from_date = (datetime.strptime(args.from_date, "%Y-%m-%d")
                     if args.from_date else to_date - timedelta(days=5*365))
        bot.run_backtest(from_date, to_date, args.interval)
    else:
        try:
            bot.run()
        except KeyboardInterrupt:
            bot.stop()


if __name__ == "__main__":
    main()
