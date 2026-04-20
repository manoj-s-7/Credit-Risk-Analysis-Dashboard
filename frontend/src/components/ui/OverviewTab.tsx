'use client'
import { useEffect, useState, useCallback } from 'react'
import KpiCard from '@/components/ui/KpiCard'
import ChartPanel from '@/components/ui/ChartPanel'
import {
  fetchSummary, fetchRiskDist, fetchByState, fetchByEmployment, fetchIncomeBuckets,
  fetchHistogram, fetchBarplot, fetchHeatmap,
  fmtINR, fmtNum, fmtPct
} from '@/lib/api'

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-ink-500 w-28 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-ink-700 w-14 text-right">{value.toFixed(1)}%</span>
    </div>
  )
}

export default function OverviewTab() {
  const [summary, setSummary] = useState<Record<string, number> | null>(null)
  const [riskDist, setRiskDist] = useState<{ risk_category: string; count: number; percentage: number }[]>([])
  const [stateData, setStateData] = useState<Record<string, number>[]>([])
  const [empData, setEmpData] = useState<Record<string, number>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchSummary(), fetchRiskDist(), fetchByState(), fetchByEmployment()])
      .then(([s, r, st, em]) => {
        setSummary(s); setRiskDist(r); setStateData(st); setEmpData(em)
      })
      .catch(() => setError('Cannot connect to API. Ensure both services are running.'))
      .finally(() => setLoading(false))
  }, [])

  const histFn = useCallback(
    () => fetchHistogram({ column: 'credit_score', hue: 'risk_category', bins: 30 }),
    []
  )
  const barFn = useCallback(
    () => fetchBarplot({ column: 'state', metric: 'default_rate' }),
    []
  )
  const empBarFn = useCallback(
    () => fetchBarplot({ column: 'employment_type', metric: 'default_rate' }),
    []
  )
  const incFn = useCallback(
    () => fetchHistogram({ column: 'income', bins: 35 }),
    []
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p className="text-sm text-ink-400">Loading dashboard…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="card p-8 text-center max-w-md mx-auto mt-12">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
      </div>
      <p className="font-semibold text-ink-900 mb-2">API Connection Error</p>
      <p className="text-sm text-ink-500">{error}</p>
      <p className="text-xs text-ink-300 mt-3">Start ML service on :8001 and backend on :8000</p>
    </div>
  )

  const eligible = summary ? Math.round((summary.eligible_count / summary.total_customers) * 100) : 0
  const topDefaultState = stateData.sort((a, b) => b.default_rate - a.default_rate)[0]
  const topSafeState = [...stateData].sort((a, b) => a.default_rate - b.default_rate)[0]
  const maxDefault = Math.max(...stateData.slice(0, 8).map(s => s.default_rate))

  return (
    <div className="space-y-7">

      {/* ── KPI Strip ── */}
      <div>
        <SectionTitle title="Portfolio Summary" sub="Aggregate metrics across 6,500 Indian credit applicants" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Total Applicants" value={fmtNum(summary!.total_customers)} sub="Across 20 states" color="blue"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
          <KpiCard label="Avg Annual Income" value={fmtINR(summary!.avg_income)} sub="Gross (INR)" color="green"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          />
          <KpiCard label="Avg Credit Score" value={Math.round(summary!.avg_credit_score)} sub="CIBIL range 300–900" color="purple"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          />
          <KpiCard label="Avg Loan Amount" value={fmtINR(summary!.avg_loan_amount)} sub="Per applicant" color="teal"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
          />
          <KpiCard label="Default Rate" value={fmtPct(summary!.overall_default_rate)} sub="Historical defaults" color="red"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>}
          />
          <KpiCard label="Loan Eligible" value={`${eligible}%`} sub={`${fmtNum(summary!.eligible_count)} qualified`} color="green"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
          />
        </div>
      </div>

      {/* ── Secondary KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Low Risk', value: fmtNum(summary!.low_risk_count), pct: fmtPct(summary!.low_risk_count / summary!.total_customers * 100), color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Medium Risk', value: fmtNum(summary!.medium_risk_count), pct: fmtPct(summary!.medium_risk_count / summary!.total_customers * 100), color: '#d97706', bg: '#fffbeb' },
          { label: 'High Risk', value: fmtNum(summary!.high_risk_count), pct: fmtPct(summary!.high_risk_count / summary!.total_customers * 100), color: '#dc2626', bg: '#fff1f2' },
          { label: 'Avg DTI Ratio', value: summary!.avg_dti?.toFixed(2) + '×', pct: 'Debt / Income', color: '#7c3aed', bg: '#faf5ff' },
        ].map(item => (
          <div key={item.label} className="card p-4" style={{ borderLeft: `3px solid ${item.color}` }}>
            <p className="text-xs text-ink-500 mb-1">{item.label}</p>
            <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
            <p className="text-xs text-ink-400 mt-1">{item.pct}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1 ── */}
      <div>
        <SectionTitle title="Credit Score Distribution by Risk Category" sub="Seaborn-style histogram — how credit scores spread across Low / Medium / High risk groups" />
        <ChartPanel
          title="Credit Score Distribution"
          sub="Grouped by risk category"
          fetchFn={histFn}
          height="340px"
        />
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Default Rate by State"
          sub="Top states ranked by historical default percentage"
          fetchFn={barFn}
          height="300px"
        />
        <ChartPanel
          title="Default Rate by Employment Type"
          sub="Which employment segments carry highest default risk"
          fetchFn={empBarFn}
          height="300px"
        />
      </div>

      {/* ── Income Distribution ── */}
      <ChartPanel
        title="Annual Income Distribution"
        sub="Spread of applicant incomes — seaborn histogram"
        fetchFn={incFn}
        height="300px"
      />

      {/* ── State analysis table ── */}
      <div>
        <SectionTitle title="State-wise Performance" sub="Top 10 states ranked by applicant volume" />
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                {['State', 'Applicants', 'Avg Income', 'Avg Credit Score', 'Default Rate', 'Eligible Rate', 'Avg DTI'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stateData.slice(0, 10).map((s, i) => (
                <tr key={i}>
                  <td className="font-medium text-ink-900">{String(s.state)}</td>
                  <td>{fmtNum(Number(s.count))}</td>
                  <td>{fmtINR(Number(s.avg_income))}</td>
                  <td>
                    <span style={{ color: Number(s.avg_credit_score) >= 650 ? '#16a34a' : Number(s.avg_credit_score) >= 550 ? '#d97706' : '#dc2626' }}>
                      {Number(s.avg_credit_score).toFixed(0)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${Number(s.default_rate) > 30 ? 'badge-high' : Number(s.default_rate) > 20 ? 'badge-medium' : 'badge-low'}`}>
                      {Number(s.default_rate).toFixed(1)}%
                    </span>
                  </td>
                  <td>{Number(s.eligible_rate).toFixed(1)}%</td>
                  <td className="font-mono text-xs">{Number(s.avg_dti).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Key stats callout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          {
            title: 'Highest Default State',
            value: topDefaultState ? String(topDefaultState.state) : '—',
            metric: topDefaultState ? `${Number(topDefaultState.default_rate).toFixed(1)}% default rate` : '',
            color: '#dc2626', bg: '#fff1f2', border: '#fecaca',
            icon: '⚠️',
          },
          {
            title: 'Safest State',
            value: topSafeState ? String(topSafeState.state) : '—',
            metric: topSafeState ? `${Number(topSafeState.default_rate).toFixed(1)}% default rate` : '',
            color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',
            icon: '✅',
          },
          {
            title: 'Approval Rate',
            value: `${eligible}%`,
            metric: `${fmtNum(summary!.ineligible_count || summary!.total_customers - summary!.eligible_count)} rejected`,
            color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
            icon: '📊',
          },
        ].map(c => (
          <div key={c.title} className="rounded-xl p-4" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{c.icon}</span>
              <p className="text-xs font-medium text-ink-500">{c.title}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-ink-400 mt-1">{c.metric}</p>
          </div>
        ))}
      </div>

      {/* ── Top default states mini bar ── */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-ink-900 mb-1">Default Rate — Top 8 States</h3>
        <p className="text-xs text-ink-400 mb-4">Ranked highest to lowest</p>
        <div className="space-y-0.5">
          {stateData
            .sort((a, b) => Number(b.default_rate) - Number(a.default_rate))
            .slice(0, 8)
            .map(s => (
              <MiniBar
                key={String(s.state)}
                label={String(s.state)}
                value={Number(s.default_rate)}
                max={maxDefault}
                color={Number(s.default_rate) > 30 ? '#ef4444' : Number(s.default_rate) > 20 ? '#f59e0b' : '#10b981'}
              />
            ))}
        </div>
      </div>

    </div>
  )
}
