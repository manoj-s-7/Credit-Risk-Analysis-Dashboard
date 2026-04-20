"""
CreditIQ v3 - ML Service
Generates charts server-side using matplotlib/seaborn, trains models,
produces AI insights, and serves all analytical endpoints.
"""

import io
import os
import sys
import json
import warnings
import base64
import traceback
from pathlib import Path
from typing import Optional, List

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from scipy import stats
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, roc_curve
)
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

warnings.filterwarnings("ignore")

# ── Seaborn / matplotlib global style ─────────────────────────────────────────
# Match exactly what seaborn/matplotlib produce natively
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({
    "figure.facecolor": "white",
    "axes.facecolor": "#f8f9fa",
    "axes.edgecolor": "#dee2e6",
    "axes.labelcolor": "#212529",
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "xtick.color": "#495057",
    "ytick.color": "#495057",
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "grid.color": "#e9ecef",
    "grid.linewidth": 0.8,
    "legend.fontsize": 10,
    "legend.framealpha": 0.9,
    "font.family": "DejaVu Sans",
})

BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR / "cleaned_data.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

# ── Load data ──────────────────────────────────────────────────────────────────
df_global: Optional[pd.DataFrame] = None

def load_data() -> pd.DataFrame:
    global df_global
    if df_global is None:
        df_global = pd.read_csv(DATA_PATH)
    return df_global.copy()

# ── Colour palettes matching seaborn defaults ──────────────────────────────────
SPECIES_PALETTE = {
    "Low":    "#4c72b0",   # seaborn blue
    "Medium": "#dd8452",   # seaborn orange
    "High":   "#55a868",   # seaborn green
}
EMPLOYMENT_COLORS = ["#4c72b0","#dd8452","#55a868","#c44e52","#8172b2"]
STATE_COLOR = "#4c72b0"
MUTED_PALETTE = sns.color_palette("muted")

# ── Helper: fig → base64 PNG ───────────────────────────────────────────────────
def fig_to_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return b64

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="CreditIQ ML Service", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════════
# DATA ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/data/columns")
def get_columns():
    df = load_data()
    numeric = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical = df.select_dtypes(exclude=[np.number]).columns.tolist()
    return {
        "all": df.columns.tolist(),
        "numeric": numeric,
        "categorical": categorical,
        "states": sorted(df["state"].dropna().unique().tolist()),
        "employment_types": sorted(df["employment_type"].dropna().unique().tolist()),
        "risk_categories": sorted(df["risk_category"].dropna().unique().tolist()),
        "shape": {"rows": len(df), "cols": len(df.columns)},
    }

@app.get("/data/sample")
def get_sample(page: int = 1, page_size: int = 25,
               state: str = "", risk: str = "", employment: str = "",
               sort_col: str = "customer_id", sort_dir: str = "asc"):
    df = load_data()
    if state:        df = df[df["state"] == state]
    if risk:         df = df[df["risk_category"] == risk]
    if employment:   df = df[df["employment_type"] == employment]
    if sort_col in df.columns:
        df = df.sort_values(sort_col, ascending=(sort_dir == "asc"))
    total = len(df)
    start = (page - 1) * page_size
    chunk = df.iloc[start: start + page_size]
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
        "data": chunk.fillna("").to_dict(orient="records"),
    }

@app.get("/data/summary")
def data_summary():
    df = load_data()
    total = len(df)
    defaults = int(df["default_history"].sum())
    eligible = int(df["loan_eligible"].sum())
    return {
        "total_customers": total,
        "avg_income": round(float(df["income"].mean()), 2),
        "avg_credit_score": round(float(df["credit_score"].mean()), 1),
        "avg_loan_amount": round(float(df["loan_amount"].mean()), 2),
        "overall_default_rate": round(defaults / max(total, 1) * 100, 2),
        "eligible_count": eligible,
        "ineligible_count": total - eligible,
        "eligible_pct": round(eligible / max(total, 1) * 100, 1),
        "high_risk_count": int((df["risk_category"] == "High").sum()),
        "medium_risk_count": int((df["risk_category"] == "Medium").sum()),
        "low_risk_count": int((df["risk_category"] == "Low").sum()),
        "avg_dti": round(float(df["debt_to_income_ratio"].mean()), 3),
        "states_count": int(df["state"].nunique()),
        "avg_repayment_score": round(float(df["repayment_history_score"].mean()), 1),
        "median_income": round(float(df["income"].median()), 2),
        "median_credit_score": round(float(df["credit_score"].median()), 1),
    }

