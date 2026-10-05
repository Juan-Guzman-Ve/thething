# Contexto del proyecto — Sistema de Detección de Anomalías Financieras Personales

Ver también [TODO.md](TODO.md) para el cronograma por etapas y [plan-de-trabajo.pdf](plan-de-trabajo.pdf) para el plan original de la cátedra.

## Objetivo

Detectar movimientos anómalos en resúmenes de tarjeta de crédito personales (aumentos de
precio no avisados, cargos duplicados, montos atípicos) usando un modelo no supervisado
(Isolation Forest) y mostrarlo en un dashboard.

## Estructura del repo

- `notebooks/` — resúmenes de tarjeta reales, uno por cierre mensual
  (`resumen_tarjeta_cierre_YYYY-MM-DD.csv`, columnas: `fecha,descripcion,monto,moneda`).
- `notebooks/_originals_backup/` — copia sin modificar de los 3 CSV en los que se
  inyectaron anomalías sintéticas (ver más abajo), por si hace falta revertir o comparar.
- `data/eval_labels.csv` — ground truth de las anomalías sintéticas inyectadas, para
  evaluar el modelo (los datos reales no tienen labels).
- `dashboard/` — vacío todavía (Etapa 3).
- `tools/setup.ps1` — script de setup del entorno.
- `src/preprocess.py` — carga todos los CSVs, filtra filas no-compra, y genera features para el modelo.
- `data/transactions.csv` — dataset preprocesado (613 filas, generado por `preprocess.py`).

## Avances

### Etapa 1
- Tipos de anomalía definidos: `aumento_precio`, `cargo_duplicado`, `monto_atipico`.
- Se cargaron 14 resúmenes reales propios en `notebooks/` (abril 2025 a abril 2026).
- Pendiente: reunir referencias bibliográficas.

### Preparación para evaluación (sin ground truth real)
Como los resúmenes reales no traen labels de anomalías, se inyectaron 3 anomalías
sintéticas controladas en 3 de los CSV (una por tipo), y se registró el ground truth en
`data/eval_labels.csv`:

| Archivo | Tipo | Cambio |
|---|---|---|
| `resumen_tarjeta_cierre_2026-04-30.csv` | aumento_precio | Spotify 06/04: USD 4.00 → 5.50 (la suscripción normalmente varía ±10% por tipo de cambio; este salto es deliberadamente mayor) |
| `resumen_tarjeta_cierre_2026-02-26.csv` | cargo_duplicado | MERPAGO*RIALTO $7.800 (04/02) duplicado exacto el mismo día |
| `resumen_tarjeta_cierre_2025-12-31.csv` | monto_atipico | DLO*RAPPI 02/12: $8.988 → $71.904 (x8) |

El resto de las transacciones son reales y no tienen alteraciones.

## Decisiones

- **Se eliminó `src/generate_mock_data.py`** y los CSV que generaba
  (`data/transacciones_mock.csv`, `data/transacciones_mock_labels.csv`): una vez cargados
  los resúmenes reales, el dataset mock completo ya no es necesario. En su lugar, la
  evaluación se resuelve inyectando anomalías puntuales sobre datos reales (ver arriba).

## Avances (Etapa 2)

- `src/preprocess.py` implementado: carga 13 CSVs (738 filas brutas → 613 compras),
  normaliza nombres de comercio, detecta moneda real (algunos USD vienen marcados ARS en
  el export), y genera features: `ratio_mediana`, `zscore_hist`, `es_duplicado`, `log_monto`.
- Verificación contra ground truth: los 3 anomalías sintéticas se detectan con señales
  claras (aumento_precio z=2.79, cargo_duplicado dup=1, monto_atipico z=3.75).

## Próximos pasos (Etapa 2)

1. Entrenar Isolation Forest con `src/train.py` — puede correrse localmente, scikit-learn ya instalado.
2. Evaluar contra `data/eval_labels.csv` y calcular precision/recall.
3. Redactar esqueleto del paper + marco teórico.
