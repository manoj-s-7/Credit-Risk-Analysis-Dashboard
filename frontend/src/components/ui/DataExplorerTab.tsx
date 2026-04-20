'use client'
import { useEffect, useState, useCallback } from 'react'
import { fetchSample, fetchColumns, fmtINR, fmtNum } from '@/lib/api'

const PAGE_SIZE = 25

interface Row { [key: string]: unknown }

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: string }) {
  if (col !== sortCol) return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
      <path d="M7 10l5-6 5 6M7 14l5 6 5-6"/>
    </svg>
  )
  return sortDir === 'asc' ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
      <path d="M12 4l-8 8h16z"/>
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
      <path d="M12 20l-8-8h16z"/>
    </svg>
  )
}

export default function DataExplorerTab() {
  const [data, setData] = useState<{ total: number; pages: number; data: Row[] } | null>(null)
  const [cols, setCols] = useState<string[]>([])
  const [visibleCols, setVisibleCols] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [state, setState] = useState('')
  const [risk, setRisk] = useState('')
  const [employment, setEmployment] = useState('')
  const [sortCol, setSortCol] = useState('customer_id')
  const [sortDir, setSortDir] = useState('asc')
  const [loading, setLoading] = useState(true)
  const [allStates, setAllStates] = useState<string[]>([])
  const [colPickerOpen, setColPickerOpen] = useState(false)

  const ALL_COLS = [
    'customer_id','state','income','employment_type','credit_score',
    'loan_amount','loan_tenure','existing_loans_count','outstanding_debt',
    'repayment_history_score','default_history','monthly_expenses',
    'debt_to_income_ratio','risk_category','loan_eligible',
  ]

  useEffect(() => {
    fetchColumns().then(c => {
      setCols(c.all || ALL_COLS)
      setAllStates(c.states || [])
      setVisibleCols(ALL_COLS.slice(0, 9))
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchSample({ page, page_size: PAGE_SIZE, state, risk, employment, sort_col: sortCol, sort_dir: sortDir })
      setData(r)
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [page, state, risk, employment, sortCol, sortDir])

  useEffect(() => { load() }, [load])

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  function handleFilter() { setPage(1); load() }

  function toggleCol(c: string) {
    setVisibleCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  function cellValue(row: Row, col: string): string {
    const v = row[col]
    if (v === null || v === undefined || v === '') return '—'
    if (col === 'income' || col === 'loan_amount' || col === 'outstanding_debt' || col === 'monthly_expenses')
      return fmtINR(Number(v))
    if (col === 'debt_to_income_ratio') return Number(v).toFixed(2)
    if (col === 'repayment_history_score') return Number(v).toFixed(1)
    return String(v)
  }

  function creditColor(score: number) {
    if (score >= 700) return '#16a34a'
    if (score >= 550) return '#d97706'
    return '#dc2626'
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-ink-900">Data Explorer</h2>
        <p className="text-xs text-ink-400 mt-0.5">
          Browse, filter and sort all 6,500 applicant records — 25 rows per page
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1 block">State</label>
          <select className="input-base text-sm w-40"
            value={state} onChange={e => { setState(e.target.value); setPage(1) }}>
            <option value="">All States</option>
            {allStates.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1 block">Risk Category</label>
          <select className="input-base text-sm w-32"
            value={risk} onChange={e => { setRisk(e.target.value); setPage(1) }}>
            <option value="">All Risk</option>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1 block">Employment</label>
          <select className="input-base text-sm w-40"
            value={employment} onChange={e => { setEmployment(e.target.value); setPage(1) }}>
            <option value="">All Types</option>
            {['Salaried','Self-Employed','Business Owner','Freelancer','Government'].map(e => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </div>

        {/* Column picker */}
        <div className="relative">
          <label className="text-xs font-medium text-ink-500 mb-1 block">Columns</label>
          <button onClick={() => setColPickerOpen(v => !v)} className="btn-secondary text-xs flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Columns ({visibleCols.length})
          </button>
          {colPickerOpen && (
            <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-card-lg p-3 w-48">
              {ALL_COLS.map(c => (
                <label key={c} className="multiselect-option">
                  <input type="checkbox" checked={visibleCols.includes(c)} onChange={() => toggleCol(c)} />
                  <span className="text-xs truncate">{c}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Clear */}
        <button
          onClick={() => { setState(''); setRisk(''); setEmployment(''); setPage(1) }}
          className="btn-secondary text-xs"
        >
          Clear filters
        </button>

        {data && (
          <span className="ml-auto text-xs text-ink-400 font-mono">
            {fmtNum(data.total)} records
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {visibleCols.map(col => (
                  <th key={col} onClick={() => handleSort(col)} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1.5">
                      {col.replace(/_/g, ' ')}
                      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={visibleCols.length} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2">
                    <div className="spinner" />
                    <span className="text-xs text-ink-400">Loading…</span>
                  </div>
                </td></tr>
              )}
              {!loading && data?.data.map((row, i) => (
                <tr key={i}>
                  {visibleCols.map(col => (
                    <td key={col}>
                      {col === 'risk_category' ? (
                        <span className={`badge badge-${String(row[col]).toLowerCase()}`}>
                          {String(row[col] || '—')}
                        </span>
                      ) : col === 'loan_eligible' ? (
                        <span style={{ color: row[col] ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: 14 }}>
                          {row[col] ? '✓' : '✗'}
                        </span>
                      ) : col === 'default_history' ? (
                        <span style={{ color: row[col] ? '#dc2626' : '#16a34a', fontWeight: 500 }}>
                          {row[col] ? 'Yes' : 'No'}
                        </span>
                      ) : col === 'credit_score' ? (
                        <span style={{ color: creditColor(Number(row[col])), fontWeight: 600, fontFamily: 'monospace' }}>
                          {String(row[col])}
                        </span>
                      ) : col === 'customer_id' ? (
                        <span className="font-mono text-xs text-brand-600">{String(row[col])}</span>
                      ) : (
                        cellValue(row, col)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && data?.data.length === 0 && (
                <tr><td colSpan={visibleCols.length} className="text-center py-12 text-xs text-ink-400">
                  No records match the current filters.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-ink-400 font-mono">
              Page {data.pages > 0 ? page : 0} of {data.pages} · {fmtNum(data.total)} total
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page <= 1} className="btn-secondary text-xs px-2 py-1 disabled:opacity-30">«</button>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="btn-secondary text-xs px-3 py-1 disabled:opacity-30">‹ Prev</button>
              <span className="text-xs font-mono text-ink-600 px-3">{page}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p+1))} disabled={page >= data.pages} className="btn-secondary text-xs px-3 py-1 disabled:opacity-30">Next ›</button>
              <button onClick={() => setPage(data.pages)} disabled={page >= data.pages} className="btn-secondary text-xs px-2 py-1 disabled:opacity-30">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
