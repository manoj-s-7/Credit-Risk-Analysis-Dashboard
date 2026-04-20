'use client'
import { useEffect, useState } from 'react'
import { fetchInsights } from '@/lib/api'

interface Insight {
  category: string
  icon: string
  color: string
  title: string
  detail: string
  metric: string
}

const ICON_SVG: Record<string, React.ReactNode> = {
  'trending-down': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
    </svg>
  ),
  'award': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  'map-pin': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  ),
  'alert-triangle': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  'briefcase': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  'check-circle': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  'layers': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  'pie-chart': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
    </svg>
  ),
}

const COLOR_SCHEMES: Record<string, { bg: string; icon: string; border: string; badge: string; badgeText: string }> = {
  red:    { bg: '#fff1f2', icon: '#dc2626', border: '#fecaca', badge: '#fee2e2', badgeText: '#991b1b' },
  blue:   { bg: '#eff6ff', icon: '#2563eb', border: '#bfdbfe', badge: '#dbeafe', badgeText: '#1e40af' },
  orange: { bg: '#fff7ed', icon: '#ea580c', border: '#fed7aa', badge: '#ffedd5', badgeText: '#9a3412' },
  amber:  { bg: '#fffbeb', icon: '#d97706', border: '#fde68a', badge: '#fef3c7', badgeText: '#92400e' },
  green:  { bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0', badge: '#dcfce7', badgeText: '#166534' },
  teal:   { bg: '#f0fdfa', icon: '#0d9488', border: '#99f6e4', badge: '#ccfbf1', badgeText: '#0f766e' },
  purple: { bg: '#faf5ff', icon: '#7c3aed', border: '#ddd6fe', badge: '#ede9fe', badgeText: '#5b21b6' },
  indigo: { bg: '#eef2ff', icon: '#4338ca', border: '#c7d2fe', badge: '#e0e7ff', badgeText: '#3730a3' },
}

function InsightCard({ ins, idx }: { ins: Insight; idx: number }) {
  const [open, setOpen] = useState(false)
  const cs = COLOR_SCHEMES[ins.color] ?? COLOR_SCHEMES.blue
  return (
    <div
      className="insight-card cursor-pointer"
      style={{ borderLeft: `3px solid ${cs.icon}` }}
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: cs.bg, color: cs.icon, border: `1px solid ${cs.border}` }}
        >
          {ICON_SVG[ins.icon] ?? ICON_SVG['pie-chart']}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full mb-2 inline-block"
                style={{ background: cs.badge, color: cs.badgeText }}
              >
                {ins.category}
              </span>
              <p className="text-sm font-semibold text-ink-900 leading-snug">{ins.title}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <span
                className="text-xs font-mono font-bold px-2 py-1 rounded-lg"
                style={{ background: cs.bg, color: cs.icon }}
              >
                {ins.metric}
              </span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#94a3b8" strokeWidth="2"
                style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          {open && (
            <p className="text-sm text-ink-500 mt-2 leading-relaxed">{ins.detail}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InsightsTab() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true); setError('')
    fetchInsights()
      .then(r => setInsights(r.insights))
      .catch(() => setError('Could not fetch insights. Ensure the ML service is running.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-900">AI Insights Engine</h2>
          <p className="text-xs text-ink-400 mt-0.5">
            Automatically generated from data — statistical patterns, risk signals, and portfolio intelligence
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-xs flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Regenerate
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner" style={{ width: 28, height: 28 }} />
            <p className="text-sm text-ink-400">Analysing dataset…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card p-6 text-center">
          <p className="text-sm text-red-500 font-medium">{error}</p>
          <button onClick={load} className="btn-primary mt-3 text-xs">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Insights Generated', value: insights.length, color: '#2563eb', bg: '#eff6ff' },
              { label: 'Risk Signals', value: insights.filter(i => ['red','amber','orange'].includes(i.color)).length, color: '#dc2626', bg: '#fff1f2' },
              { label: 'Opportunity Signals', value: insights.filter(i => ['green','teal'].includes(i.color)).length, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Categories Covered', value: new Set(insights.map(i => i.category)).size, color: '#7c3aed', bg: '#faf5ff' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: item.bg }}>
                <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs text-ink-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-ink-400">
            Click any card to expand the full analysis detail.
          </p>

          <div className="space-y-3">
            {insights.map((ins, i) => (
              <InsightCard key={i} ins={ins} idx={i} />
            ))}
          </div>

          <div className="card p-4 bg-blue-50 border-blue-100">
            <div className="flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Methodology:</strong> Insights are computed directly from the 6,500-record cleaned dataset using
                descriptive statistics, correlation analysis, and group-level aggregations. No external API is required.
                All figures update automatically when data changes.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
