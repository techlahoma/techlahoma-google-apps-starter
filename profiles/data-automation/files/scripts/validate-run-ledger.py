#!/usr/bin/env python3
"""Validate the dependency-free core contract of a run-ledger JSON file."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


SHA256 = re.compile(r"^[0-9a-f]{64}$")
STATUSES = {"running", "succeeded", "failed", "suppressed", "no-op"}
PUBLICATION_STATUSES = {
    "not-attempted",
    "published",
    "rejected",
    "preserved-last-known-good",
}


def timestamp(value: Any, field: str, errors: list[str]) -> None:
    if not isinstance(value, str):
        errors.append(f"{field} must be an ISO-8601 string")
        return
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        errors.append(f"{field} is not a valid ISO-8601 timestamp")


def validate(record: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(record, dict):
        return ["ledger must be a JSON object"]

    required = {
        "schema_version",
        "run_id",
        "job",
        "status",
        "started_at",
        "idempotency_key",
        "inputs",
        "publication",
    }
    missing = sorted(required - record.keys())
    if missing:
        errors.append(f"missing required fields: {', '.join(missing)}")
    if record.get("schema_version") != 1:
        errors.append("schema_version must equal 1")
    for field in ("run_id", "job", "idempotency_key"):
        if not isinstance(record.get(field), str) or not record.get(field):
            errors.append(f"{field} must be a non-empty string")
    if record.get("status") not in STATUSES:
        errors.append("status is not recognized")
    timestamp(record.get("started_at"), "started_at", errors)

    inputs = record.get("inputs")
    if not isinstance(inputs, list):
        errors.append("inputs must be an array")
    else:
        for index, item in enumerate(inputs):
            if not isinstance(item, dict):
                errors.append(f"inputs[{index}] must be an object")
                continue
            if not isinstance(item.get("source"), str) or not item.get("source"):
                errors.append(f"inputs[{index}].source must be non-empty")
            timestamp(item.get("retrieved_at"), f"inputs[{index}].retrieved_at", errors)
            digest = item.get("content_sha256")
            if not isinstance(digest, str) or not SHA256.fullmatch(digest):
                errors.append(f"inputs[{index}].content_sha256 must be lowercase SHA-256")

    publication = record.get("publication")
    if not isinstance(publication, dict):
        errors.append("publication must be an object")
    elif publication.get("status") not in PUBLICATION_STATUSES:
        errors.append("publication.status is not recognized")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("ledger", type=Path)
    args = parser.parse_args()
    try:
        record = json.loads(args.ledger.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    errors = validate(record)
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    if errors:
        return 1
    print(f"valid run ledger: {args.ledger}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
