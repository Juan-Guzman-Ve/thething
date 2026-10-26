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
- `src/preprocess.py` — unifica los 13 `notebooks/resumen_tarjeta_cierre_*.csv` en
  `data/dataset_features.csv`: normaliza el nombre de comercio, lo categoriza por
  palabra clave, y calcula desvío (ratio y z-score) del monto vs. la media histórica
  del comercio (o de la categoría si el comercio tiene pocas transacciones), más un
  flag de duplicado exacto (mismo comercio+monto+fecha). Descarta pagos/devoluciones/
  bonificaciones (monto ≤ 0), que no son cargos evaluables como anómalos.
- `src/train.py` — entrena un Isolation Forest (localmente, no en Colab; ver
  "Decisiones") sobre `data/transactions.csv` usando features relativas con
  `StandardScaler` (log_monto, ratio_mediana, zscore_hist, es_duplicado). Genera
  `data/scores.csv` con el score de anomalía de cada transacción. Usado por `tools/train.ps1`.
- `referencias_bibliograficas.md` — 20 referencias académicas (6 de 2026) para la entrega de Etapa 1.
- `paper/` — proyecto LaTeX del paper (formato IEEE, dos columnas), pensado para subir/sincronizar con Overleaf.
  `main.tex` tiene el esqueleto (secciones vacías con `% TODO`) más una sección "Investigación Bibliográfica"
  con 15 de las 20 referencias (6 de 2026) y una breve descripción de cada una, pedida puntualmente por la
  consigna de la actividad de Etapa 1 (10 a 15 referencias); se puede borrar más adelante cuando se cite
  directamente en el cuerpo del texto. `references.bib` tiene las 20 referencias en formato BibTeX (las 5 que
  no entraron en esa sección quedan igual disponibles para citar en el Marco Teórico).

## Avances

### Etapa 1
- Tipos de anomalía definidos: `aumento_precio`, `cargo_duplicado`, `monto_atipico`.
- Se cargaron 14 resúmenes reales propios en `notebooks/` (abril 2025 a abril 2026).
- Referencias bibliográficas reunidas (`referencias_bibliograficas.md`, `paper/references.bib`).

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

### Primer modelo (Isolation Forest)
Entrenado localmente sobre las 3 features relativas de `dataset_features.csv`
(contaminación asumida 2%, arbitraria por ahora). Las 3 anomalías sintéticas quedan
en el percentil 95-98 de anomaly_score (top 5% de 657 transacciones), pero no entran
en el 2% marcado como `es_anomalia` con el corte actual — el ranking/score es más
informativo que ese corte binario por ahora. Limitación notada: compras grandes pero
legítimas y únicas (ej. un electrodoméstico, la matrícula de la facultad) caen en la
categoría "otros" con poco historial propio, así que su ratio/z-score también se
dispara y terminan con scores más altos que las anomalías sintéticas — es esperable
para un detector no supervisado (marca rareza estadística, no "maldad"), pero hay que
discutirlo en el paper y quizás pensar un tratamiento distinto para comercios con
muy poco historial.

## Decisiones

- **Se eliminó `src/generate_mock_data.py`** y los CSV que generaba
  (`data/transacciones_mock.csv`, `data/transacciones_mock_labels.csv`): una vez cargados
  los resúmenes reales, el dataset mock completo ya no es necesario. En su lugar, la
  evaluación se resuelve inyectando anomalías puntuales sobre datos reales (ver arriba).
- **Se entrena localmente, no en Google Colab** (a diferencia de lo que dice
  `plan-de-trabajo.pdf`): Isolation Forest sobre ~650 filas entrena en milisegundos en
  CPU, no hace falta el cómputo de Colab, y mantener todo en el repo vía `.venv` es más
  simple y reproducible que repartir el estado entre el repo y un notebook aparte.

## Próximos pasos (Etapa 2)

1. ~~Preprocesar todos los `notebooks/resumen_tarjeta_cierre_*.csv` en un único dataset.~~
   Hecho, ver `src/preprocess.py` → `data/dataset_features.csv` (657 cargos, no incluye
   hora por no estar disponible en los datos reales, solo `fecha`).
2. ~~Entrenar Isolation Forest (scikit-learn).~~ Hecho, ver `src/train.py` (local, no Colab).
3. ~~Evaluar contra `data/eval_labels.csv`.~~ Hecho — ver "Primer modelo (Isolation Forest)" arriba.
4. ~~Redactar esqueleto del paper + marco teórico.~~ Hecho, ver `paper/main.tex` — falta completar
   Metodología/Resultados/Conclusiones con lo anterior.
5. Revisar si conviene un tratamiento distinto para comercios con poco historial
   (hoy caen en la categoría "otros" y disparan falsos positivos de compras grandes
   pero legítimas y únicas).
