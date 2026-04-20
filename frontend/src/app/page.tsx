'use client'
import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import OverviewTab from '@/components/ui/OverviewTab'
import DataAnalyzerTab from '@/components/ui/DataAnalyzerTab'
import StateAnalysisTab from '@/components/ui/StateAnalysisTab'
import InsightsTab from '@/components/ui/InsightsTab'
import ModelTab from '@/components/ui/ModelTab'
import DataExplorerTab from '@/components/ui/DataExplorerTab'

const HEADER: Record<string, { title: string; sub: string }> = {
  overview:  { title: 'Portfolio Overview',   sub: 'Aggregate KPIs, risk breakdown, state performance and income distribution' },
  analyzer:  { title: 'Data Analyzer',        sub: 'User-driven chart builder — select columns, chart type and filters' },
  states:    { title: 'State Analysis',       sub: 'Compare Indian states across multiple credit risk metrics' },
  insights:  { title: 'AI Insights Engine',   sub: 'Auto-generated statistical insights from the full dataset' },
  model:     { title: 'Model Performance',    sub: 'Train Random Forest, view accuracy, ROC curve and feature importance' },
  explorer:  { title: 'Data Explorer',        sub: 'Browse, filter and sort all 6,500 applicant records' },
}

export default function Home() {
  const [tab, setTab] = useState('overview')
  const h = HEADER[tab]

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar active={tab} onChange={setTab} />

      {/* Main content */}
      <div className="ml-56 min-h-screen flex flex-col">

        {/* Top header */}
        <header
          className="sticky top-0 z-20 px-7 py-4 flex items-center justify-between"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div>
            <h1 className="text-base font-semibold text-ink-900">{h.title}</h1>
            <p className="text-xs text-ink-400 mt-0.5">{h.sub}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* API status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-100 border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-ink-500 font-medium">API Live</span>
            </div>

            {/* Branding */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100">
              <span className="text-xs font-semibold text-blue-700">CreditIQ v3</span>
              <span className="text-xs text-ink-400">·</span>
              <span className="text-xs text-ink-400">Indian Credit Markets</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-7 py-6">
          {tab === 'overview'  && <OverviewTab />}
          {tab === 'analyzer'  && <DataAnalyzerTab />}
          {tab === 'states'    && <StateAnalysisTab />}
          {tab === 'insights'  && <InsightsTab />}
          {tab === 'model'     && <ModelTab />}
          {tab === 'explorer'  && <DataExplorerTab />}
        </main>

        {/* Footer */}
        <footer className="px-7 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-ink-300">
            CreditIQ v3 · 6,500 Indian credit applicants · FastAPI + Next.js + matplotlib/seaborn
          </p>
          <p className="text-xs text-ink-300">
            Charts rendered server-side — identical to native seaborn output
          </p>
        </footer>
      </div>
    </div>
  )
}
