'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  fetchColumns,
  fetchHistogram, fetchBoxplot, fetchScatter, fetchBarplot,
  fetchHeatmap, fetchPairplot,
} from '@/lib/api'

const CHART_TYPES = [
  { id: 'histogram', label: 'Histogram', desc: 'Distribution of a numeric column', icon: '▬' },
  { id: 'boxplot',   label: 'Box Plot',  desc: 'Quartile spread & outliers',        icon: '⊡' },
  { id: 'scatter',   label: 'Scatter',   desc: 'X vs Y with optional trend line',    icon: '⋮⋮' },
  { id: 'barplot',   label: 'Bar Chart', desc: 'Counts or averages by category',     icon: '▮▮▮' },
  { id: 'heatmap',   label: 'Heatmap',   desc: 'Correlation matrix (all numerics)', icon: '▦' },
  { id: 'pairplot',  label: 'Pair Plot', desc: 'Multi-variable pair grid',           icon: '⊞' },
]

const METRICS = [
  { value: 'count',        label: 'Count' },
  { value: 'default_rate', label: 'Default Rate (%)' },
  { value: 'mean',         label: 'Mean value' },
]

export default function DataAnalyzerTab() {
  const [cols, setCols] = useState<{ numeric: string[]; categorical: string[]; all: string[]; states: string[] }>({
    numeric: [], categorical: [], all: [], states: [],
  })
  const [chartType, setChartType] = useState('')
  const [img, setImg] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form params
  const [colX, setColX] = useState('')
  const [colY, setColY] = useState('')
  const [hue, setHue] = useState('risk_category')
  const [groupBy, setGroupBy] = useState('risk_category')
  const [metric, setMetric] = useState('count')
  const [bins, setBins] = useState(30)
  const [trendline, setTrendline] = useState(true)
  const [pairCols, setPairCols] = useState<string[]>([])
  const [selStates, setSelStates] = useState<string[]>([])
  const [showStateDD, setShowStateDD] = useState(false)

  useEffect(() => {
    fetchColumns().then(c => {
      setCols(c)
      if (c.numeric.length) { setColX(c.numeric[0]); setColY(c.numeric[1] || c.numeric[0]) }
      setPairCols(c.numeric.slice(0, 4))
    })
  }, [])

  function toggleState(s: string) {
    setSelStates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function togglePairCol(c: string) {
    setPairCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const statesParam = selStates.join(',')

  async function generate() {
    if (!chartType) { setError('Select a chart type first.'); return }
    setLoading(true); setError(''); setImg('')
    try {
      let res: { image: string }
      if (chartType === 'histogram')
        res = await fetchHistogram({ column: colX, hue, bins, states: statesParam })
      else if (chartType === 'boxplot')
        res = await fetchBoxplot({ column: colX, group_by: groupBy, states: statesParam })
      else if (chartType === 'scatter')
        res = await fetchScatter({ x: colX, y: colY, hue, trendline, states: statesParam })
      else if (chartType === 'barplot')
        res = await fetchBarplot({ column: colX, metric, states: statesParam })
      else if (chartType === 'heatmap')
        res = await fetchHeatmap({ states: statesParam })
      else if (chartType === 'pairplot')
        res = await fetchPairplot({ columns: pairCols.join(','), hue, states: statesParam })
      else throw new Error('Unknown chart type')
      setImg(res.image)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? (e as { message?: string })?.message ?? 'Error generating chart'
      setError(msg)
    } finally { setLoading(false) }
  }

  const inputCls = 'input-base text-sm'
  const labelCls = 'text-xs font-medium text-ink-500 mb-1 block'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-ink-900">Interactive Data Analyzer</h2>
        <p className="text-xs text-ink-400 mt-0.5">
          Select columns and chart type — charts render with native matplotlib / seaborn styling
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Control Panel ── */}
        <div className="xl:col-span-1 space-y-4">

          {/* Step 1 — Chart type */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">
              Step 1 — Select Chart Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => { setChartType(ct.id); setImg(''); setError('') }}
                  className="text-left p-3 rounded-xl border transition-all duration-150"
                  style={{
                    background: chartType === ct.id ? '#eff6ff' : 'white',
                    borderColor: chartType === ct.id ? '#3b82f6' : '#e2e8f0',
                    boxShadow: chartType === ct.id ? '0 0 0 1px #3b82f6' : 'none',
                  }}
                >
                  <p className="text-base mb-1">{ct.icon}</p>
                  <p className="text-xs font-semibold" style={{ color: chartType === ct.id ? '#1d4ed8' : '#334155' }}>
                    {ct.label}
                  </p>
                  <p className="text-xs text-ink-400 mt-0.5 leading-tight">{ct.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Configure */}
          {chartType && (
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
                Step 2 — Configure
              </p>

              {/* Histogram */}
              {chartType === 'histogram' && (
                <>
                  <div>
                    <label className={labelCls}>Column</label>
                    <select className={inputCls} value={colX} onChange={e => setColX(e.target.value)}>
                      {cols.numeric.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Colour by (hue)</label>
                    <select className={inputCls} value={hue} onChange={e => setHue(e.target.value)}>
                      <option value="">None</option>
                      {cols.categorical.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Bins: {bins}</label>
                    <input type="range" min={5} max={80} value={bins}
                      onChange={e => setBins(Number(e.target.value))}
                      className="w-full accent-blue-500" />
                  </div>
                </>
              )}

              {/* Boxplot */}
              {chartType === 'boxplot' && (
                <>
                  <div>
                    <label className={labelCls}>Numeric column (Y axis)</label>
                    <select className={inputCls} value={colX} onChange={e => setColX(e.target.value)}>
                      {cols.numeric.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Group by</label>
                    <select className={inputCls} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                      {cols.categorical.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Scatter */}
              {chartType === 'scatter' && (
                <>
                  <div>
                    <label className={labelCls}>X axis</label>
                    <select className={inputCls} value={colX} onChange={e => setColX(e.target.value)}>
                      {cols.numeric.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Y axis</label>
                    <select className={inputCls} value={colY} onChange={e => setColY(e.target.value)}>
                      {cols.numeric.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Colour by (hue)</label>
                    <select className={inputCls} value={hue} onChange={e => setHue(e.target.value)}>
                      <option value="">None</option>
                      {cols.categorical.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={trendline} onChange={e => setTrendline(e.target.checked)}
                      className="accent-blue-500" />
                    <span className="text-xs text-ink-600">Show trend line</span>
                  </label>
                </>
              )}

              {/* Bar plot */}
              {chartType === 'barplot' && (
                <>
                  <div>
                    <label className={labelCls}>Category column</label>
                    <select className={inputCls} value={colX} onChange={e => setColX(e.target.value)}>
                      {cols.all.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Metric</label>
                    <select className={inputCls} value={metric} onChange={e => setMetric(e.target.value)}>
                      {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Heatmap — no params needed, just filters */}
              {chartType === 'heatmap' && (
                <p className="text-xs text-ink-400">
                  Correlation heatmap uses all numeric columns. Use filters below to subset states if needed.
                </p>
              )}

              {/* Pair plot */}
              {chartType === 'pairplot' && (
                <>
                  <div>
                    <label className={labelCls}>Select columns (max 5)</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2">
                      {cols.numeric.map(c => (
                        <label key={c} className="multiselect-option">
                          <input type="checkbox" checked={pairCols.includes(c)}
                            onChange={() => togglePairCol(c)} disabled={!pairCols.includes(c) && pairCols.length >= 5} />
                          <span className="text-xs">{c}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-ink-300 mt-1">{pairCols.length}/5 selected: {pairCols.join(', ')}</p>
                  </div>
                  <div>
                    <label className={labelCls}>Colour by</label>
                    <select className={inputCls} value={hue} onChange={e => setHue(e.target.value)}>
                      {cols.categorical.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* State filter */}
              <div>
                <label className={labelCls}>Filter by State (optional)</label>
                <div className="relative">
                  <button
                    onClick={() => setShowStateDD(v => !v)}
                    className="btn-secondary w-full text-left text-xs flex justify-between items-center"
                  >
                    <span>{selStates.length ? `${selStates.length} state(s) selected` : 'All states'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {showStateDD && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-card-lg max-h-52 overflow-y-auto">
                      <div className="p-2 border-b border-slate-100 flex gap-2">
                        <button onClick={() => setSelStates(cols.states)} className="text-xs text-brand-600 hover:underline">All</button>
                        <button onClick={() => setSelStates([])} className="text-xs text-ink-400 hover:underline">Clear</button>
                      </div>
                      {cols.states.map(s => (
                        <label key={s} className="multiselect-option">
                          <input type="checkbox" checked={selStates.includes(s)} onChange={() => toggleState(s)} />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!chartType || loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                Generating…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Generate Chart
              </>
            )}
          </button>

          {error && (
            <div className="rounded-lg p-3 bg-red-50 border border-red-100">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* ── Chart Output ── */}
        <div className="xl:col-span-2">
          <div className="card p-5 h-full flex flex-col" style={{ minHeight: '500px' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-ink-900">
                  {chartType ? CHART_TYPES.find(c => c.id === chartType)?.label : 'Chart Output'}
                </h3>
                <p className="text-xs text-ink-400 mt-0.5">
                  Rendered with matplotlib + seaborn (server-side)
                </p>
              </div>
              {img && (
                <a
                  href={`data:image/png;base64,${img}`}
                  download="creditiq_chart.png"
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download PNG
                </a>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center">
              {loading && (
                <div className="flex flex-col items-center gap-4 text-ink-400">
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                  <div className="text-center">
                    <p className="text-sm font-medium">Generating chart…</p>
                    <p className="text-xs mt-1">
                      {chartType === 'pairplot' ? 'Pair plots may take 5–10 seconds' : 'Usually takes 1–3 seconds'}
                    </p>
                  </div>
                </div>
              )}

              {!loading && !img && !error && (
                <div className="chart-placeholder w-full">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M7 16l3-4 3 2 3-5"/>
                  </svg>
                  <p className="text-sm font-medium text-ink-500">No chart yet</p>
                  <p className="text-xs text-ink-300">
                    {chartType ? 'Configure options and click Generate Chart' : 'Select a chart type to begin'}
                  </p>
                </div>
              )}

              {!loading && img && (
                <img
                  src={`data:image/png;base64,${img}`}
                  alt="Generated chart"
                  className="w-full rounded-lg"
                  style={{ maxHeight: '540px', objectFit: 'contain' }}
                />
              )}

              {!loading && error && (
                <div className="chart-placeholder w-full">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  <p className="text-sm font-medium text-red-500">Chart Error</p>
                  <p className="text-xs text-ink-400 max-w-sm text-center">{error}</p>
                  <button onClick={generate} className="btn-primary text-xs px-4 py-1.5">Retry</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart reference guide ── */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-ink-900 mb-3">Chart Guide — When to Use Each</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {CHART_TYPES.map(ct => (
            <div key={ct.id} className="rounded-lg p-3 bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{ct.icon}</span>
                <p className="text-xs font-semibold text-ink-700">{ct.label}</p>
              </div>
              <p className="text-xs text-ink-400">{ct.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