@app.get("/data/by-state")
def by_state():
    df = load_data()
    grp = df.groupby("state").agg(
        count=("customer_id", "count"),
        avg_income=("income", "mean"),
        avg_credit_score=("credit_score", "mean"),
        avg_loan_amount=("loan_amount", "mean"),
        default_rate=("default_history", lambda x: round(x.mean() * 100, 2)),
        avg_dti=("debt_to_income_ratio", "mean"),
        eligible_rate=("loan_eligible", lambda x: round(x.mean() * 100, 2)),
    ).reset_index()
    grp = grp.sort_values("count", ascending=False)
    grp = grp.round({"avg_income": 2, "avg_credit_score": 1, "avg_loan_amount": 2, "avg_dti": 3})
    return grp.to_dict(orient="records")

@app.get("/data/by-employment")
def by_employment():
    df = load_data()
    grp = df.groupby("employment_type").agg(
        count=("customer_id", "count"),
        avg_income=("income", "mean"),
        avg_credit_score=("credit_score", "mean"),
        avg_loan_amount=("loan_amount", "mean"),
        default_rate=("default_history", lambda x: round(x.mean() * 100, 2)),
    ).reset_index().round(2)
    return grp.to_dict(orient="records")

@app.get("/data/risk-distribution")
def risk_distribution():
    df = load_data()
    total = len(df)
    grp = df.groupby("risk_category").size().reset_index(name="count")
    grp["percentage"] = (grp["count"] / total * 100).round(2)
    return grp.to_dict(orient="records")

@app.get("/data/income-buckets")
def income_buckets():
    df = load_data()
    bins  = [0, 25000, 50000, 100000, 200000, float("inf")]
    labels = ["< 25K", "25K–50K", "50K–1L", "1L–2L", "2L+"]
    df["bucket"] = pd.cut(df["income"], bins=bins, labels=labels, right=False)
    grp = df.groupby("bucket", observed=True).size().reset_index(name="count")
    return grp.to_dict(orient="records")

# ═══════════════════════════════════════════════════════════════════════════════
# CHART ENDPOINTS — server-side matplotlib/seaborn, returns base64 PNG
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/chart/histogram")
def chart_histogram(column: str, hue: str = "", bins: int = 30,
                    states: str = "", employment: str = ""):
    df = load_data()
    if states:
        df = df[df["state"].isin(states.split(","))]
    if employment:
        df = df[df["employment_type"].isin(employment.split(","))]
    if column not in df.columns:
        raise HTTPException(400, f"Column '{column}' not found")

    fig, ax = plt.subplots(figsize=(9, 5))
    if hue and hue in df.columns and hue != column:
        groups = df[hue].dropna().unique()
        palette = sns.color_palette("muted", len(groups))
        for i, g in enumerate(sorted(groups)):
            sub = df[df[hue] == g][column].dropna()
            ax.hist(sub, bins=bins, alpha=0.72, label=str(g),
                    color=palette[i], edgecolor="white", linewidth=0.4)
        ax.legend(title=hue, framealpha=0.9)
    else:
        ax.hist(df[column].dropna(), bins=bins,
                color=MUTED_PALETTE[0], edgecolor="white", linewidth=0.4, alpha=0.85)

    ax.set_xlabel(column.replace("_", " ").title())
    ax.set_ylabel("Count")
    ax.set_title(f"Distribution of {column.replace('_',' ').title()}")
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "histogram"}


@app.get("/chart/boxplot")
def chart_boxplot(column: str, group_by: str = "risk_category",
                  states: str = "", employment: str = ""):
    df = load_data()
    if states:    df = df[df["state"].isin(states.split(","))]
    if employment: df = df[df["employment_type"].isin(employment.split(","))]
    if column not in df.columns:
        raise HTTPException(400, f"Column '{column}' not found")

    fig, ax = plt.subplots(figsize=(9, 5))
    groups = sorted(df[group_by].dropna().unique()) if group_by in df.columns else []
    palette = sns.color_palette("muted", max(len(groups), 1))

    if groups:
        data_list = [df[df[group_by] == g][column].dropna().values for g in groups]
        bp = ax.boxplot(data_list, patch_artist=True, notch=False,
                        medianprops=dict(color="black", linewidth=1.5),
                        flierprops=dict(marker="o", markerfacecolor="#adb5bd",
                                        markersize=3, alpha=0.5))
        for patch, color in zip(bp["boxes"], palette):
            patch.set_facecolor(color)
            patch.set_alpha(0.75)
        ax.set_xticklabels(groups, fontsize=10)
        ax.set_xlabel(group_by.replace("_", " ").title())
    else:
        ax.boxplot(df[column].dropna().values, patch_artist=True,
                   medianprops=dict(color="black", linewidth=1.5))

    ax.set_ylabel(column.replace("_", " ").title())
    ax.set_title(f"{column.replace('_',' ').title()} by {group_by.replace('_',' ').title()}")
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "boxplot"}


