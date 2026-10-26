'use strict';

// ── Data dictionary ──────────────────────────────────────────────────────────
const DICT = [
  { name: 'fecha',         type: 'fecha',   desc: 'Fecha en que se realizó la transacción según el resumen del banco.' },
  { name: 'descripcion',   type: 'texto',   desc: 'Texto original del banco que describe el comercio o concepto del cargo.' },
  { name: 'monto',         type: 'número',  desc: 'Monto cobrado. Para transacciones USD el valor está en dólares; para ARS en pesos.' },
  { name: 'moneda',        type: 'texto',   desc: 'Moneda original exportada por el banco. Algunos cargos USD llegan etiquetados como ARS (ver moneda_real).' },
  { name: 'archivo',       type: 'texto',   desc: 'Nombre del CSV de origen, correspondiente al cierre mensual en que figura el cargo.' },
  { name: 'cierre',        type: 'fecha',   desc: 'Fecha de cierre del resumen de tarjeta del que proviene la transacción.' },
  { name: 'comercio',      type: 'texto',   desc: 'Nombre normalizado del comercio: se eliminaron prefijos de intermediarios (MERPAGO*, PAYU*AR*, DLO*, etc.) para agrupar compras al mismo proveedor.' },
  { name: 'moneda_real',   type: 'texto',   desc: 'Moneda real de la transacción. Si la descripción contiene "USD", se reclasifica como USD aunque el campo moneda diga ARS.' },
  { name: 'dia_semana',    type: 'número',  desc: 'Día de la semana. 0 = lunes, 6 = domingo.' },
  { name: 'mes',           type: 'número',  desc: 'Mes del año (1 = enero, 12 = diciembre).' },
  { name: 'mediana_hist',  type: 'número',  desc: 'Mediana histórica del monto de todas las transacciones del mismo comercio y moneda. Es la referencia de "precio normal" para ese comercio.' },
  { name: 'std_hist',      type: 'número',  desc: 'Desviación estándar histórica del monto para ese comercio y moneda. Si es 0 o hay menos de 3 apariciones el z-score se fija en 0.' },
  { name: 'n_hist',        type: 'número',  desc: 'Cantidad de veces que aparece ese comercio en el dataset. Un comercio con n=1 no tiene historial comparativo.' },
  { name: 'ratio_mediana', type: 'número',  desc: 'Monto actual ÷ mediana histórica del comercio. Valor 1.0 = precio exactamente normal. Valor 2.0 = cobró el doble de lo habitual.' },
  { name: 'zscore_hist',   type: 'número',  desc: 'Z-score del monto respecto al historial del comercio: (monto − media) / std. Valores > 2 o < −2 indican que el monto está lejos de lo habitual. Solo se calcula con ≥ 3 apariciones.' },
  { name: 'es_duplicado',  type: 'binario', desc: 'Señal de cargo duplicado: 1 si existe otra transacción con exactamente el mismo comercio, monto y fecha. Limitación: cargos de fin de mes que aparecen en dos resúmenes consecutivos también activan esta señal.' },
  { name: 'log_monto',     type: 'número',  desc: 'Logaritmo natural de (1 + monto). Escala logarítmica que reduce el impacto de montos ARS muy grandes frente a montos USD pequeños.' },
  { name: 'anomaly_score', type: 'número',  desc: 'Score de Isolation Forest. Más negativo = más anómalo. Valores cerca de 0 son transacciones normales. El umbral de corte para este dataset es ~−0.62.' },
  { name: 'is_anomaly',    type: 'binario', desc: '1 si fue marcada como anómala por el modelo (4% con scores más negativos). 0 = normal.' },
  { name: 'rank',          type: 'número',  desc: 'Ranking de anomalía: 1 = transacción más anómala del dataset, ordenada por anomaly_score de menor a mayor.' },
];

// ── State ────────────────────────────────────────────────────────────────────
let allRows     = [];
let sortState   = { col: 'rank', dir: 'asc' };
let filterState = 'all';
let searchQ     = '';
let selectedYear = '';

// ── Utilities ────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const num = v  => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

