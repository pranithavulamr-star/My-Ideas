"""
Automated Kite Connect authentication using TOTP.
Handles the full login flow: credentials -> TOTP -> request_token -> access_token.
"""
import logging
import pyotp
import requests
from kiteconnect import KiteConnect
from config import (
    KITE_API_KEY, KITE_API_SECRET,
    KITE_USER_ID, KITE_PASSWORD, KITE_TOTP_SECRET,
)

logger = logging.getLogger(__name__)

LOGIN_URL = "https://kite.zerodha.com/api/login"
TWOFA_URL = "https://kite.zerodha.com/api/twofa"


def generate_access_token() -> tuple[KiteConnect, str]:
    """
    Fully automated Kite login:
      1. POST user_id + password -> request_id
      2. Generate TOTP from secret
      3. POST request_id + totp -> redirect with request_token
      4. Generate session -> access_token
    Returns (kite_instance, access_token).
    """
    kite = KiteConnect(api_key=KITE_API_KEY)

    session = requests.Session()

    # Step 1: Login with credentials
    logger.info("Step 1: Logging in with credentials...")
    login_resp = session.post(LOGIN_URL, data={
        "user_id": KITE_USER_ID,
        "password": KITE_PASSWORD,
    })
    login_resp.raise_for_status()
    login_data = login_resp.json()

    if login_data.get("status") != "success":
        raise RuntimeError(f"Login failed: {login_data}")

    request_id = login_data["data"]["request_id"]
    logger.info(f"Login successful, request_id: {request_id}")

    # Step 2: Generate TOTP
    totp = pyotp.TOTP(KITE_TOTP_SECRET)
    totp_value = totp.now()
    logger.info("Step 2: Generated TOTP")

    # Step 3: Submit 2FA with TOTP
    logger.info("Step 3: Submitting 2FA...")
    twofa_resp = session.post(TWOFA_URL, data={
        "user_id": KITE_USER_ID,
        "request_id": request_id,
        "twofa_value": totp_value,
        "twofa_type": "totp",
    })
    twofa_resp.raise_for_status()
    twofa_data = twofa_resp.json()

    if twofa_data.get("status") != "success":
        raise RuntimeError(f"2FA failed: {twofa_data}")

    logger.info("2FA successful")

    # Step 4: Get request_token by following the redirect chain
    # Flow: login_url -> /connect/finish?sess_id=... -> redirect_url?request_token=...
    logger.info("Step 4: Fetching request_token...")
    from urllib.parse import urlparse, parse_qs

    # Follow redirects manually to catch request_token at any hop
    url = kite.login_url()
    request_token = None

    for _ in range(10):  # max 10 redirects
        resp = session.get(url, allow_redirects=False)
        # Check current URL params
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        if "request_token" in qs:
            request_token = qs["request_token"][0]
            break

        if resp.status_code in (301, 302, 303, 307, 308):
            url = resp.headers.get("Location", "")
            # Check the redirect target for request_token
            parsed = urlparse(url)
            qs = parse_qs(parsed.query)
            if "request_token" in qs:
                request_token = qs["request_token"][0]
                break
        else:
            # Check the final URL after following
            parsed = urlparse(resp.url)
            qs = parse_qs(parsed.query)
            if "request_token" in qs:
                request_token = qs["request_token"][0]
            break

    if not request_token:
        raise RuntimeError(
            f"Could not extract request_token. Last URL: {url}"
        )

    logger.info(f"Got request_token: {request_token[:8]}...")

    # Step 5: Generate session (exchange request_token for access_token)
    logger.info("Step 5: Generating session...")
    session_data = kite.generate_session(request_token, api_secret=KITE_API_SECRET)
    access_token = session_data["access_token"]
    kite.set_access_token(access_token)

    logger.info(f"Access token generated successfully: {access_token[:8]}...")
    return kite, access_token