@app.get("/chart/scatter")
def chart_scatter(x: str, y: str, hue: str = "risk_category",
                  trendline: bool = True,
                  states: str = "", employment: str = ""):
    df = load_data()
    if states:    df = df[df["state"].isin(states.split(","))]
    if employment: df = df[df["employment_type"].isin(employment.split(","))]
    if x not in df.columns or y not in df.columns:
        raise HTTPException(400, "Column not found")

    sample = df.sample(min(1500, len(df)), random_state=42)
    fig, ax = plt.subplots(figsize=(9, 5.5))

    if hue and hue in sample.columns:
        groups = sorted(sample[hue].dropna().unique())
        palette = sns.color_palette("muted", len(groups))
        for i, g in enumerate(groups):
            sub = sample[sample[hue] == g]
            ax.scatter(sub[x], sub[y], label=str(g), alpha=0.6,
                       color=palette[i], s=22, edgecolors="none")
            if trendline and len(sub) > 5:
                try:
                    xv = sub[x].dropna()
                    yv = sub[y].dropna()
                    common = xv.index.intersection(yv.index)
                    m, b, *_ = stats.linregress(xv[common], yv[common])
                    xr = np.linspace(xv.min(), xv.max(), 100)
                    ax.plot(xr, m * xr + b, color=palette[i], linewidth=1.2,
                            alpha=0.9, linestyle="--")
                except Exception:
                    pass
        ax.legend(title=hue.replace("_", " ").title(), framealpha=0.9)
    else:
        ax.scatter(sample[x], sample[y], alpha=0.55,
                   color=MUTED_PALETTE[0], s=22, edgecolors="none")
        if trendline:
            try:
                xv, yv = sample[x].dropna(), sample[y].dropna()
                common = xv.index.intersection(yv.index)
                m, b, *_ = stats.linregress(xv[common], yv[common])
                xr = np.linspace(xv.min(), xv.max(), 100)
                ax.plot(xr, m * xr + b, color="#c44e52", linewidth=1.5, linestyle="--")
            except Exception:
                pass

    ax.set_xlabel(x.replace("_", " ").title())
    ax.set_ylabel(y.replace("_", " ").title())
    ax.set_title(f"{x.replace('_',' ').title()} vs {y.replace('_',' ').title()}")
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "scatter"}


@app.get("/chart/barplot")
def chart_barplot(column: str, metric: str = "count",
                  hue: str = "", states: str = "", employment: str = ""):
    df = load_data()
    if states:    df = df[df["state"].isin(states.split(","))]
    if employment: df = df[df["employment_type"].isin(employment.split(","))]
    if column not in df.columns:
        raise HTTPException(400, f"Column '{column}' not found")

    fig, ax = plt.subplots(figsize=(10, 5))

    if metric == "count":
        grp = df[column].value_counts().reset_index()
        grp.columns = [column, "value"]
    elif metric == "mean" and hue in df.columns:
        grp = df.groupby(column)[hue].mean().reset_index()
        grp.columns = [column, "value"]
    elif metric == "default_rate":
        grp = df.groupby(column)["default_history"].mean().reset_index()
        grp["value"] = grp["default_history"] * 100
        grp = grp[[column, "value"]]
    else:
        grp = df[column].value_counts().reset_index()
        grp.columns = [column, "value"]

    grp = grp.sort_values("value", ascending=False).head(20)
    palette = sns.color_palette("muted", len(grp))
    bars = ax.bar(grp[column].astype(str), grp["value"], color=palette, alpha=0.85,
                  edgecolor="white", linewidth=0.5)

    # Value labels
    for bar in bars:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2, h + h * 0.01,
                f"{h:.1f}" if metric != "count" else f"{int(h):,}",
                ha="center", va="bottom", fontsize=8, color="#495057")

    ax.set_xlabel(column.replace("_", " ").title())
    ax.set_ylabel(metric.replace("_", " ").title())
    ax.set_title(f"{metric.replace('_',' ').title()} by {column.replace('_',' ').title()}")
    plt.xticks(rotation=35, ha="right")
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "barplot"}