function fmt(n, dec = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtAmt(row) {
  const m = num(row.monto);
  if ((row.moneda_real || '').toUpperCase() === 'USD') {
    return `USD ${fmt(m, 2)}`;
  }
  return `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(m)}`;
}

function fmtDate(val) {
  if (!val) return '—';
  return String(val).split(' ')[0];
}

function monthKey(fecha) {
  const d = String(fecha).split(' ')[0].split('-');
  return d.length >= 2 ? `${d[0]}-${d[1]}` : 'unknown';
}

function monthLabel(key) {
  const [year, month] = key.split('-');
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${MONTHS[(parseInt(month) || 1) - 1]} ${year}`;
}

function signalWhy(row) {
  const parts = [];
  if (row.es_duplicado === '1') parts.push('Cargo duplicado exacto (mismo comercio, monto y fecha).');
  const ratio = num(row.ratio_mediana);
  const z     = Math.abs(num(row.zscore_hist));
  if (ratio > 5)   parts.push(`Monto <strong>${fmt(ratio, 1)}×</strong> la mediana histórica del comercio.`);
  else if (ratio > 2) parts.push(`Monto <strong>${fmt(ratio, 1)}×</strong> la mediana histórica.`);
  if (z > 3)       parts.push(`Z-score <strong>${fmt(num(row.zscore_hist), 1)}</strong> — muy fuera del rango habitual.`);
  else if (z > 2)  parts.push(`Z-score <strong>${fmt(num(row.zscore_hist), 1)}</strong> — por encima del umbral.`);
  if (!parts.length) parts.push('Combinación inusual de features para el modelo.');
  return parts.join(' ');
}

function signalPills(row) {
  const p = [];
  if (row.es_duplicado === '1') p.push('<span class="pill pill-dup">DUP</span>');
  const z = Math.abs(num(row.zscore_hist));
  if (z > 3)      p.push('<span class="pill pill-high">z &gt; 3</span>');
  else if (z > 2) p.push('<span class="pill pill-mid">z &gt; 2</span>');
  const r = num(row.ratio_mediana);
  if (r > 5)      p.push(`<span class="pill pill-high">×${fmt(r, 1)}</span>`);
  else if (r > 2.5) p.push(`<span class="pill pill-mid">×${fmt(r, 1)}</span>`);
  return p.join('');
}

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV vacío o sin filas de datos.');

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map((line, lineIdx) => {
    const vals = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
        else { inQ = !inQ; }
      } else if (c === ',' && !inQ) {
        vals.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    vals.push(cur);

    const row = {};
    headers.forEach((h, i) => {
      row[h] = (vals[i] || '').trim().replace(/^"|"$/g, '');
    });
    row._id = lineIdx;
    return row;
  }).filter(r => Object.keys(r).length > 1); // skip blank lines
}

// ── Error display ─────────────────────────────────────────────────────────────
function showError(msg, detail) {
  const msgEl = $('error-msg');
  if (msgEl) msgEl.textContent = msg;
  const detEl = $('error-detail');
  if (detEl && detail) { detEl.textContent = detail; detEl.hidden = false; }
  $('loading').hidden = true;
  $('error-state').hidden = false;
}

window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled rejection:', e.reason);
});

// ── Build: KPIs ──────────────────────────────────────────────────────────────
function buildKPIs(rows, flagged) {
  const scores  = rows.map(r => num(r.anomaly_score)).filter(s => s !== 0 || rows.some(r => r.anomaly_score === '0'));
  const allScores = rows.map(r => num(r.anomaly_score));
  const minScore  = Math.min(...allScores);

  $('kpi-total').textContent   = rows.length;
  $('kpi-flagged').textContent = flagged.length;
  $('kpi-score').textContent   = isFinite(minScore) ? minScore.toFixed(3) : '—';
}

// ── Build: Alert cards ───────────────────────────────────────────────────────
function buildAlerts(flagged) {
  const sorted = [...flagged].sort((a, b) => num(a.anomaly_score) - num(b.anomaly_score));
  $('alert-grid').innerHTML = sorted.map(row => `
    <div class="alert-card">
      <div class="ac-top">
        <span class="ac-rank">Rank #${row.rank}</span>
        <span class="ac-score">${num(row.anomaly_score).toFixed(4)}</span>
      </div>
      <div class="ac-merchant">${row.comercio || row.descripcion}</div>
      <div class="ac-amount"><strong>${fmtAmt(row)}</strong> · ${fmtDate(row.fecha)}</div>
      <div class="ac-why">${signalWhy(row)}</div>
      <div class="pills">${signalPills(row)}</div>
    </div>`).join('');
}

// ── Build: Histogram ─────────────────────────────────────────────────────────
function buildHistogram(rows) {
  const svg = $('hist-svg');
  if (!svg) return;

  const scores = rows.map(r => num(r.anomaly_score));
  const minS   = Math.min(...scores);
  const maxS   = Math.max(...scores);
  if (!isFinite(minS) || !isFinite(maxS) || minS === maxS) return;

  const flaggedSet = new Set(
    rows.filter(r => r.is_anomaly === '1').map(r => num(r.anomaly_score))
  );
  const threshold = rows
    .filter(r => r.is_anomaly === '1')
    .map(r => num(r.anomaly_score))
    .reduce((min, s) => s < min ? s : min, Infinity);

  const BUCKETS = 30;
  const range   = maxS - minS;
  const axisMin = minS - range * 0.08;  // 8% de padding a la izquierda para que el umbral no quede en el borde
  const axisMax = maxS;
  const axisRange = axisMax - axisMin;
  const bw      = axisRange / BUCKETS;
  const counts  = Array(BUCKETS).fill(0);
  const flagBkt = Array(BUCKETS).fill(0);

  scores.forEach((s, i) => {
    const b = Math.min(Math.floor((s - axisMin) / bw), BUCKETS - 1);
    if (b < 0) return;
    counts[b]++;
    if (rows[i].is_anomaly === '1') flagBkt[b]++;
  });

  const maxC = Math.max(...counts);
  const W = 800, H = 140, ML = 44, MR = 20, MT = 12, MB = 36;
  const CW = W - ML - MR, CH = H - MT - MB;
  const bpx = CW / BUCKETS;
  const thX = isFinite(threshold) ? ML + (threshold - axisMin) / axisRange * CW : null;

  let out = '<g font-family="IBM Plex Mono,monospace">';

  // Grid lines
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = MT + CH * (1 - t);
    out += `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="#252B42" stroke-width="1"/>`;
    out += `<text x="${ML - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#7880A2">${Math.round(maxC * t)}</text>`;
  });

  // Bars
  counts.forEach((c, i) => {
    if (c === 0) return;
    const x    = ML + i * bpx;
    const barH = CH * (c / maxC);
    const fill = flagBkt[i] > 0 ? '#FF5572' : '#3DCFA6';
    const op   = flagBkt[i] > 0 ? 0.7 : 0.35;
    out += `<rect x="${(x + 1).toFixed(1)}" y="${(MT + CH - barH).toFixed(1)}" width="${(bpx - 2).toFixed(1)}" height="${barH.toFixed(1)}" fill="${fill}" opacity="${op}" rx="1"/>`;
  });

  // Threshold line
  if (thX !== null) {
    out += `<line x1="${thX.toFixed(1)}" y1="${MT}" x2="${thX.toFixed(1)}" y2="${MT + CH}" stroke="#FF5572" stroke-width="1.5" stroke-dasharray="4,3"/>`;
    out += `<text x="${(thX + 4).toFixed(1)}" y="${MT + 14}" font-size="9" fill="#FF5572">umbral ${threshold.toFixed(3)}</text>`;
  }

  // X-axis labels
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const val = axisMin + t * axisRange;
    const x   = ML + t * CW;
    out += `<text x="${x.toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#7880A2">${val.toFixed(3)}</text>`;
  });

  out += '</g>';
  svg.innerHTML = out;
}

// ── Build: Table ─────────────────────────────────────────────────────────────
function filteredRows() {
  return allRows
    .filter(r => {
      if (selectedYear && monthKey(r.fecha).split('-')[0] !== selectedYear) return false;
      if (filterState === 'flagged' && r.is_anomaly !== '1') return false;
      if (searchQ && !(r.comercio || '').toLowerCase().includes(searchQ)) return false;
      return true;
    })
    .sort((a, b) => {
      const { col, dir } = sortState;
      const av = a[col] || '', bv = b[col] || '';
      const an = parseFloat(av), bn = parseFloat(bv);
      const res = (!isNaN(an) && !isNaN(bn)) ? (an - bn) : av.localeCompare(bv);
      return dir === 'asc' ? res : -res;
    });
}

function rowHTML(r, month) {
  const flag       = r.is_anomaly === '1';
  const ratio      = num(r.ratio_mediana);
  const z          = num(r.zscore_hist);
  const ratioStyle = ratio > 5 ? 'color:var(--danger)' : ratio > 2.5 ? 'color:var(--warn)' : '';
  const zStyle     = Math.abs(z) > 3 ? 'color:var(--danger)' : Math.abs(z) > 2 ? 'color:var(--warn)' : '';
  const DAYS       = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  return `
    <tr class="${flag ? 'flagged' : ''}" data-id="${r._id}" data-month="${month}">
      <td class="td-rank">${r.rank}</td>
      <td class="td-merch">${r.comercio || '—'}</td>
      <td class="td-amt">${fmtAmt(r)}</td>
      <td>${r.moneda_real || r.moneda || '—'}</td>
      <td>${fmtDate(r.fecha)}</td>
      <td class="td-num" style="${ratioStyle}">${fmt(ratio)}</td>
      <td class="td-num" style="${zStyle}">${fmt(z)}</td>
      <td style="text-align:center">${r.es_duplicado === '1' ? '<span class="pill pill-dup" style="font-size:10px">DUP</span>' : '—'}</td>
      <td class="td-score">${num(r.anomaly_score).toFixed(4)}</td>
      <td style="text-align:center"><span class="flag-dot${flag ? '' : ' ok'}"></span></td>
    </tr>
    <tr class="row-detail" id="detail-${r._id}" hidden data-month="${month}">
      <td colspan="10">
        <div class="row-detail-inner">
          <div class="rd-item"><label>Descripcion banco</label><span class="text-val">${r.descripcion || '—'}</span></div>
          <div class="rd-item"><label>Archivo</label><span class="text-val">${r.archivo || '—'}</span></div>
          <div class="rd-item"><label>Mediana hist.</label><span>${fmtAmt({ monto: r.mediana_hist, moneda_real: r.moneda_real })}</span></div>
          <div class="rd-item"><label>Desv. estandar</label><span>${fmt(num(r.std_hist))}</span></div>
          <div class="rd-item"><label>N apariciones</label><span>${r.n_hist || '—'}</span></div>
          <div class="rd-item"><label>log(monto)</label><span>${fmt(num(r.log_monto))}</span></div>
          <div class="rd-item"><label>Dia semana</label><span>${DAYS[parseInt(r.dia_semana)] || r.dia_semana}</span></div>
          <div class="rd-item"><label>Cierre resumen</label><span>${fmtDate(r.cierre)}</span></div>
        </div>
      </td>
    </tr>`;
}

function renderTable() {
  const rows  = filteredRows();
  const tbody = $('tbody');

  $('row-count').textContent = `${rows.length} fila${rows.length !== 1 ? 's' : ''}`;

  // Group by month (most recent first)
  const groups = {};
  rows.forEach(r => {
    const k = monthKey(r.fecha);
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  });
  const sortedKeys = Object.keys(groups).sort().reverse();

  let html = '';
  sortedKeys.forEach(key => {
    const monthRows    = groups[key];
    const flaggedCount = monthRows.filter(r => r.is_anomaly === '1').length;
    const flagBadge    = flaggedCount
      ? ` <span class="month-flag">${flaggedCount} flaggeada${flaggedCount !== 1 ? 's' : ''}</span>`
      : '';

    html += `<tr class="month-header" data-month="${key}">
      <td colspan="10">
        <span class="month-toggle">&#9660;</span>
        <span class="month-label">${monthLabel(key)}</span>
        <span class="month-meta">${monthRows.length} transacciones${flagBadge}</span>
      </td>
    </tr>`;

    monthRows.forEach(r => { html += rowHTML(r, key); });
  });

  tbody.innerHTML = html;

  // Row click -> toggle detail (only if month is expanded)
  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => {
      const id     = tr.dataset.id;
      const detail = $(`detail-${id}`);
      if (!detail) return;
      const wasOpen = !detail.hidden;
      tbody.querySelectorAll('.row-detail').forEach(d => { d.hidden = true; });
      tbody.querySelectorAll('tr[data-id]').forEach(t => t.classList.remove('expanded'));
      if (!wasOpen) {
        detail.hidden = false;
        tr.classList.add('expanded');
      }
    });
  });

  // Month header click -> collapse/expand all rows in that month
  tbody.querySelectorAll('tr.month-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const key        = hdr.dataset.month;
      const isCollapsed = hdr.classList.contains('collapsed');
      const monthRows  = tbody.querySelectorAll(`tr[data-month="${key}"]:not(.month-header)`);

      if (isCollapsed) {
        // Expand: show only main rows, keep detail rows hidden
        monthRows.forEach(tr => {
          tr.hidden = tr.classList.contains('row-detail');
        });
        hdr.classList.remove('collapsed');
      } else {
        // Collapse: hide everything and clear expanded state
        monthRows.forEach(tr => {
          tr.hidden = true;
          tr.classList.remove('expanded');
        });
        hdr.classList.add('collapsed');
      }
    });
  });
}

// ── Build: Dictionary ─────────────────────────────────────────────────────────
function buildDict() {
  $('dict-grid').innerHTML = DICT.map(d => `
    <div class="dict-card">
      <div class="dict-name">${d.name}</div>
      <div class="dict-type">${d.type}</div>
      <div class="dict-desc">${d.desc}</div>
    </div>`).join('');
}

// ── Build: Year carousel ──────────────────────────────────────────────────────
function buildYearCarousel(rows) {
  const years = [...new Set(rows.map(r => monthKey(r.fecha).split('-')[0]))]
    .filter(Boolean)
    .sort(); // oldest → newest

  // Default to most recent year
  selectedYear = years[years.length - 1] || '';

  const carousel = $('year-carousel');
  if (!carousel) return;

  carousel.innerHTML = years.map(year => {
    const count   = rows.filter(r => monthKey(r.fecha).startsWith(year)).length;
    const flagged = rows.filter(r => monthKey(r.fecha).startsWith(year) && r.is_anomaly === '1').length;
    return `
      <button class="year-btn${year === selectedYear ? ' active' : ''}" data-year="${year}">
        <span class="year-num">${year}</span>
        <span class="year-sub">${count} trans${flagged ? ` · <span class="year-flag">${flagged} flag</span>` : ''}</span>
      </button>`;
  }).join('');

  carousel.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedYear = btn.dataset.year;
      carousel.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTable();
    });
  });
}

// ── Wire up controls ──────────────────────────────────────────────────────────
function setupControls() {
  // Sort headers
  document.querySelectorAll('thead th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      sortState = {
        col,
        dir: sortState.col === col && sortState.dir === 'asc' ? 'desc' : 'asc',
      };
      document.querySelectorAll('thead th').forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
      renderTable();
    });
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterState = btn.dataset.filter;
      renderTable();
    });
  });

  // Search
  $('search').addEventListener('input', e => {
    searchQ = e.target.value.toLowerCase().trim();
    renderTable();
  });

  // Default sort indicator
  const rankTh = document.querySelector('thead th[data-col="rank"]');
  if (rankTh) rankTh.classList.add('sort-asc');
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init(rows) {
  allRows = rows;

  const flagged = rows.filter(r => r.is_anomaly === '1');

  buildKPIs(rows, flagged);
  buildAlerts(flagged);
  buildHistogram(rows);
  buildYearCarousel(rows);
  renderTable();
  buildDict();
  setupControls();

  $('loading').hidden = true;
  $('app').hidden     = false;
}

// ── Fetch scores.csv ──────────────────────────────────────────────────────────
fetch('/data/scores.csv')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar scores.csv`);
    return res.text();
  })
  .then(text => {
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('scores.csv no tiene filas de datos.');
    init(rows);
  })
  .catch(err => {
    console.error('Dashboard error:', err);
    showError(
      'No se pudo cargar el archivo de scores.',
      err && err.message ? err.message : String(err)
    );
  });
