"""Start only the ML service in Colab and publish it through ngrok."""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen


def wait_until_ready(port: int, timeout_seconds: int = 120) -> None:
    deadline = time.monotonic() + timeout_seconds
    health_url = f"http://127.0.0.1:{port}/health"
    while time.monotonic() < deadline:
        try:
            with urlopen(health_url, timeout=2) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(1)
    raise RuntimeError(f"ML service did not become ready at {health_url}")


def setup_and_run() -> None:
    from pyngrok import ngrok

    colab_dir = Path(__file__).resolve().parent
    port = int(os.getenv("COLAB_ML_PORT", "8001"))
    token = os.getenv("NGROK_TOKEN", "").strip()
    if token:
        ngrok.set_auth_token(token)

    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "ml_server:app",
            "--app-dir",
            str(colab_dir),
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "info",
        ]
    )

    try:
        wait_until_ready(port)
        public_url = ngrok.connect(port, proto="http").public_url.rstrip("/")
        print("\nJungle Market Colab ML service is ready")
        print(f"COLAB_ML_URL={public_url}")
        print(f"Health: {public_url}/health")
        print("Copy COLAB_ML_URL into the local jungle-market/.env file.\n")
        while process.poll() is None:
            time.sleep(10)
    finally:
        process.terminate()
        ngrok.kill()


if __name__ == "__main__":
    setup_and_run()
