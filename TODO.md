# TODO — Sistema de Detección de Anomalías Financieras Personales

## Etapa 1 — hasta 15/9 (entrega: referencias bibliográficas)
- [x] Definir tipos de movimientos anómalos (aumento de precio, cargo duplicado, monto atípico)
- [x] Recolectar resúmenes reales propios (CSV) de cuenta/tarjeta (`notebooks/resumen_tarjeta_cierre_*.csv`)
- [ ] Reunir referencias bibliográficas para la entrega de la cátedra

## Etapa 2 — hasta 6/10 (entrega: esqueleto del paper + marco teórico)
- [x] Preprocesar datos (features: monto, día/hora, desvío vs. historial por comercio/categoría)
- [ ] Entrenar primer modelo Isolation Forest (scikit-learn) en Google Colab
- [ ] Evaluar el modelo contra `data/eval_labels.csv`
- [ ] Redactar esqueleto del paper + marco teórico

## Etapa 3 — hasta 27/10 (entrega: desarrollo del paper + prueba de concepto)
- [ ] Definir framework del dashboard web
- [ ] Armar dashboard: gastos del usuario + alertas con explicación de por qué se marcó cada movimiento
- [ ] Conectar el dashboard con el modelo entrenado
- [ ] Preparar prueba de concepto end-to-end
- [ ] Redactar desarrollo del paper

## Etapa 4 — hasta 9/11 (entrega: entrega final + presentación)
- [ ] Ajustes finales al modelo/dashboard
- [ ] Redactar introducción/conclusión/resumen
- [ ] Preparar defensa oral
- [ ] Enviar paper y presentación a Adriana Latorre (alator@palermo.edu)
