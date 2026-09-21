"""Unifica los resumenes de tarjeta (notebooks/resumen_tarjeta_cierre_*.csv) en un
unico dataset de features para el modelo de deteccion de anomalias.

Uso: desde la raiz del repo -> .venv\\Scripts\\python.exe src\\preprocess.py
Genera data/dataset_features.csv.
"""

import re
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
NOTEBOOKS_DIR = REPO_ROOT / "notebooks"
OUTPUT_PATH = REPO_ROOT / "data" / "dataset_features.csv"

# Grupo minimo de transacciones para confiar en las estadisticas del comercio;
# por debajo de eso se usa la categoria como respaldo.
MIN_TRANSACCIONES_COMERCIO = 3

PREFIJOS_PROCESADOR = [
    r"^MERPAGO\*",
    r"^DLO\*",
    r"^PAYU\*AR\*",
    r"^WL \*",
    r"^GOOGLE \*",
    r"^PROPINA\*",
]

# Reglas de categorizacion por palabra clave sobre el comercio ya normalizado.
# Se evaluan en orden; la primera que matchea gana.
REGLAS_CATEGORIA = [
    ("delivery", r"RAPPI|PEDIDOSYA"),
    ("streaming_suscripciones", r"SPOTIFY|NETFLIX|GOOGLE|STEAM|YOUTUBE|HOSTINGER"),
    ("supermercado", r"COTO|JUMBO|CARREFOUR|DIA TIENDA|SUPERDIA|MARKET PALERMO|FARMACITY"),
    ("comida_rapida_bares", r"BURGER KING|MCDONALDS|KANSAS|SBUX|ACAI BRASIL|BULLER|JAY|EL FARO"),
    ("transporte", r"SUBE|UBER"),
    ("servicios_hogar", r"METROGAS|EDENOR|AYSA|ABL |IPLAN|CLARO"),
    ("impuestos_banco", r"^SU PAGO|^CR\.|^DB\.|^DB IVA|^CR IVA|IIBB PERCEP|IVA RG|COMISION CTA|DEV COMISION|FUND UNIV"),
]


def normalizar_comercio(descripcion: str) -> str:
    """Colapsa variantes del mismo comercio (prefijos de procesador, numeros de
    sucursal/tarjeta, montos embebidos) a un nombre canonico para poder agrupar
    el historial de cada comercio."""
    nombre = descripcion.upper().strip()
    for prefijo in PREFIJOS_PROCESADOR:
        nombre = re.sub(prefijo, "", nombre)
    # Quita montos/códigos embebidos entre comillas, ej: 'USD 5,50', 'P1j4VeeA'
    nombre = re.sub(r"\bUSD\s*[\d.,]+\b", "", nombre)
    nombre = re.sub(r"[A-Z0-9]{8,}", "", nombre)
    # Quita numeros de sucursal/tramite al final (ej: 'COTO SUCURSAL 24' -> 'COTO SUCURSAL')
    nombre = re.sub(r"\s+\d+[\d.,%()\- ]*$", "", nombre)
    nombre = re.sub(r"\s+", " ", nombre).strip()
    return nombre or descripcion.upper().strip()


def categorizar(comercio: str) -> str:
    for categoria, patron in REGLAS_CATEGORIA:
        if re.search(patron, comercio):
            return categoria
    return "otros"


def cargar_resumenes() -> pd.DataFrame:
    archivos = sorted(NOTEBOOKS_DIR.glob("resumen_tarjeta_cierre_*.csv"))
    dfs = []
    for archivo in archivos:
        df = pd.read_csv(archivo)
        df["archivo"] = archivo.name
        dfs.append(df)
    return pd.concat(dfs, ignore_index=True)


def construir_features(df: pd.DataFrame) -> pd.DataFrame:
    # Se descartan pagos, devoluciones, bonificaciones y ajustes (monto <= 0):
    # no son cargos y no tiene sentido evaluarlos como "compra anomala", ademas
    # de que mezclarlos con los cargos reales distorsiona las medias/ratios por
    # comercio-categoria.
    df = df[df["monto"] > 0].copy()
    df["fecha"] = pd.to_datetime(df["fecha"])
    df["comercio"] = df["descripcion"].map(normalizar_comercio)
    df["categoria"] = df["comercio"].map(categorizar)
    df["dia_semana"] = df["fecha"].dt.dayofweek
    df["dia_mes"] = df["fecha"].dt.day
    df["mes"] = df["fecha"].dt.month

    # Estadisticas historicas por comercio+moneda; si el comercio no tiene
    # suficientes transacciones para ser representativo, se cae a categoria+moneda.
    stats_comercio = df.groupby(["comercio", "moneda"])["monto"].agg(["mean", "std", "count"])
    stats_categoria = df.groupby(["categoria", "moneda"])["monto"].agg(["mean", "std", "count"])

    claves_comercio = list(zip(df["comercio"], df["moneda"]))
    claves_categoria = list(zip(df["categoria"], df["moneda"]))

    n_hist_comercio = stats_comercio["count"].reindex(claves_comercio).to_numpy()
    usa_categoria = n_hist_comercio < MIN_TRANSACCIONES_COMERCIO

    media = np.where(
        usa_categoria,
        stats_categoria["mean"].reindex(claves_categoria).to_numpy(),
        stats_comercio["mean"].reindex(claves_comercio).to_numpy(),
    )
    desvio = np.where(
        usa_categoria,
        stats_categoria["std"].reindex(claves_categoria).to_numpy(),
        stats_comercio["std"].reindex(claves_comercio).to_numpy(),
    )
    desvio = np.nan_to_num(desvio, nan=0.0)

    df["grupo_referencia"] = np.where(usa_categoria, "categoria", "comercio")
    df["monto_medio_hist"] = media
    df["monto_ratio_hist"] = df["monto"] / media.clip(min=1e-9)
    # z-score con piso para evitar division por cero cuando el desvio historico es 0
    df["monto_zscore_hist"] = (df["monto"] - media) / np.maximum(desvio, media.clip(min=1e-9) * 0.05)

    # Duplicados exactos: mismo comercio + monto + fecha (indicio directo de cargo_duplicado)
    claves_dup = ["fecha", "comercio", "monto", "moneda"]
    df["n_duplicados_exactos"] = df.groupby(claves_dup)["monto"].transform("count") - 1

    columnas = [
        "archivo", "fecha", "descripcion", "comercio", "categoria",
        "monto", "moneda", "dia_semana", "dia_mes", "mes",
        "grupo_referencia", "monto_medio_hist", "monto_ratio_hist",
        "monto_zscore_hist", "n_duplicados_exactos",
    ]
    return df[columnas].sort_values(["fecha", "archivo"]).reset_index(drop=True)


def main() -> None:
    crudo = cargar_resumenes()
    features = construir_features(crudo)
    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    features.to_csv(OUTPUT_PATH, index=False)
    print(f"{len(features)} transacciones procesadas -> {OUTPUT_PATH}")
    print(f"Comercios distintos: {features['comercio'].nunique()}")
    print(features["categoria"].value_counts())


if __name__ == "__main__":
    main()
