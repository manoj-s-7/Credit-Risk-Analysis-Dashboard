# CreditIQ v3 — Credit Risk Intelligence Platform

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

