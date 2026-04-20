# CreditIQ v3 — Credit Risk Intelligence Platform

**Fintech-grade credit risk analysis with server-side matplotlib/seaborn charts**

---

## What's Fixed in v3

| Issue | Fix |
|---|---|
| Heatmap broken | Rebuilt with seaborn `heatmap()` — lower-triangle, `RdYlBu_r`, annotated values |
| Pairplot not matching reference | Custom grid matching seaborn pairplot exactly — histograms on diagonal, scatter off-diagonal, legend top-right |
| Chart colour inconsistencies | All charts use unified seaborn `muted` palette |
| `UnicodeEncodeError` (cp1252) | All emoji/unicode removed from Python print statements |
| AI Insights always errors | Insights now computed from CSV directly — no model dependency |
| Credit Risk Predictor | Removed entirely as requested |
| Charts not seaborn style | All charts rendered server-side with native matplotlib/seaborn |

---

## Architecture

```
creditiq-v3/
├── ml-service/           # Python FastAPI — all chart generation + ML
│   ├── main.py           # 15 endpoints: charts, data, insights, model
│   ├── requirements.txt
│   ├── cleaned_data.csv
│   └── models/           # trained model saved here
├── backend/              # Python FastAPI — thin proxy layer
│   ├── main.py
│   └── requirements.txt
├── frontend/             # Next.js 14 — light fintech UI
│   └── src/
│       ├── app/          # page.tsx, layout.tsx, globals.css
│       ├── components/
│       │   ├── layout/   # Sidebar
│       │   └── ui/       # All tab components
│       └── lib/api.ts
├── start.bat             # Windows one-click startup
├── start.sh              # Mac/Linux one-click startup
└── README.md
```

---

## Quick Start

### Requirements
- Python 3.10+
- Node.js 18+

---

### Step 1 — ML Service (port 8001)

```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn main:app --port 8001 --reload
```

Verify: http://localhost:8001

---

### Step 2 — Backend API (port 8000)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
```

Verify: http://localhost:8000/docs

---

### Step 3 — Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

### Windows one-click (Step 1 + 2)

```
Double-click start.bat
```

Then manually run `npm run dev` in frontend/.

---

## Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **Portfolio Overview** | 6 KPI cards, credit score histogram, default by state/employment, state table, mini bar rankings |
| **Data Analyzer** | Pick chart type → configure columns → Generate. Histogram, Boxplot, Scatter, Barplot, Heatmap, Pairplot |
| **State Analysis** | Multi-select states, choose metric, compare with clean bar chart + ranking table |
| **AI Insights** | 8 auto-generated statistical insights — expandable cards, no external API needed |
| **Model Performance** | Train RF, view accuracy/AUC, classification report, feature importance, ROC curve, confusion matrix |
| **Data Explorer** | 25-row paginated table, filter by state/risk/employment, sortable columns, column selector |

---

## Chart Endpoints (ML Service)

| Endpoint | Description |
|----------|-------------|
| `GET /chart/histogram?column=&hue=&bins=` | Distribution histogram |
| `GET /chart/boxplot?column=&group_by=` | Box plot by group |
| `GET /chart/scatter?x=&y=&hue=&trendline=` | Scatter with trend lines |
| `GET /chart/barplot?column=&metric=` | Bar chart |
| `GET /chart/heatmap` | Correlation heatmap |
| `GET /chart/pairplot?columns=&hue=` | Pair plot grid |
| `GET /chart/state-comparison?states=&metric=` | State comparison bar |
| `GET /chart/feature-importance` | RF feature importance |
| `GET /chart/roc-curve` | ROC curve |
| `GET /chart/confusion-matrix` | Confusion matrix |

All chart endpoints return `{ "image": "<base64 PNG>", "type": "..." }`.

---

## Notes on Chart Style

Charts use exactly the same styling as running matplotlib/seaborn locally:

```python
sns.set_theme(style="whitegrid", palette="muted")
```

- **Background**: `#f8f9fa` axes, `white` figure
- **Palette**: seaborn `muted` (blue, orange, green, red, purple…)
- **Heatmap**: `RdYlBu_r`, lower triangle only, annotated
- **Pairplot**: histograms on diagonal, scatter off-diagonal, per-group colours
