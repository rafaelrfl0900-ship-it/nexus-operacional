from __future__ import annotations

import argparse
import json
import re
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from import_excel import (
    as_number,
    clean_text,
    find_default_workbook,
    infer_sector,
    inspect_workbook,
    normalize_code,
    q,
    read_sheet_rows,
    read_xml,
    rels_for,
    shared_strings,
)


WORKBOOK_MONTH = 5
WORKBOOK_YEAR = 2026

LOSS_TYPES = [
    {"id": "legacy-loss-packaging", "code": "PACKAGING", "name": "Embalagem"},
    {"id": "legacy-loss-box", "code": "BOX", "name": "Caixa"},
    {"id": "legacy-loss-organic", "code": "ORGANIC", "name": "Organico"},
    {"id": "legacy-loss-machine", "code": "MACHINE", "name": "Maquina"},
    {"id": "legacy-loss-weighing", "code": "WEIGHING", "name": "Pesagem"},
    {"id": "legacy-loss-overweight", "code": "OVERWEIGHT", "name": "Sobrepeso"},
    {"id": "legacy-loss-other", "code": "OTHER", "name": "Outros"},
]

BASE_DOWNTIME_REASONS = [
    "AGUARDANDO MASSA",
    "AGUARDANDO EMBALAGEM",
    "AGUARDANDO SILO",
    "TROCA DE ARAME",
    "FALTA DE MATERIA PRIMA",
    "AGUARDANDO MANUTENCAO",
    "SETUP/TROCA DE PRODUTO",
    "LIMPEZA",
    "AGUARDANDO TEMPERATURA",
    "AGUARDANDO CONGELAR",
    "OUTROS",
]


def to_excel_date(value: Any) -> str | None:
    number = as_number(value)
    if number is None:
        return None
    return (datetime(1899, 12, 30) + timedelta(days=int(number))).date().isoformat()


def week_id(week_number: int) -> str:
    return f"legacy-week-{week_number}"


def product_id(code: str) -> str:
    return f"legacy-product-{re.sub(r'[^A-Za-z0-9_-]+', '-', code)}"


def reason_id(name: str) -> str:
    slug = re.sub(r"[^A-Z0-9]+", "-", name.upper()).strip("-").lower()
    return f"legacy-reason-{slug}"


def status_from_entry(real_yield_percent: float, overweight_percent: float, tolerance: float) -> str:
    if overweight_percent > tolerance or real_yield_percent < 0.9:
        return "ATTENTION"
    if real_yield_percent < 0.95:
        return "MEDIUM"
    return "OK"


def status_from_minutes(minutes: float) -> str:
    if minutes >= 60:
        return "CRITICAL"
    if minutes >= 30:
        return "ATTENTION"
    if minutes >= 10:
        return "MEDIUM"
    return "OK"


def normalize_yield(value: Any) -> float:
    number = as_number(value) or 0
    return number / 100 if number > 10 else number


def normalize_percent(value: Any) -> float:
    return as_number(value) or 0


def build_products(report: dict[str, Any]) -> list[dict[str, Any]]:
    rows = report.get("legacyData", {}).get("products", [])
    products = []
    for row in rows:
        code = str(row["code"])
        products.append(
            {
                "id": product_id(code),
                "code": code,
                "name": row["name"],
                "active": bool(row.get("active", True)),
                "defaultSector": {"code": row.get("defaultSector") or infer_sector(row["name"])},
                "weightConfig": {
                    "formula": row.get("formula", "BOX_WEIGHT"),
                    "packageWeightKg": float(row.get("packageWeightKg") or 0),
                    "boxWeightKg": float(row.get("boxWeightKg") or 0),
                    "packagesPerBox": int(row.get("packagesPerBox") or 1),
                    "massWeightKg": float(row.get("massWeightKg") or 0),
                    "targetPackageWeightG": float(row.get("targetPackageWeightG") or 0),
                    "overweightTolerancePercent": float(row.get("overweightTolerancePercent") or 0.02),
                },
            }
        )
    return sorted(products, key=lambda item: (item["defaultSector"]["code"], item["code"]))


