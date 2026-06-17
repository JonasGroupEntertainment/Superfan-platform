#!/usr/bin/env python3
"""Add /api/cron/fraud-scan to FE vercel.json crons."""
from __future__ import annotations
import json
import sys
from pathlib import Path

VERCEL_JSON = Path.home() / "fan-engage" / "frontend" / "vercel.json"
CRON_PATH = "/api/cron/fraud-scan"
CRON_SCHEDULE = "0 3 * * *"  # 03:00 UTC daily


def main() -> int:
    if not VERCEL_JSON.exists():
        print(f"  ! {VERCEL_JSON} not found")
        return 1
    with VERCEL_JSON.open() as f:
        data = json.load(f)
    crons = data.setdefault("crons", [])
    existing = next(
        (c for c in crons if isinstance(c, dict) and c.get("path") == CRON_PATH),
        None,
    )
    if existing:
        if existing.get("schedule") != CRON_SCHEDULE:
            existing["schedule"] = CRON_SCHEDULE
            print(f"  · updated {CRON_PATH}")
        else:
            print(f"  · {CRON_PATH} already present")
    else:
        crons.append({"path": CRON_PATH, "schedule": CRON_SCHEDULE})
        print(f"  + added {CRON_PATH} @ '{CRON_SCHEDULE}'")
    with VERCEL_JSON.open("w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
