'use client'
import { useEffect, useState, useCallback } from 'react'
import { fetchColumns, fetchByState, fetchStateComparison, fmtINR, fmtNum } from '@/lib/api'

const METRICS = [
  { value: 'default_rate',     label: 'Default Rate (%)',     color: '#ef4444' },
  { value: 'avg_income',       label: 'Avg Income',            color: '#3b82f6' },
  { value: 'avg_credit_score', label: 'Avg Credit Score',      color: '#7c3aed' },
  { value: 'avg_loan',         label: 'Avg Loan Amount',       color: '#0d9488' },
  { value: 'avg_dti',          label: 'Avg Debt/Income Ratio', color: '#d97706' },
  { value: 'eligible_rate',    label: 'Eligible Rate (%)',      color: '#16a34a' },
]

export default function StateAnalysisTab() {
  const [allStates, setAllStates] = useState<string[]>([])
  const [selStates, setSelStates] = useState<string[]>(['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh'])
  const [metric, setMetric] = useState('default_rate')
  const [img, setImg] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stateData, setStateData] = useState<Record<string, number>[]>([])
  const [showDD, setShowDD] = useState(false)

  useEffect(() => {
    fetchColumns().then(c => setAllStates(c.states || []))
    fetchByState().then(setStateData)
  }, [])

  function toggle(s: string) {
    setSelStates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function generate() {
    if (selStates.length < 1) { setError('Select at least 1 state'); return }
    setLoading(true); setError(''); setImg('')
    try {
      const r = await fetchStateComparison({ states: selStates.join(','), metric })
      setImg(r.image)
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Error')
    } finally { setLoading(false) }
  }

  const metaMap: Record<string, (v: number) => string> = {
    default_rate: v => `${v.toFixed(1)}%`,
    avg_income: v => fmtINR(v),
    avg_credit_score: v => v.toFixed(0),
    avg_loan: v => fmtINR(v),
    avg_dti: v => v.toFixed(2),
    eligible_rate: v => `${v.toFixed(1)}%`,
  }
  const currentMeta = METRICS.find(m => m.value === metric)!
  const selData = stateData.filter(s => selStates.includes(String(s.state)))
  const metricKey: Record<string, string> = {
    default_rate: 'default_rate', avg_income: 'avg_income',
    avg_credit_score: 'avg_credit_score', avg_loan: 'avg_loan_amount',
    avg_dti: 'avg_dti', eligible_rate: 'eligible_rate',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-ink-900">State-wise Analysis</h2>
        <p className="text-xs text-ink-400 mt-0.5">
          Select states and a metric — compare side-by-side with clean bar charts
        </p>
      </div>

      {/* Controls */}
      <div className="card p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* State multi-select */}
          <div className="lg:col-span-2">
            <label className="text-xs font-medium text-ink-500 mb-2 block">Select States to Compare</label>
            <div className="relative">
              <button
                onClick={() => setShowDD(v => !v)}
                className="btn-secondary w-full text-left text-sm flex justify-between items-center"
              >
                <span>
                  {selStates.length ? (
                    <span className="flex flex-wrap gap-1">
                      {selStates.map(s => (
                        <span key={s} className="badge badge-blue text-xs">{s}</span>
                      ))}
                    </span>
                  ) : 'Select states…'}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showDD && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-card-lg">
                  <div className="p-2.5 border-b border-slate-100 flex gap-3">
                    <button onClick={() => setSelStates(allStates)} className="text-xs text-brand-600 hover:underline font-medium">Select All</button>
                    <button onClick={() => setSelStates([])} className="text-xs text-ink-400 hover:underline">Clear</button>
                    <button onClick={() => setShowDD(false)} className="ml-auto text-xs text-ink-400 hover:underline">Done</button>
                  </div>
                  <div className="grid grid-cols-2 p-2 max-h-64 overflow-y-auto gap-0.5">
                    {allStates.map(s => (
                      <label key={s} className="multiselect-option">
                        <input type="checkbox" checked={selStates.includes(s)} onChange={() => toggle(s)} />
                        <span className="text-xs">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metric selector */}
          <div>
            <label className="text-xs font-medium text-ink-500 mb-2 block">Metric</label>
            <div className="grid grid-cols-2 gap-1.5">
              {METRICS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMetric(m.value)}
                  className="text-xs font-medium px-2 py-1.5 rounded-lg border transition-all text-left"
                  style={{
                    background: metric === m.value ? '#eff6ff' : 'white',
                    borderColor: metric === m.value ? '#3b82f6' : '#e2e8f0',
                    color: metric === m.value ? '#1d4ed8' : '#64748b',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={generate} disabled={loading || selStates.length === 0} className="btn-primary flex items-center gap-2">
            {loading ? <div className="spinner" style={{ width: 15, height: 15, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> : null}
            {loading ? 'Generating…' : 'Generate Chart'}
          </button>
          <p className="text-xs text-ink-400">{selStates.length} state(s) selected</p>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Chart */}
      {(loading || img) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-ink-900">{currentMeta.label} — State Comparison</h3>
              <p className="text-xs text-ink-400 mt-0.5">{selStates.join(', ')}</p>
            </div>
            {img && (
              <a href={`data:image/png;base64,${img}`} download="state_comparison.png"
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </a>
            )}
          </div>
          {loading && (
            <div className="flex items-center justify-center h-48">
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          )}
          {!loading && img && (
            <img src={`data:image/png;base64,${img}`} alt="State comparison" className="w-full rounded-lg"
              style={{ maxHeight: '480px', objectFit: 'contain' }} />
          )}
        </div>
      )}

      {/* Comparison data table */}
      {selData.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-ink-900">Selected States — All Metrics</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                {['State', 'Applicants', 'Avg Income', 'Credit Score', 'Default Rate', 'Eligible Rate', 'Avg DTI', 'Avg Loan'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selData
                .sort((a, b) => Number(b[metricKey[metric] || metric] || 0) - Number(a[metricKey[metric] || metric] || 0))
                .map((s, i) => (
                  <tr key={i} style={{ background: i === 0 ? '#fefce8' : undefined }}>
                    <td className="font-semibold text-ink-900">{String(s.state)}{i === 0 ? ' 🏆' : ''}</td>
                    <td>{fmtNum(Number(s.count))}</td>
                    <td>{fmtINR(Number(s.avg_income))}</td>
                    <td style={{ color: Number(s.avg_credit_score) >= 650 ? '#16a34a' : '#d97706', fontWeight: 500 }}>
                      {Number(s.avg_credit_score).toFixed(0)}
                    </td>
                    <td>
                      <span className={`badge ${Number(s.default_rate) > 30 ? 'badge-high' : Number(s.default_rate) > 20 ? 'badge-medium' : 'badge-low'}`}>
                        {Number(s.default_rate).toFixed(1)}%
                      </span>
                    </td>
                    <td>{Number(s.eligible_rate).toFixed(1)}%</td>
                    <td className="font-mono text-xs">{Number(s.avg_dti).toFixed(2)}</td>
                    <td>{fmtINR(Number(s.avg_loan_amount))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mini ranking card for selected metric */}
      {selData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">
              {currentMeta.label} — Ranking
            </h3>
            <div className="space-y-2">
              {selData
                .map(s => ({ state: String(s.state), val: Number(s[metricKey[metric] || 'default_rate'] || 0) }))
                .sort((a, b) => b.val - a.val)
                .map((item, idx) => {
                  const mx = Math.max(...selData.map(s => Number(s[metricKey[metric] || 'default_rate'] || 0)))
                  return (
                    <div key={item.state} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-5 text-ink-400">#{idx + 1}</span>
                      <span className="text-xs text-ink-700 w-28 truncate">{item.state}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${(item.val / mx) * 100}%`, background: currentMeta.color }} />
                      </div>
                      <span className="text-xs font-mono text-ink-700 w-20 text-right">
                        {metaMap[metric]?.(item.val)}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Summary Statistics</h3>
            {(() => {
              const vals = selData.map(s => Number(s[metricKey[metric] || 'default_rate'] || 0))
              const avg = vals.reduce((a, b) => a + b, 0) / vals.length
              const mn = Math.min(...vals)
              const mx = Math.max(...vals)
              const best = selData.find(s => Number(s[metricKey[metric] || 'default_rate']) === (metric === 'default_rate' ? mn : mx))
              const worst = selData.find(s => Number(s[metricKey[metric] || 'default_rate']) === (metric === 'default_rate' ? mx : mn))
              return (
                <div className="space-y-3">
                  {[
                    { label: 'Average', value: metaMap[metric]?.(avg) },
                    { label: 'Minimum', value: metaMap[metric]?.(mn) },
                    { label: 'Maximum', value: metaMap[metric]?.(mx) },
                    { label: metric === 'default_rate' ? 'Best (lowest)' : 'Best (highest)', value: String(best?.state || '—') },
                    { label: metric === 'default_rate' ? 'Worst (highest)' : 'Worst (lowest)', value: String(worst?.state || '—') },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-xs text-ink-500">{item.label}</span>
                      <span className="text-xs font-semibold text-ink-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
