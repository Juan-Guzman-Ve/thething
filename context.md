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
- `src/` — vacío por ahora (se eliminó `generate_mock_data.py`, ver "Decisiones").
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

## Decisiones

- **Se eliminó `src/generate_mock_data.py`** y los CSV que generaba
  (`data/transacciones_mock.csv`, `data/transacciones_mock_labels.csv`): una vez cargados
  los resúmenes reales, el dataset mock completo ya no es necesario. En su lugar, la
  evaluación se resuelve inyectando anomalías puntuales sobre datos reales (ver arriba).

## Próximos pasos (Etapa 2)

1. Preprocesar todos los `notebooks/resumen_tarjeta_cierre_*.csv` en un único dataset:
   features de monto, día/hora (no disponible en los datos reales, solo `fecha`), y
   desvío vs. historial por comercio/categoría.
2. Entrenar Isolation Forest (scikit-learn) en Google Colab.
3. Evaluar contra `data/eval_labels.csv`.
4. ~~Redactar esqueleto del paper + marco teórico.~~ Hecho, ver `paper/main.tex` — falta completar
   Metodología/Resultados/Conclusiones a medida que avanzan los puntos 1-3.