@app.get("/chart/heatmap")
def chart_heatmap(states: str = "", employment: str = ""):
    df = load_data()
    if states:    df = df[df["state"].isin(states.split(","))]
    if employment: df = df[df["employment_type"].isin(employment.split(","))]

    num_cols = [
        "income", "credit_score", "loan_amount", "loan_tenure",
        "existing_loans_count", "outstanding_debt", "repayment_history_score",
        "default_history", "monthly_expenses", "debt_to_income_ratio", "loan_eligible"
    ]
    num_cols = [c for c in num_cols if c in df.columns]
    corr = df[num_cols].corr()

    # Rename for readability
    rename = {
        "income": "Income", "credit_score": "Credit Score",
        "loan_amount": "Loan Amt", "loan_tenure": "Tenure",
        "existing_loans_count": "Loans#", "outstanding_debt": "Debt",
        "repayment_history_score": "Repayment", "default_history": "Default",
        "monthly_expenses": "Expenses", "debt_to_income_ratio": "DTI",
        "loan_eligible": "Eligible"
    }
    corr.rename(index=rename, columns=rename, inplace=True)

    fig, ax = plt.subplots(figsize=(11, 9))
    mask = np.zeros_like(corr, dtype=bool)
    mask[np.triu_indices_from(mask)] = True  # upper triangle masked

    sns.heatmap(
        corr,
        mask=mask,
        ax=ax,
        annot=True,
        fmt=".2f",
        cmap="RdYlBu_r",
        center=0,
        vmin=-1, vmax=1,
        linewidths=0.5,
        linecolor="white",
        cbar_kws={"shrink": 0.8, "label": "Pearson r"},
        annot_kws={"size": 9},
        square=True,
    )
    ax.set_title("Correlation Heatmap — Numeric Features", fontsize=13, pad=12)
    plt.xticks(rotation=40, ha="right", fontsize=9)
    plt.yticks(rotation=0, fontsize=9)
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "heatmap"}


@app.get("/chart/pairplot")
def chart_pairplot(columns: str = "", hue: str = "risk_category",
                   states: str = "", employment: str = ""):
    df = load_data()
    if states:    df = df[df["state"].isin(states.split(","))]
    if employment: df = df[df["employment_type"].isin(employment.split(","))]

    default_cols = ["income", "credit_score", "loan_amount", "debt_to_income_ratio"]
    col_list = [c.strip() for c in columns.split(",") if c.strip()] if columns else default_cols
    col_list = [c for c in col_list if c in df.columns and df[c].dtype != object][:5]

    sample = df.sample(min(600, len(df)), random_state=42)

    palette = sns.color_palette("muted")
    hue_col = hue if hue in sample.columns else None

    # Build the grid manually so it looks identical to seaborn pairplot
    n = len(col_list)
    fig, axes = plt.subplots(n, n, figsize=(3 * n, 3 * n))
    if n == 1:
        axes = np.array([[axes]])

    groups = sorted(sample[hue_col].dropna().unique()) if hue_col else [None]
    colors = {g: palette[i % len(palette)] for i, g in enumerate(groups)}

    for row, ycol in enumerate(col_list):
        for col, xcol in enumerate(col_list):
            ax = axes[row][col]
            if row == col:
                # Diagonal: histogram per group
                for g in groups:
                    sub = sample[sample[hue_col] == g][xcol].dropna() if hue_col and g else sample[xcol].dropna()
                    ax.bar(*np.unique(
                        np.histogram(sub, bins=18)[0],
                        return_index=False,
                    ) if False else (
                        (lambda h: (
                            [(h[1][k] + h[1][k+1])/2 for k in range(len(h[0]))],
                            h[0]
                        ))(np.histogram(sub, bins=18))
                    ),
                    width=(sub.max()-sub.min())/18 if sub.max()!=sub.min() else 1,
                    color=colors.get(g, palette[0]), alpha=0.65, edgecolor="white",
                    linewidth=0.3)
            else:
                # Off-diagonal: scatter
                for g in groups:
                    if hue_col and g is not None:
                        sub = sample[sample[hue_col] == g]
                    else:
                        sub = sample
                    ax.scatter(sub[xcol], sub[ycol],
                               color=colors.get(g, palette[0]),
                               s=6, alpha=0.55, edgecolors="none")

            # Labels only on edges
            if row == n - 1:
                ax.set_xlabel(xcol.replace("_", "\n"), fontsize=8)
            else:
                ax.set_xlabel("")
                ax.set_xticklabels([])
            if col == 0:
                ax.set_ylabel(ycol.replace("_", "\n"), fontsize=8)
            else:
                ax.set_ylabel("")
                ax.set_yticklabels([])

            ax.tick_params(labelsize=7)
            ax.set_facecolor("#f8f9fa")

    # Legend
    if hue_col:
        from matplotlib.lines import Line2D
        handles = [Line2D([0],[0], marker="o", color="w", markerfacecolor=colors[g],
                          markersize=8, label=str(g)) for g in groups]
        fig.legend(handles=handles, title=hue_col.replace("_"," ").title(),
                   loc="upper right", fontsize=9, framealpha=0.9,
                   bbox_to_anchor=(1.0, 1.0))

    fig.suptitle(f"Pair Plot — {', '.join(col_list)}", y=1.01, fontsize=12)
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "pairplot"}


