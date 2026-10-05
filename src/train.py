"""
Entrena Isolation Forest sobre data/transactions.csv y guarda los scores en
data/scores.csv. Imprime evaluación contra data/eval_labels.csv.

Uso:
    .venv\\Scripts\\python.exe src\\train.py
"""

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

DATA_DIR = Path(__file__).parent.parent / "data"
TRANSACTIONS_PATH = DATA_DIR / "transactions.csv"
LABELS_PATH = DATA_DIR / "eval_labels.csv"
SCORES_PATH = DATA_DIR / "scores.csv"

# Features para el modelo
FEATURES = ["log_monto", "ratio_mediana", "zscore_hist", "es_duplicado"]

# Contaminación estimada: 3 anomalías sobre ~613 transacciones ≈ 0.005
# Usamos un valor un poco mayor para capturar variaciones del modelo
CONTAMINATION = 0.04


def train_and_score(df: pd.DataFrame) -> pd.DataFrame:
    X = df[FEATURES].fillna(0).values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=42,
    )
    model.fit(X_scaled)

    # score_samples: más negativo = más anómalo
    df = df.copy()
    df["anomaly_score"] = model.score_samples(X_scaled)
    # Predicción: -1 = anómalo, 1 = normal
    df["is_anomaly"] = (model.predict(X_scaled) == -1).astype(int)
    # Rango (1 = más anómalo)
    df["rank"] = df["anomaly_score"].rank(method="first").astype(int)

    return df


def evaluate(df: pd.DataFrame, labels: pd.DataFrame):
    print("\n=== Evaluación contra ground truth ===")
    detected = 0
    for _, row in labels.iterrows():
        match = df[
            (df["archivo"] == row["archivo"]) & (df["monto"] == row["monto"])
        ]
        if match.empty:
            print(f"  ✗ NO ENCONTRADO: {row['archivo']} monto={row['monto']}")
            continue
        r = match.iloc[0]
        flagged = "✓ DETECTADO" if r["is_anomaly"] == 1 else "✗ NO DETECTADO"
        detected += r["is_anomaly"]
        print(
            f"  [{row['tipo_anomalia']}] {flagged}  "
            f"comercio={r['comercio']}  monto={r['monto']}  "
            f"score={r['anomaly_score']:.4f}  rank={r['rank']}/{len(df)}"
        )

    recall = detected / len(labels)
    n_flagged = df["is_anomaly"].sum()
    precision = detected / n_flagged if n_flagged > 0 else 0
    print(f"\n  Precision: {precision:.2f}  Recall: {recall:.2f}")
    print(f"  Flagged: {n_flagged}/{len(df)} transacciones")
    return precision, recall


def main():
    df = pd.read_csv(TRANSACTIONS_PATH, parse_dates=["fecha", "cierre"])
    labels = pd.read_csv(LABELS_PATH)

    print(f"Transacciones: {len(df)}")
    print(f"Features: {FEATURES}")

    df = train_and_score(df)
    evaluate(df, labels)

    df.to_csv(SCORES_PATH, index=False)
    print(f"\nScores guardados: {SCORES_PATH}")

    print("\n--- Top 10 más anómalas ---")
    top = df.nsmallest(10, "anomaly_score")[
        ["comercio", "monto", "moneda_real", "fecha", "ratio_mediana",
         "zscore_hist", "es_duplicado", "anomaly_score", "rank"]
    ]
    print(top.to_string(index=False))


if __name__ == "__main__":
    main()
