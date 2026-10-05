"""
Carga todos los resúmenes de tarjeta de notebooks/ y genera data/transactions.csv
con features listos para entrenar Isolation Forest.

Uso:
    .venv\\Scripts\\python.exe src\\preprocess.py
"""

import re
from pathlib import Path

import numpy as np
import pandas as pd

NOTEBOOKS_DIR = Path(__file__).parent.parent / "notebooks"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "transactions.csv"

# Patrones de filas que no son compras (pagos, impuestos, comisiones bancarias)
NON_PURCHASE_RE = re.compile(
    r"^(SU PAGO EN|CR\.RG|CR IVA|DB IVA|DB\.RG|IIBB PERCEP|IVA RG 4240|"
    r"COMISION CTA PWORLD|DEV COMISION|INTERESES FINANCIACION)",
    re.IGNORECASE,
)

# Prefijos de intermediarios que no aportan info del comercio real
STRIP_PREFIXES_RE = re.compile(
    r"^(MERPAGO\*|PAYU\*AR\*|DLO\*|PEDIDOSYA\*|WL \*|PVS\*|PROPINA\*)",
    re.IGNORECASE,
)

# Sufijo con ID de transacción y monto en descripción (ej. "P1j4VeeA USD 19,99")
STRIP_SUFFIX_RE = re.compile(r"\s+[A-Za-z0-9]+\s+USD\s+[\d,\.]+$", re.IGNORECASE)


def normalize_merchant(desc: str) -> str:
    desc = STRIP_PREFIXES_RE.sub("", desc)
    desc = STRIP_SUFFIX_RE.sub("", desc)
    # "Spotify USD 3,95" → "Spotify"
    desc = re.sub(r"\s+USD\s+[\d,\.]+$", "", desc, flags=re.IGNORECASE)
    # Números de cuenta en servicios como CLARO, ABL, etc.
    desc = re.sub(r"\s+\d{6,}$", "", desc)
    return desc.strip().upper()


def detect_currency(row) -> str:
    """Algunos cargos en USD vienen con moneda=ARS en el export del banco."""
    if row["moneda"] == "USD":
        return "USD"
    if re.search(r"\bUSD\b", row["descripcion"], re.IGNORECASE):
        return "USD"
    return "ARS"


def load_all() -> pd.DataFrame:
    dfs = []
    for csv_path in sorted(NOTEBOOKS_DIR.glob("resumen_tarjeta_cierre_*.csv")):
        # Ignorar archivos versionados (_v1, _v2) si quedaron
        if re.search(r"_v\d+\.csv$", csv_path.name):
            continue
        df = pd.read_csv(csv_path)
        df["archivo"] = csv_path.name
        cierre_str = csv_path.stem.replace("resumen_tarjeta_cierre_", "")
        df["cierre"] = pd.to_datetime(cierre_str)
        dfs.append(df)
    result = pd.concat(dfs, ignore_index=True)
    print(f"CSVs cargados: {len(dfs)} archivos, {len(result)} filas totales")
    return result


def preprocess() -> pd.DataFrame:
    df = load_all()

    df["fecha"] = pd.to_datetime(df["fecha"])

    # Filtrar filas que no son compras
    mask_non_purchase = df["descripcion"].apply(lambda d: bool(NON_PURCHASE_RE.match(d)))
    df = df[~mask_non_purchase].copy()

    # Mantener solo montos positivos (descartar pagos, créditos, bonificaciones)
    df = df[df["monto"] > 0].copy()

    df["moneda_real"] = df.apply(detect_currency, axis=1)
    df["comercio"] = df["descripcion"].apply(normalize_merchant)
    df["dia_semana"] = df["fecha"].dt.dayofweek
    df["mes"] = df["fecha"].dt.month

    # Estadísticas históricas por comercio + moneda
    hist = (
        df.groupby(["comercio", "moneda_real"])["monto"]
        .agg(mediana_hist="median", std_hist="std", n_hist="count")
        .reset_index()
    )
    df = df.merge(hist, on=["comercio", "moneda_real"], how="left")

    # Ratio vs. mediana histórica (principal feature para aumento_precio y monto_atipico)
    df["ratio_mediana"] = df["monto"] / df["mediana_hist"]

    # Z-score (solo fiable con al menos 3 apariciones)
    df["zscore_hist"] = np.where(
        (df["std_hist"] > 0) & (df["n_hist"] >= 3),
        (df["monto"] - df["mediana_hist"]) / df["std_hist"],
        0.0,
    )

    # Feature de duplicado: mismo comercio + monto + fecha exacta
    df["es_duplicado"] = df.duplicated(
        subset=["comercio", "monto", "fecha"], keep=False
    ).astype(int)

    # Log-monto para el modelo (reduce el efecto de escala ARS vs USD)
    df["log_monto"] = np.log1p(df["monto"])

    df = df.reset_index(drop=True)
    return df


def main():
    df = preprocess()
    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nGuardado: {OUTPUT_PATH}  ({len(df)} filas)")

    print("\n--- Muestra de features ---")
    cols = ["archivo", "fecha", "comercio", "monto", "moneda_real",
            "ratio_mediana", "zscore_hist", "es_duplicado"]
    print(df[cols].head(10).to_string(index=False))

    print("\n--- Verificación contra ground truth ---")
    labels = pd.read_csv(Path(__file__).parent.parent / "data" / "eval_labels.csv")
    for _, row in labels.iterrows():
        match = df[
            (df["archivo"] == row["archivo"]) &
            (df["monto"] == row["monto"])
        ]
        if match.empty:
            print(f"  NO ENCONTRADO: {row['archivo']} monto={row['monto']}")
        else:
            r = match.iloc[0]
            print(
                f"  [{row['tipo_anomalia']}] {r['comercio']}  "
                f"monto={r['monto']}  ratio={r['ratio_mediana']:.2f}  "
                f"z={r['zscore_hist']:.2f}  dup={r['es_duplicado']}"
            )


if __name__ == "__main__":
    main()