@app.get("/chart/state-comparison")
def chart_state_comparison(states: str, metric: str = "default_rate"):
    df = load_data()
    state_list = [s.strip() for s in states.split(",") if s.strip()]
    if not state_list:
        raise HTTPException(400, "Provide at least one state")

    df_f = df[df["state"].isin(state_list)]
    metric_map = {
        "default_rate": ("default_history", lambda x: x.mean() * 100, "Default Rate (%)"),
        "avg_income": ("income", "mean", "Avg Income (INR)"),
        "avg_credit_score": ("credit_score", "mean", "Avg Credit Score"),
        "avg_loan": ("loan_amount", "mean", "Avg Loan Amount (INR)"),
        "avg_dti": ("debt_to_income_ratio", "mean", "Avg Debt-to-Income Ratio"),
        "eligible_rate": ("loan_eligible", lambda x: x.mean() * 100, "Eligible Rate (%)"),
    }
    col, agg, ylabel = metric_map.get(metric, ("default_history", lambda x: x.mean() * 100, metric))
    grp = df_f.groupby("state")[col].agg(agg).reset_index()
    grp.columns = ["state", "value"]
    grp = grp.sort_values("value", ascending=False)

    fig, ax = plt.subplots(figsize=(max(7, len(state_list) * 1.2), 5))
    palette = sns.color_palette("muted", len(grp))
    bars = ax.bar(grp["state"], grp["value"], color=palette, alpha=0.85,
                  edgecolor="white", linewidth=0.5)
    for bar in bars:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2, h + h * 0.01,
                f"{h:.1f}", ha="center", va="bottom", fontsize=9)
    ax.set_ylabel(ylabel)
    ax.set_title(f"State Comparison — {ylabel}")
    plt.xticks(rotation=30, ha="right")
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "state_comparison"}


@app.get("/chart/feature-importance")
def chart_feature_importance():
    model_path = MODEL_DIR / "random_forest.pkl"
    if not model_path.exists():
        raise HTTPException(404, "Model not trained yet. Run /model/train first.")
    bundle = joblib.load(model_path)
    model = bundle["model"]
    features = bundle["features"]
    importances = model.feature_importances_
    fi = pd.Series(importances, index=features).sort_values(ascending=True)

    fig, ax = plt.subplots(figsize=(9, 6))
    colors = sns.color_palette("muted", len(fi))
    bars = ax.barh(fi.index, fi.values, color=colors[::-1], alpha=0.85, edgecolor="white")
    for bar in bars:
        w = bar.get_width()
        ax.text(w + 0.002, bar.get_y() + bar.get_height() / 2,
                f"{w:.3f}", va="center", fontsize=9)
    ax.set_xlabel("Feature Importance (Gini Impurity Reduction)")
    ax.set_title("Random Forest — Feature Importance")
    ax.set_xlim(0, fi.max() * 1.18)
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "feature_importance"}


