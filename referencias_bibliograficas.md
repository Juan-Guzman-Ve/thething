# Referencias bibliográficas — Sistema de Detección de Anomalías Financieras Personales

Recopiladas para la entrega de Etapa 1 (`TODO.md`). 20 referencias en total, 6 publicadas en 2026 (marcadas ⭐).
Fuentes: Google Scholar / búsqueda web (13/09/2026). Revisar acceso real a texto completo antes de citar en el paper —
algunos son preprints de arXiv aún no revisados por pares (marcados 🔸).

## 1. Isolation Forest — papers fundacionales

1. Liu, F. T., Ting, K. M., & Zhou, Z.-H. (2008). *Isolation Forest*. En Proceedings of the 2008 Eighth IEEE
   International Conference on Data Mining (ICDM), pp. 413–422.
   https://doi.org/10.1109/ICDM.2008.17
   — El paper original del algoritmo que se va a usar en el proyecto.

2. Liu, F. T., Ting, K. M., & Zhou, Z.-H. (2012). *Isolation-Based Anomaly Detection*. ACM Transactions on
   Knowledge Discovery from Data, 6(1), Article 3.
   https://doi.org/10.1145/2133360.2133363
   — Versión extendida/journal del paper anterior, con más detalle teórico (path length, score de anomalía).

3. Xu, H., Pang, G., Wang, Y., & Wang, Y. (2023). *Deep Isolation Forest for Anomaly Detection*. arXiv:2206.06602
   (publicado en IEEE TKDE).
   https://ar5iv.labs.arxiv.org/html/2206.06602
   — Extiende Isolation Forest con representaciones no lineales; útil para la sección de trabajo relacionado/limitaciones.

4. Xiang, H., et al. (2023). *OptIForest: Optimal Isolation Forest for Anomaly Detection*. arXiv:2306.12703 (IJCAI 2023).
   https://arxiv.org/pdf/2306.12703
   — Variante que optimiza la estructura del árbol; útil para justificar elección de hiperparámetros.

5. *Anomaly Detection Based on Isolation Mechanisms: A Survey* (2024). arXiv:2403.10802.
   https://arxiv.org/pdf/2403.10802
   — Survey reciente que mapea toda la familia de métodos basados en aislamiento.

## 2. Detección de anomalías — surveys generales

6. Chandola, V., Banerjee, A., & Kumar, V. (2009). *Anomaly Detection: A Survey*. ACM Computing Surveys, 41(3),
   Article 15.
   https://doi.org/10.1145/1541880.1541882
   — Survey más citado del campo; buena base para el marco teórico general.

7. Ahmed, M., Mahmood, A. N., & Islam, M. R. (2016). *A survey of anomaly detection techniques in financial
   domain*. Future Generation Computer Systems, 55, 278–288.
   https://doi.org/10.1016/j.future.2015.01.001
   — Survey enfocado específicamente en el dominio financiero.

## 3. Isolation Forest aplicado a tarjetas de crédito / fraude

8. Ounacer, S., et al. (2018). *Using Isolation Forest in anomaly detection: the case of credit card transactions*.
   https://www.researchgate.net/publication/337846764
   — Compara Isolation Forest contra LOF, One-Class SVM y K-means en tarjetas de crédito.

9. Vijayakumar, V., Divya, N. S., Sarojini, P., & Sonika, K. (2020). *Isolation Forest and Local Outlier Factor
   for Credit Card Fraud Detection System*.
   https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3925017

10. *Performance Analysis of Isolation Forest Algorithm in Fraud Detection of Credit Card Transactions* (2022).
    https://www.researchgate.net/publication/365589106

11. Dal Pozzolo, A., Boracchi, G., Caelen, O., Alippi, C., & Bontempi, G. (2018). *Credit Card Fraud Detection:
    A Realistic Modeling and a Novel Learning Strategy*. IEEE Transactions on Neural Networks and Learning
    Systems, 29(8), 3784–3797.
    https://dalpozz.github.io/static/pdf/TNNLS_2017.pdf
    — No usa Isolation Forest, pero es la referencia clásica sobre metodología realista de evaluación en fraude
      con tarjetas (relevante para justificar cómo evaluamos contra `data/eval_labels.csv`).

