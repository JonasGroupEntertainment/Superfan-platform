#!/usr/bin/env python3
"""Add /api/cron/alt-text-backfill to FE vercel.json crons."""

from __future__ import annotations
import json
import sys
from pathlib import Path

VERCEL_JSON = Path.home() / "fan-engage" / "frontend" / "vercel.json"
CRON_PATH = "/api/cron/alt-text-backfill"
CRON_SCHEDULE = "*/15 * * * *"


def main() -> int:
    if not VERCEL_JSON.exists():
        print(f"  ! {VERCEL_JSON} does not exist; skipping")
        return 1

    with VERCEL_JSON.open() as f:
        data = json.load(f)

    crons = data.setdefault("crons", [])
    if not isinstance(crons, list):
        print(f"  ! crons key is not a list; aborting")
        return 1

    existing = next(
        (c for c in crons if isinstance(c, dict) and c.get("path") == CRON_PATH),
        None,
    )
    if existing is not None:
        if existing.get("schedule") != CRON_SCHEDULE:
            existing["schedule"] = CRON_SCHEDULE
            print(f"  · updated schedule for {CRON_PATH}")
        else:
            print(f"  · {CRON_PATH} already present; nothing to do")
    else:
        crons.append({"path": CRON_PATH, "schedule": CRON_SCHEDULE})
        print(f"  + added {CRON_PATH} @ '{CRON_SCHEDULE}'")

    with VERCEL_JSON.open("w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