@app.get("/chart/roc-curve")
def chart_roc_curve():
    model_path = MODEL_DIR / "random_forest.pkl"
    if not model_path.exists():
        raise HTTPException(404, "Model not trained yet.")
    bundle = joblib.load(model_path)
    fpr, tpr, auc_val = bundle["roc_fpr"], bundle["roc_tpr"], bundle["auc"]

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot(fpr, tpr, color="#4c72b0", lw=2, label=f"ROC curve (AUC = {auc_val:.3f})")
    ax.plot([0,1],[0,1], color="#adb5bd", linestyle="--", lw=1, label="Random classifier")
    ax.fill_between(fpr, tpr, alpha=0.1, color="#4c72b0")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve — Loan Eligibility Prediction")
    ax.legend(framealpha=0.9)
    ax.set_xlim([0,1]); ax.set_ylim([0,1.02])
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "roc"}


@app.get("/chart/confusion-matrix")
def chart_confusion_matrix():
    model_path = MODEL_DIR / "random_forest.pkl"
    if not model_path.exists():
        raise HTTPException(404, "Model not trained yet.")
    bundle = joblib.load(model_path)
    cm = bundle["confusion_matrix"]
    labels = bundle["class_labels"]

    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax,
                xticklabels=labels, yticklabels=labels,
                cbar=False, linewidths=0.5, linecolor="white",
                annot_kws={"size": 13})
    ax.set_xlabel("Predicted Label")
    ax.set_ylabel("True Label")
    ax.set_title("Confusion Matrix")
    fig.tight_layout()
    return {"image": fig_to_b64(fig), "type": "confusion_matrix"}


# ═══════════════════════════════════════════════════════════════════════════════
# MODEL TRAINING & INFERENCE
# ═══════════════════════════════════════════════════════════════════════════════

FEATURES = [
    "income", "credit_score", "loan_amount", "loan_tenure",
    "existing_loans_count", "outstanding_debt", "repayment_history_score",
    "default_history", "monthly_expenses", "debt_to_income_ratio",
]
EMP_ENCODER = LabelEncoder()

def _prepare(df: pd.DataFrame):
    df = df.copy()
    df["emp_enc"] = EMP_ENCODER.fit_transform(df["employment_type"].fillna("Salaried"))
    feats = FEATURES + ["emp_enc"]
    X = df[feats].fillna(0)
    y = df["loan_eligible"].astype(int)
    return X, y, feats