## 4. Anomalías en datos financieros / contables con deep learning

12. Schreyer, M., Sattarov, T., Borth, D., Dengel, A., & Reimer, B. (2017). *Detection of Anomalies in
    Large-Scale Accounting Data using Deep Autoencoder Networks*. arXiv:1709.05254.
    https://arxiv.org/pdf/1709.05254
    — Autoencoders no supervisados para anomalías contables; buen contraste con Isolation Forest.

## 5. Finanzas personales + ML (no solo fraude corporativo)

13. *Leveraging Machine Learning for Predictive Budgeting and Anomaly Detection in Personal Finance* (2025).
    https://www.researchgate.net/publication/391513861
    — El más cercano en alcance al proyecto: presupuesto + detección de anomalías a nivel personal.

14. *A Machine Learning Approach to Detecting Financial Anomalies in Large Global Companies* (2024/2025). En
    Proceedings of the 2024 4th International Conference on Big Data, Artificial Intelligence and Risk
    Management.
    https://dl.acm.org/doi/full/10.1145/3718751.3718820

## 6. Publicadas en 2026 ⭐

15. ⭐ Al-Bulushi, A., Shaikh, A. K., & Adhikari, N. (2026). *Applying supervised machine learning algorithms and
    ensemble models to enhance credit card fraud detection*. Frontiers in Artificial Intelligence, 9.
    https://doi.org/10.3389/frai.2026.1813728

16. ⭐ Feng, X., & Kim, S.-K. (2026). *Machine Learning-Based Data Generative Techniques for Credit Card
    Fraud-Detection Systems*. Mathematics, 14(6), 975.
    https://doi.org/10.3390/math14060975

17. ⭐ Gamal, N., Younis, E. M. G., & Makram, W. M. (2026). *Enhancing credit card fraud detection with a hybrid
    approach using machine and deep learning*. Scientific Reports, 16, 10944.
    https://doi.org/10.1038/s41598-026-42891-4

18. ⭐ Cao, H. (2026). *Interpretable financial time series anomaly detection based on frequency domain features
    and enhanced sparse attention*. Applied Intelligence, 56, Article 324.
    https://doi.org/10.1007/s10489-026-07335-6
    — Buen candidato para justificar la parte de "explicación de por qué se marcó cada movimiento" del dashboard
      (Etapa 3).

19. ⭐🔸 Gopalakrishnan, V. (2026). *SilIF: Silhouette-Augmented Isolation Forest for Unsupervised Transaction
    Fraud Detection*. arXiv:2605.26135.
    https://arxiv.org/abs/2605.26135
    — Preprint sin revisión por pares (autor único); mejora Isolation Forest con un score de silueta. Verificar
      si la cátedra acepta preprints de arXiv como referencia.

20. ⭐🔸 Lodhi, A. (2026). *Explainable Artificial Intelligence for Anomaly Detection in Banking Transactions: An
    Internal Audit Perspective*. arXiv:2607.13469.
    https://arxiv.org/abs/2607.13469
    — Preprint sin revisión por pares (autor único). Combina Isolation Forest + SHAP + dashboard tipo Streamlit;
      muy alineado con Etapa 3 del proyecto (dashboard + explicación de alertas). Verificar aceptación de preprints.

---

## Nota sobre calidad de fuentes

Los ítems 19 y 20 (🔸) son preprints de arXiv de autor único, aún no publicados en una revista o conferencia con
revisión por pares — conviene confirmar con la cátedra si son aceptables como referencia, o reemplazarlos por
otro candidato 2026 ya detectado durante la búsqueda pero no incluido en esta lista de 20:

- Neela, S. (2026). *An Explainable Market Integrity Monitoring System with Multi-Source Attention Signals and
  Transparent Scoring*. arXiv:2601.15304. https://arxiv.org/abs/2601.15304 (también preprint de autor único,
  mismo caveat).
