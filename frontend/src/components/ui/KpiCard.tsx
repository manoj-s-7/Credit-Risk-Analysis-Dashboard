'use client'
import { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: { value: string; up: boolean }
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal'
  icon: ReactNode
}

const schemes = {
  blue:   { bg: '#eff6ff', icon: '#2563eb', border: '#bfdbfe', text: '#1d4ed8' },
  green:  { bg: '#f0fdf4', icon: '#16a34a', border: '#bbf7d0', text: '#15803d' },
  amber:  { bg: '#fffbeb', icon: '#d97706', border: '#fde68a', text: '#b45309' },
  red:    { bg: '#fff1f2', icon: '#dc2626', border: '#fecaca', text: '#b91c1c' },
  purple: { bg: '#faf5ff', icon: '#7c3aed', border: '#ddd6fe', text: '#6d28d9' },
  teal:   { bg: '#f0fdfa', icon: '#0d9488', border: '#99f6e4', text: '#0f766e' },
}

export default function KpiCard({ label, value, sub, trend, color = 'blue', icon }: KpiCardProps) {
  const s = schemes[color]
  return (
    <div className="card kpi-card p-5">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: s.bg, color: s.icon, border: `1px solid ${s.border}` }}
        >
          {icon}
        </div>
        {trend && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: trend.up ? '#f0fdf4' : '#fff1f2',
              color: trend.up ? '#15803d' : '#b91c1c',
            }}
          >
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-ink-900 leading-none">{value}</p>
        <p className="text-sm font-medium text-ink-500 mt-1.5">{label}</p>
        {sub && <p className="text-xs text-ink-300 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
