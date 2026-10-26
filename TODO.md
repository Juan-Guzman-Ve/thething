# TODO — Sistema de Detección de Anomalías Financieras Personales

## Etapa 1 — hasta 15/9 (entrega: referencias bibliográficas)
- [x] Definir tipos de movimientos anómalos (aumento de precio, cargo duplicado, monto atípico)
- [x] Recolectar resúmenes reales propios (CSV) de cuenta/tarjeta (`notebooks/resumen_tarjeta_cierre_*.csv`)
- [x] Reunir referencias bibliográficas para la entrega de la cátedra (`referencias_bibliograficas.md`, `paper/references.bib`)

## Etapa 2 — hasta 6/10 (entrega: esqueleto del paper + marco teórico)
- [x] Preprocesar datos (features: monto, día/hora, desvío vs. historial por comercio/categoría) (`src/preprocess.py` → `data/dataset_features.csv`)
- [x] Entrenar primer modelo Isolation Forest (scikit-learn) localmente (`src/train.py`)
- [x] Evaluar el modelo contra `data/eval_labels.csv`
- [x] Redactar esqueleto del paper + marco teórico (`paper/main.tex`)

## Etapa 3 — hasta 27/10 (entrega: desarrollo del paper + prueba de concepto)
### Paper (Consigna parte 1 — reorganización + desarrollo)
- [x] Mover "Investigación Bibliográfica" a la Introducción (referencias integradas al cuerpo del paper)
- [x] Redactar Abstract y Keywords
- [x] Redactar sección Metodología (Dataset, Preprocesamiento, Modelo, Evaluación)
- [x] Redactar Resultados Preliminares
- [x] Redactar esqueleto de Conclusiones y Trabajo Futuro

### Prueba de concepto (Consigna parte 2 — viabilidad de la solución)
- [x] Dashboard HTML/JS/CSS (`dashboard/index.html`, `app.js`, `style.css`)
- [x] Pipeline completo: `tools/train.ps1` → `data/scores.csv` → dashboard vía `tools/serve.ps1`
- [x] Panel de alertas con explicación por comercio (ratio, z-score, duplicado)
- [x] Documentar consejos de implementación (`paper/main.tex` sección "Lecciones de Implementación")

## Etapa 4 — hasta 9/11 (entrega: entrega final + presentación)
- [ ] Ajustes finales al modelo/dashboard
- [ ] Redactar introducción/conclusión/resumen
- [ ] Preparar defensa oral
- [ ] Enviar paper y presentación a Adriana Latorre (alator@palermo.edu)
