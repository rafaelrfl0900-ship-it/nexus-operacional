from __future__ import annotations

import argparse
import json
from pathlib import Path


def build_import_plan(report: dict) -> dict:
    sheet_names = [sheet["name"] for sheet in report.get("sheets", [])]
    legacy_data = report.get("legacyData", {})
    return {
        "products": {
            "sourceSheets": ["Pacotes-caixas", "Banco de Dados Pesagen"],
            "normalizedRows": legacy_data.get("productCount", 0),
            "duplicateCodes": {
                "products": legacy_data.get("duplicateProductCodes", []),
                "weights": legacy_data.get("duplicateWeightCodes", []),
            },
            "importErrors": legacy_data.get("importErrorCount", 0),
        },
        "production": [name for name in sheet_names if name.startswith("Plan x Real")],
        "losses": ["CONTROLE DE PERDAS", "Perdas - dosagem", "BANCO DE DADOS SOBRE."],
        "downtime": ["PARADAS"],
        "history": ["ARQUIVO MORTO"],
        "rules": {
            "neverImportFormulaErrorsAsNumbers": True,
            "softDeleteOnly": True,
            "registerImportErrors": True,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a migration plan for legacy Excel data.")
    parser.add_argument("--report", type=Path, required=False)
    args = parser.parse_args()
    if args.report and args.report.exists():
        report = json.loads(args.report.read_text(encoding="utf-8"))
    else:
        report = {"sheets": []}
    print(json.dumps(build_import_plan(report), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
