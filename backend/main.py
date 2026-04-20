"""
CreditIQ v3 — Backend API
Thin proxy/aggregator layer sitting between frontend and ML service.
Also loads cleaned_data.csv via SQLAlchemy for fast SQL-style queries.
"""

import os
from pathlib import Path
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

ML_SERVICE = os.getenv("ML_SERVICE_URL", "http://localhost:8001")

app = FastAPI(title="CreditIQ Backend v3", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data locally for fast filtering
DATA_PATH = Path(__file__).parent.parent / "ml-service" / "cleaned_data.csv"
_df = None

def get_df():
    global _df
    if _df is None:
        _df = pd.read_csv(DATA_PATH)
    return _df.copy()


# ── Proxy helpers ──────────────────────────────────────────────────────────────

async def proxy_get(path: str, params: dict = None):
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(f"{ML_SERVICE}{path}", params=params)
        r.raise_for_status()
        return r.json()


# ── Data / Analytics endpoints ─────────────────────────────────────────────────

@app.get("/api/data/summary")
async def summary():
    return await proxy_get("/data/summary")

@app.get("/api/data/columns")
async def columns():
    return await proxy_get("/data/columns")

@app.get("/api/data/sample")
async def sample(page: int = 1, page_size: int = 25,
                 state: str = "", risk: str = "", employment: str = "",
                 sort_col: str = "customer_id", sort_dir: str = "asc"):
    return await proxy_get("/data/sample", {
        "page": page, "page_size": page_size,
        "state": state, "risk": risk, "employment": employment,
        "sort_col": sort_col, "sort_dir": sort_dir,
    })

@app.get("/api/data/by-state")
async def by_state():
    return await proxy_get("/data/by-state")

@app.get("/api/data/by-employment")
async def by_employment():
    return await proxy_get("/data/by-employment")

@app.get("/api/data/risk-distribution")
async def risk_dist():
    return await proxy_get("/data/risk-distribution")

@app.get("/api/data/income-buckets")
async def income_buckets():
    return await proxy_get("/data/income-buckets")


# ── Chart endpoints (proxy to ML service) ─────────────────────────────────────

@app.get("/api/chart/histogram")
async def histogram(column: str, hue: str = "", bins: int = 30,
                    states: str = "", employment: str = ""):
    return await proxy_get("/chart/histogram", locals())

@app.get("/api/chart/boxplot")
async def boxplot(column: str, group_by: str = "risk_category",
                  states: str = "", employment: str = ""):
    return await proxy_get("/chart/boxplot", locals())

@app.get("/api/chart/scatter")
async def scatter(x: str, y: str, hue: str = "risk_category",
                  trendline: bool = True, states: str = "", employment: str = ""):
    return await proxy_get("/chart/scatter", locals())

@app.get("/api/chart/barplot")
async def barplot(column: str, metric: str = "count",
                  hue: str = "", states: str = "", employment: str = ""):
    return await proxy_get("/chart/barplot", locals())

@app.get("/api/chart/heatmap")
async def heatmap(states: str = "", employment: str = ""):
    return await proxy_get("/chart/heatmap", locals())

@app.get("/api/chart/pairplot")
async def pairplot(columns: str = "", hue: str = "risk_category",
                   states: str = "", employment: str = ""):
    return await proxy_get("/chart/pairplot", locals())

@app.get("/api/chart/state-comparison")
async def state_comparison(states: str, metric: str = "default_rate"):
    return await proxy_get("/chart/state-comparison", locals())

@app.get("/api/chart/feature-importance")
async def feature_importance():
    return await proxy_get("/chart/feature-importance")

@app.get("/api/chart/roc-curve")
async def roc_curve():
    return await proxy_get("/chart/roc-curve")

@app.get("/api/chart/confusion-matrix")
async def confusion_matrix():
    return await proxy_get("/chart/confusion-matrix")


# ── Model endpoints ─────────────────────────────────────────────────────────────

@app.post("/api/model/train")
async def train():
    return await proxy_get("/model/train")

@app.get("/api/model/status")
async def model_status():
    return await proxy_get("/model/status")


# ── Insights ────────────────────────────────────────────────────────────────────

@app.get("/api/insights")
async def insights():
    return await proxy_get("/insights")


@app.get("/")
def root():
    return {"service": "CreditIQ Backend v3", "status": "ok"}