def parse_production_entries(
    sheet_name: str,
    sector: str,
    rows: dict[int, dict[int, str | None]],
    product_names: dict[str, str],
    product_tolerance: dict[str, float],
    week_dates: dict[int, list[str]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    current_week: int | None = None
    p1 = sector == "P1"

    for row_number in sorted(rows):
        row = rows[row_number]
        week_number = as_number(row.get(2))
        if week_number is not None and 1 <= int(week_number) <= 12:
            current_week = int(week_number)

        code = normalize_code(row.get(4))
        if not code or code.upper() == "PRODUTO":
            continue

        row_date = to_excel_date(row.get(3))
        if not row_date:
            continue

        produced_kg = as_number(row.get(10 if p1 else 9))
        if produced_kg is None:
            continue

        planned = as_number(row.get(6)) or 0
        realized = as_number(row.get(7)) or 0
        packed_boxes = as_number(row.get(9 if p1 else 8)) or 0
        weighing_loss = as_number(row.get(11 if p1 else 10)) or 0
        generated_rework = as_number(row.get(12 if p1 else 11)) or 0
        expected_kg = as_number(row.get(13 if p1 else 12)) or 0
        real_yield = normalize_yield(row.get(14 if p1 else 13))
        mass_weight = as_number(row.get(15 if p1 else 14)) or 0
        box_weight = as_number(row.get(16 if p1 else 15)) or 0
        target_weight = as_number(row.get(17 if p1 else 16)) or 0
        average_weight = as_number(row.get(18 if p1 else 17)) or 0
        overweight_g = as_number(row.get(19 if p1 else 18)) or 0
        overweight_kg = as_number(row.get(20 if p1 else 19)) or 0
        overweight_percent = normalize_percent(row.get(21 if p1 else 20))
        tolerance = product_tolerance.get(code, 0.02)
        week_number = current_week or max(1, min(5, (date.fromisoformat(row_date).day + 6) // 7))
        week_dates[week_number].append(row_date)

        entries.append(
            {
                "id": f"legacy-production-{sector.lower()}-{row_number}",
                "sourceSheet": sheet_name,
                "sourceRow": row_number,
                "weekId": week_id(week_number),
                "weekNumber": week_number,
                "sector": sector,
                "date": row_date,
                "productId": product_id(code),
                "product": {"code": code, "name": product_names.get(code, f"Produto legado {code}")},
                "productionOrder": clean_text(row.get(5)) or "-",
                "plannedBatches": planned,
                "realizedBatches": realized,
                "packedBoxes": packed_boxes,
                "producedKg": produced_kg,
                "weighingLossKg": weighing_loss,
                "generatedReworkKg": generated_rework,
                "expectedYieldKg": expected_kg,
                "realYieldPercent": real_yield,
                "massWeightKg": mass_weight,
                "boxWeightKg": box_weight,
                "targetPackageWeightG": target_weight,
                "averagePackageWeightG": average_weight,
                "overweightGPerPackage": overweight_g,
                "overweightTotalKg": overweight_kg,
                "overweightPercent": overweight_percent,
                "status": status_from_entry(real_yield, overweight_percent, tolerance),
            }
        )

    return entries


def build_weeks(week_dates: dict[int, list[str]]) -> list[dict[str, Any]]:
    weeks = []
    active_week = max(week_dates) if week_dates else 1
    for number in range(1, 6):
      dates = sorted(set(week_dates.get(number, [])))
      if dates:
          starts_on = dates[0]
          ends_on = dates[-1]
      else:
          first_day = date(WORKBOOK_YEAR, WORKBOOK_MONTH, 1) + timedelta(days=(number - 1) * 7)
          starts_on = first_day.isoformat()
          ends_on = (first_day + timedelta(days=4)).isoformat()
      weeks.append(
          {
              "id": week_id(number),
              "year": WORKBOOK_YEAR,
              "month": WORKBOOK_MONTH,
              "weekNumber": number,
              "label": f"Semana {number}",
              "startsOn": starts_on,
              "endsOn": ends_on,
              "status": "OPEN" if number == active_week else ("CLOSED" if number < active_week else "REVIEW"),
          }
      )
    return weeks


def build_loss_entries(production_entries: list[dict[str, Any]], rows: dict[int, dict[int, str | None]]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for entry in production_entries:
        loss_kg = float(entry.get("weighingLossKg") or 0)
        if loss_kg <= 0:
            continue
        entries.append(
            {
                "id": f"legacy-loss-weighing-{entry['id']}",
                "weekId": entry["weekId"],
                "date": entry["date"],
                "quantityKg": loss_kg,
                "reason": f"Pesagem OP {entry['productionOrder']}",
                "sector": {"code": entry["sector"]},
                "lossType": {"name": "Pesagem"},
            }
        )

    for row_number in sorted(rows):
        row = rows[row_number]
        row_date = to_excel_date(row.get(2))
        if not row_date:
            continue
        machine = clean_text(row.get(3)) or "-"
        week_number = max(1, min(5, (date.fromisoformat(row_date).day + 6) // 7))
        for suffix, quantity, loss_name in [
            ("packaging", as_number(row.get(4)) or 0, "Embalagem"),
            ("box", as_number(row.get(7)) or 0, "Caixa"),
        ]:
            if quantity <= 0:
                continue
            entries.append(
                {
                    "id": f"legacy-loss-{suffix}-{row_number}",
                    "weekId": week_id(week_number),
                    "date": row_date,
                    "quantityKg": quantity,
                    "reason": f"{machine} - controle de perdas",
                    "sector": {"code": "P1"},
                    "lossType": {"name": loss_name},
                }
            )

    return sorted(entries, key=lambda item: (item["date"], item["id"]))


def build_downtime(rows: dict[int, dict[int, str | None]]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    reason_names = set(BASE_DOWNTIME_REASONS)
    for row in rows.values():
        name = clean_text(row.get(19))
        if name and len(name) > 2 and not name.startswith(("LISTA", "Dia", "Motivo")):
            reason_names.add(name.upper().replace("MATÉRIA", "MATERIA").replace("MANUTENÇÃO", "MANUTENCAO"))

    reasons = [{"id": reason_id(name), "name": name.title()} for name in sorted(reason_names)]
    entries: list[dict[str, Any]] = []
    active_date: str | None = None
    day_to_date: dict[str, str] = {}

    for row_number in sorted(rows):
        row = rows[row_number]
        if clean_text(row.get(2)) == "Data:":
            active_date = to_excel_date(rows.get(row_number + 1, {}).get(3))
            continue

        day_name = (clean_text(row.get(1)) or "").lower()
        if active_date and day_name.endswith("feira"):
            day_to_date[day_name] = active_date

        reason = clean_text(row.get(6))
        duration = as_number(row.get(4))
        if not reason or duration is None or duration <= 0 or not day_name.endswith("feira"):
            continue

        row_date = day_to_date.get(day_name) or active_date
        if not row_date:
            continue

        minutes = duration * 24 * 60
        stopped_percent = as_number(row.get(5)) or 0
        entries.append(
            {
                "id": f"legacy-downtime-{row_number}",
                "weekId": week_id(max(1, min(5, (date.fromisoformat(row_date).day + 6) // 7))),
                "date": row_date,
                "stoppedMinutes": minutes,
                "stoppedPercent": stopped_percent,
                "status": status_from_minutes(minutes),
                "sector": {"code": "P1"},
                "reason": {"name": reason.title()},
            }
        )

    return reasons, entries


def build_productivity(production_entries: list[dict[str, Any]]) -> dict[str, Any]:
    by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in production_entries:
        by_date[entry["date"]].append(entry)

    daily = []
    for item_date, rows in sorted(by_date.items()):
        produced = sum(float(row.get("producedKg") or 0) for row in rows)
        yields = [float(row.get("realYieldPercent") or 0) for row in rows if float(row.get("realYieldPercent") or 0) > 0]
        daily.append(
            {
                "date": item_date,
                "producedKg": produced,
                "averageYield": sum(yields) / len(yields) if yields else 0,
            }
        )

    produced_total = sum(row["producedKg"] for row in daily)
    average_yield = sum(row["averageYield"] for row in daily) / len(daily) if daily else 0
    return {
        "producedKg": produced_total,
        "averageYield": average_yield,
        "workedDays": len(daily),
        "averageKgPerDay": produced_total / len(daily) if daily else 0,
        "records": len(production_entries),
        "daily": daily,
    }


def build_overweight(production_entries: list[dict[str, Any]], product_tolerance: dict[str, float]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for entry in production_entries:
        code = entry["product"]["code"]
        current = grouped.setdefault(
            code,
            {
                "productId": product_id(code),
                "code": code,
                "product": entry["product"]["name"],
                "sector": entry["sector"],
                "overweightKg": 0.0,
                "producedKg": 0.0,
                "tolerancePercent": product_tolerance.get(code, 0.02),
            },
        )
        current["overweightKg"] += float(entry.get("overweightTotalKg") or 0)
        current["producedKg"] += float(entry.get("producedKg") or 0)

    ranking = []
    for row in grouped.values():
        produced = row["producedKg"]
        percent = row["overweightKg"] / produced if produced else 0
        ranking.append({**row, "overweightPercent": percent, "status": "ATTENTION" if percent > row["tolerancePercent"] else "OK"})
    return sorted(ranking, key=lambda item: item["overweightKg"], reverse=True)


def build_web_data(path: Path) -> dict[str, Any]:
    report = inspect_workbook(path)
    products = build_products(report)
    product_names = {product["code"]: product["name"] for product in products}
    product_tolerance = {product["code"]: float(product["weightConfig"]["overweightTolerancePercent"]) for product in products}
    week_dates: dict[int, list[str]] = defaultdict(list)

    with zipfile.ZipFile(path) as zf:
        shared = shared_strings(zf)
        workbook = read_xml(zf, "xl/workbook.xml")
        workbook_rels = rels_for(zf, "xl/workbook.xml")
        sheet_paths = {sheet.attrib["name"]: workbook_rels[sheet.attrib[q("r", "id")]] for sheet in workbook.find(q("m", "sheets"))}

        sheet_rows = {name: read_sheet_rows(zf, shared, sheet_paths[name]) for name in sheet_paths}

    production_entries = [
        *parse_production_entries("Plan x Real (P1)", "P1", sheet_rows["Plan x Real (P1)"], product_names, product_tolerance, week_dates),
        *parse_production_entries("Plan x Real (P2)", "P2", sheet_rows["Plan x Real (P2)"], product_names, product_tolerance, week_dates),
    ]
    weeks = build_weeks(week_dates)
    loss_entries = build_loss_entries(production_entries, sheet_rows["CONTROLE DE PERDAS"])
    downtime_reasons, downtime_entries = build_downtime(sheet_rows["PARADAS"])
    productivity = build_productivity(production_entries)
    overweight = build_overweight(production_entries, product_tolerance)

    total_produced = productivity["producedKg"]
    total_losses = sum(float(entry["quantityKg"]) for entry in loss_entries)
    total_overweight = sum(float(entry.get("overweightTotalKg") or 0) for entry in production_entries)
    total_downtime = sum(float(entry["stoppedMinutes"]) for entry in downtime_entries)

    return {
        "source": path.name,
        "sheetCount": report["sheetCount"],
        "formulaCount": report["formulaCount"],
        "errors": report["errors"],
        "importErrors": report.get("legacyData", {}).get("importErrors", []),
        "products": products,
        "weeks": weeks,
        "lossTypes": LOSS_TYPES,
        "downtimeReasons": downtime_reasons,
        "productionEntries": sorted(production_entries, key=lambda item: (item["date"], item["sector"], item["sourceRow"])),
        "lossEntries": loss_entries,
        "downtimeEntries": downtime_entries,
        "overweightRanking": overweight,
        "productivitySummary": productivity,
        "dashboard": {
            "producedKg": total_produced,
            "lossesKg": total_losses,
            "overweightKg": total_overweight,
            "overweightPercent": total_overweight / total_produced if total_produced else 0,
            "averageYield": productivity["averageYield"],
            "downtimeMinutes": total_downtime,
        },
        "sheetSummary": report["sheets"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Export legacy Excel data for the static web fallback.")
    parser.add_argument("--file", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=Path("apps/web/lib/legacy-data.json"))
    args = parser.parse_args()

    path = args.file or find_default_workbook()
    data = build_web_data(path)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, ensure_ascii=True, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "source": data["source"],
                "products": len(data["products"]),
                "weeks": len(data["weeks"]),
                "productionEntries": len(data["productionEntries"]),
                "lossEntries": len(data["lossEntries"]),
                "downtimeEntries": len(data["downtimeEntries"]),
                "importErrors": len(data["importErrors"]),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
