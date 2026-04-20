import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CreditIQ — Credit Risk Intelligence Platform',
  description: 'Fintech-grade credit risk analysis for Indian markets',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface-50 min-h-screen">{children}</body>
    </html>
  )
}
