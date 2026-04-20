'use client'
import { useState, useEffect, useCallback } from 'react'

interface ChartPanelProps {
  title: string
  sub?: string
  fetchFn: () => Promise<{ image: string; type: string }>
  deps?: unknown[]
  height?: string
  onError?: (e: string) => void
}

export default function ChartPanel({
  title, sub, fetchFn, deps = [], height = '380px', onError
}: ChartPanelProps) {
  const [img, setImg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchFn()
      setImg(res.image)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail ?? (e as { message?: string })?.message ?? 'Failed to load chart'
      setError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, ...deps]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  return (
    <div className="card p-5 flex flex-col">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm text-ink-900">{title}</h3>
          {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-brand-600 hover:text-brand-700 disabled:opacity-40 flex items-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="flex-1 relative" style={{ minHeight: height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white rounded-lg z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="spinner" style={{ width: 28, height: 28 }} />
              <p className="text-xs text-ink-400">Generating chart…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="chart-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="text-sm font-medium text-ink-500">Chart unavailable</p>
            <p className="text-xs text-ink-300 max-w-xs text-center">{error}</p>
            <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">Retry</button>
          </div>
        )}

        {!loading && !error && img && (
          <img
            src={`data:image/png;base64,${img}`}
            alt={title}
            className="chart-img"
            style={{ maxHeight: '520px', objectFit: 'contain', width: '100%' }}
          />
        )}

        {!loading && !error && !img && (
          <div className="chart-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <p className="text-xs text-ink-300">No chart data</p>
          </div>
        )}
      </div>
    </div>
  )
}
