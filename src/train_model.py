"""Entrena un Isolation Forest sobre data/dataset_features.csv y lo evalua
contra las 3 anomalias sinteticas de data/eval_labels.csv.

Uso: desde la raiz del repo -> .venv\\Scripts\\python.exe src\\train_model.py
Genera data/dataset_scored.csv con el score de anomalia de cada transaccion.
"""

from pathlib import Path

import pandas as pd
from sklearn.ensemble import IsolationForest

REPO_ROOT = Path(__file__).resolve().parent.parent
FEATURES_PATH = REPO_ROOT / "data" / "dataset_features.csv"
LABELS_PATH = REPO_ROOT / "data" / "eval_labels.csv"
OUTPUT_PATH = REPO_ROOT / "data" / "dataset_scored.csv"

# El monto crudo queda afuera a proposito: en pesos con inflacion su escala
# domina el aislamiento del arbol y termina marcando como "anomalo" cualquier
# compra grande y legitima (ej. un pago de matricula) en vez de lo que devia
# del patron de cada comercio/categoria, que es lo que interesa detectar.
FEATURE_COLUMNS = ["monto_ratio_hist", "monto_zscore_hist", "n_duplicados_exactos"]

# ~2% de contaminacion asumida: es un punto de partida arbitrario (no hay tasa
# de anomalias real conocida), pensado para dejar margen sobre las 3 anomalias
# sinteticas (3/657 ~ 0.5%) mas algunos cargos grandes pero legitimos. Se
# ajusta con mas evidencia una vez que haya mas ejemplos evaluados.
CONTAMINATION = 0.02
RANDOM_STATE = 42


def entrenar(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    X = df[FEATURE_COLUMNS]
    modelo = IsolationForest(n_estimators=200, contamination=CONTAMINATION, random_state=RANDOM_STATE)
    modelo.fit(X)
    # decision_function: mas alto = mas normal; se invierte para que mas alto = mas anomalo.
    df["anomaly_score"] = -modelo.decision_function(X)
    df["es_anomalia"] = modelo.predict(X) == -1
    return df


def evaluar(df_scored: pd.DataFrame, labels: pd.DataFrame) -> None:
    df_scored = df_scored.copy()
    df_scored["ranking"] = df_scored["anomaly_score"].rank(ascending=False, method="min").astype(int)

    claves = ["archivo", "fecha", "descripcion", "monto"]
    merged = labels.merge(df_scored, on=claves, how="left")

    total = len(df_scored)
    print(f"\n{total} transacciones evaluadas, {int(df_scored['es_anomalia'].sum())} marcadas como anomalas.")
    print("\nAnomalias sinteticas conocidas (data/eval_labels.csv):")
    merged["percentil"] = (1 - (merged["ranking"] - 1) / total) * 100
    cols = ["descripcion", "monto", "tipo_anomalia", "anomaly_score", "ranking", "percentil", "es_anomalia"]
    print(merged[cols].round({"percentil": 1}).to_string(index=False))

    print("\nTop 10 transacciones con mayor anomaly_score:")
    top = df_scored.sort_values("anomaly_score", ascending=False).head(10)
    print(top[["archivo", "fecha", "descripcion", "monto", "anomaly_score"]].to_string(index=False))


def main() -> None:
    df = pd.read_csv(FEATURES_PATH, parse_dates=["fecha"])
    labels = pd.read_csv(LABELS_PATH, parse_dates=["fecha"])
    df_scored = entrenar(df)
    df_scored.to_csv(OUTPUT_PATH, index=False)
    print(f"Dataset con scores guardado en {OUTPUT_PATH}")
    evaluar(df_scored, labels)


if __name__ == "__main__":
    main()
