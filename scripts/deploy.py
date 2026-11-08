"""Deploy contracts/napkin.py to GenLayer Studionet.

Usage:
    python scripts/deploy.py

Reads DEPLOYER_PRIVATE_KEY and NEXT_PUBLIC_GENLAYER_RPC_URL from .env,
deploys contracts/napkin.py, waits for FINALIZED, writes the new address
into NEXT_PUBLIC_CONTRACT_ADDRESS in .env (and .env.local when present).
"""
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

try:
    from genlayer_py import create_client
except ImportError:
    from genlayer_py.client.client import create_client

from genlayer_py.chains import studionet
from genlayer_py.accounts import create_account

try:
    from genlayer_py.types.transactions import TransactionStatus as Status
    FINALIZED_ATTR = "FINALIZED"
except ImportError:
    from genlayer_py import TransactionStatus as Status
    FINALIZED_ATTR = "FINALIZED"


def find_contract_address(obj):
    # Only trust an explicit "contract_address" field. Matching any 40-hex string
    # also catches from_address/to_address and returns the deployer by mistake.
    if isinstance(obj, dict):
        value = obj.get("contract_address")
        if isinstance(value, str) and re.match(r"^0x[0-9a-fA-F]{40}$", value):
            return value
        for value in obj.values():
            found = find_contract_address(value)
            if found:
                return found
    elif isinstance(obj, list):
        for value in obj:
            found = find_contract_address(value)
            if found:
                return found
    return None


def update_env_file(path: Path, key: str, value: str) -> None:
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    line = f"{key}={value}"
    if pattern.search(text):
        text = pattern.sub(line, text)
    else:
        text = text.rstrip("\r\n") + "\n" + line + "\n"
    path.write_text(text, encoding="utf-8")


def main() -> int:
    private_key = (os.environ.get("DEPLOYER_PRIVATE_KEY") or "").strip()
    if not private_key:
        print("ERROR: DEPLOYER_PRIVATE_KEY is not set in .env — add your deployment wallet key first.")
        return 1
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key
    address = (os.environ.get("DEPLOYER_ADDRESS") or "").strip()
    endpoint = (os.environ.get("NEXT_PUBLIC_GENLAYER_RPC_URL") or "https://studio.genlayer.com/api").strip()

    account = create_account(private_key)
    print(f"Deployer: {account.address}" + (f" (matches DEPLOYER_ADDRESS: {address})" if address else ""))

    client = create_client(chain=studionet, endpoint=endpoint, account=account)
    print(f"Network: studionet via {endpoint}")

    code_path = ROOT / "contracts" / "napkin.py"
    code = code_path.read_bytes()
    print(f"Deploying {code_path} ({len(code)} bytes)...")

    tx_hash = client.deploy_contract(code=code, account=account)
    print(f"Deploy tx: {tx_hash}")

    status_attr = getattr(Status, FINALIZED_ATTR, None) or getattr(Status, "FINALIZED")
    receipt = client.wait_for_transaction_receipt(tx_hash, status=status_attr, retries=90, interval=4000)
    print("Deploy transaction finalized.")
    print(json.dumps(receipt, default=str, indent=2)[:4000])

    contract_address = find_contract_address(receipt)
    if not contract_address:
        print("WARNING: could not auto-extract the contract address from the receipt.")
        print("Look it up in the receipt above or the Studio explorer, then set")
        print("NEXT_PUBLIC_CONTRACT_ADDRESS in .env manually.")
        return 0

    update_env_file(ROOT / ".env", "NEXT_PUBLIC_CONTRACT_ADDRESS", contract_address)
    update_env_file(ROOT / ".env.local", "NEXT_PUBLIC_CONTRACT_ADDRESS", contract_address)
    print(f"Contract address: {contract_address}")
    print("Written to NEXT_PUBLIC_CONTRACT_ADDRESS in .env")
    return 0


if __name__ == "__main__":
    sys.exit(main())
