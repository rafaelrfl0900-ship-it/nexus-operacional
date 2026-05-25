from __future__ import annotations

import argparse
import datetime as dt
import json
import math
from pathlib import Path
from typing import Any

ERROR_VALUES = {"#N/A", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#NULL!"}


def normalize_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if math.isfinite(float(value)):
            return float(value)
        return None
    text = str(value).strip().replace(".", "").replace(",", ".") if "," in str(value) else str(value).strip()
    if text in ERROR_VALUES or text == "":
        return None
    try:
        parsed = float(text)
    except ValueError:
        return None
    return parsed if math.isfinite(parsed) else None


def excel_serial_to_date(value: Any) -> str | None:
    number = normalize_number(value)
    if number is None:
        return None
    base = dt.datetime(1899, 12, 30)
    return (base + dt.timedelta(days=number)).date().isoformat()


def clean_cell(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        text = " ".join(value.strip().split())
        if text in ERROR_VALUES or text == "":
            return None
        return text
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean raw Excel-derived JSON rows without breaking on invalid cells.")
    parser.add_argument("--input", type=Path, required=False)
    parser.add_argument("--output", type=Path, required=False)
    args = parser.parse_args()

    if not args.input:
        print(json.dumps({"status": "ready", "message": "Use --input raw.json --output clean.json"}, indent=2))
        return

    data = json.loads(args.input.read_text(encoding="utf-8"))
    cleaned = [{key: clean_cell(value) for key, value in row.items()} for row in data]
    if args.output:
        args.output.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        print(json.dumps(cleaned, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