@app.post("/model/train")
def train_model():
    try:
        df = load_data()
        X, y, feats = _prepare(df)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y)

        rf = RandomForestClassifier(n_estimators=200, max_depth=12,
                                     class_weight="balanced", random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        y_pred = rf.predict(X_test)
        y_prob = rf.predict_proba(X_test)[:, 1]

        fpr, tpr, _ = roc_curve(y_test, y_prob)
        auc = roc_auc_score(y_test, y_prob)
        cm = confusion_matrix(y_test, y_pred)
        report = classification_report(y_test, y_pred, output_dict=True)

        bundle = {
            "model": rf, "features": feats,
            "roc_fpr": fpr.tolist(), "roc_tpr": tpr.tolist(),
            "auc": float(auc),
            "confusion_matrix": cm.tolist(),
            "class_labels": [str(c) for c in rf.classes_],
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "report": report,
        }
        joblib.dump(bundle, MODEL_DIR / "random_forest.pkl")

        return {
            "status": "success",
            "accuracy": bundle["accuracy"],
            "auc": bundle["auc"],
            "report": report,
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/model/status")
def model_status():
    path = MODEL_DIR / "random_forest.pkl"
    if not path.exists():
        return {"trained": False}
    bundle = joblib.load(path)
    return {
        "trained": True,
        "accuracy": bundle.get("accuracy"),
        "auc": bundle.get("auc"),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# AI INSIGHTS ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/insights")
def generate_insights():
    df = load_data()
    insights = []

    # 1. Income vs default
    low_inc = df[df["income"] < df["income"].quantile(0.33)]["default_history"].mean() * 100
    high_inc = df[df["income"] > df["income"].quantile(0.66)]["default_history"].mean() * 100
    insights.append({
        "category": "Income Risk",
        "icon": "trending-down",
        "color": "red",
        "title": "Low-income applicants carry significantly higher default risk",
        "detail": f"Customers earning below the bottom 33rd percentile default at {low_inc:.1f}% vs {high_inc:.1f}% for top earners — a {low_inc/max(high_inc,0.01):.1f}x gap.",
        "metric": f"{low_inc:.1f}% vs {high_inc:.1f}%",
    })

    # 2. Credit score correlation
    corr_val = df["credit_score"].corr(df["loan_eligible"])
    insights.append({
        "category": "Credit Score",
        "icon": "award",
        "color": "blue",
        "title": "Credit score is the strongest predictor of loan eligibility",
        "detail": f"Correlation with eligibility: {corr_val:.3f}. Applicants with score > 700 have {df[df['credit_score']>700]['loan_eligible'].mean()*100:.1f}% eligibility rate vs {df[df['credit_score']<550]['loan_eligible'].mean()*100:.1f}% below 550.",
        "metric": f"r = {corr_val:.3f}",
    })

    # 3. Highest default state
    state_def = df.groupby("state")["default_history"].mean() * 100
    worst = state_def.idxmax()
    best = state_def.idxmin()
    insights.append({
        "category": "Geography",
        "icon": "map-pin",
        "color": "orange",
        "title": f"{worst} has the highest default rate among all states",
        "detail": f"{worst}: {state_def[worst]:.1f}% default rate. Best: {best} at {state_def[best]:.1f}%. Regional economic factors and income levels are key drivers.",
        "metric": f"{state_def[worst]:.1f}% default",
    })

    # 4. DTI risk
    high_dti = df[df["debt_to_income_ratio"] > 3]["default_history"].mean() * 100
    low_dti = df[df["debt_to_income_ratio"] < 1]["default_history"].mean() * 100
    insights.append({
        "category": "Debt Risk",
        "icon": "alert-triangle",
        "color": "amber",
        "title": "High debt-to-income ratio (>3x) dramatically increases default probability",
        "detail": f"DTI > 3x results in {high_dti:.1f}% default rate vs {low_dti:.1f}% for DTI < 1x. Recommend hard cap at 2.5x for new loan approvals.",
        "metric": f"{high_dti:.1f}% vs {low_dti:.1f}%",
    })

    # 5. Employment type
    emp_def = df.groupby("employment_type")["default_history"].mean() * 100
    safest = emp_def.idxmin()
    riskiest = emp_def.idxmax()
    insights.append({
        "category": "Employment",
        "icon": "briefcase",
        "color": "green",
        "title": f"{safest} employees are the most creditworthy segment",
        "detail": f"{safest} workers: {emp_def[safest]:.1f}% default rate. {riskiest}: {emp_def[riskiest]:.1f}%. Stable income sources strongly correlate with repayment ability.",
        "metric": f"{emp_def[safest]:.1f}% default",
    })

    # 6. Repayment history
    corr_rep = df["repayment_history_score"].corr(df["loan_eligible"])
    insights.append({
        "category": "Repayment",
        "icon": "check-circle",
        "color": "teal",
        "title": "Strong repayment history is a reliable eligibility signal",
        "detail": f"Correlation of repayment score with eligibility: {corr_rep:.3f}. Applicants with score > 80 have {df[df['repayment_history_score']>80]['loan_eligible'].mean()*100:.1f}% approval rate.",
        "metric": f"r = {corr_rep:.3f}",
    })

    # 7. Existing loans
    multi = df[df["existing_loans_count"] > 2]["default_history"].mean() * 100
    none = df[df["existing_loans_count"] == 0]["default_history"].mean() * 100
    insights.append({
        "category": "Loan Burden",
        "icon": "layers",
        "color": "purple",
        "title": "Multiple existing loans are a strong red flag",
        "detail": f"Applicants with > 2 active loans default at {multi:.1f}% vs {none:.1f}% for those with none. Existing debt obligations significantly strain repayment capacity.",
        "metric": f"{multi:.1f}% vs {none:.1f}%",
    })

    # 8. Eligible vs ineligible summary
    elig_pct = df["loan_eligible"].mean() * 100
    insights.append({
        "category": "Portfolio",
        "icon": "pie-chart",
        "color": "indigo",
        "title": f"Only {elig_pct:.1f}% of applicants qualify for loan approval",
        "detail": f"Of {len(df):,} applicants, {int(df['loan_eligible'].sum()):,} are eligible. The high rejection rate points to widespread credit quality issues in the applicant pool.",
        "metric": f"{elig_pct:.1f}% eligible",
    })

    return {"insights": insights}


@app.get("/")
def root():
    return {"service": "CreditIQ ML Service v3", "status": "running"}
