'use client'
import { useEffect, useState } from 'react'
import { fetchModelStatus, trainModel, fetchFeatureImportance, fetchROCCurve, fetchConfusionMatrix } from '@/lib/api'

interface ModelStatus { trained: boolean; accuracy?: number; auc?: number }

export default function ModelTab() {
  const [status, setStatus] = useState<ModelStatus | null>(null)
  const [training, setTraining] = useState(false)
  const [trainResult, setTrainResult] = useState<Record<string, unknown> | null>(null)
  const [trainError, setTrainError] = useState('')
  const [fiImg, setFiImg] = useState('')
  const [rocImg, setRocImg] = useState('')
  const [cmImg, setCmImg] = useState('')
  const [chartsLoading, setChartsLoading] = useState(false)

  useEffect(() => {
    fetchModelStatus().then(s => {
      setStatus(s)
      if (s.trained) loadCharts()
    }).catch(() => setStatus({ trained: false }))
  }, [])

  async function loadCharts() {
    setChartsLoading(true)
    try {
      const [fi, roc, cm] = await Promise.all([
        fetchFeatureImportance(), fetchROCCurve(), fetchConfusionMatrix()
      ])
      setFiImg(fi.image); setRocImg(roc.image); setCmImg(cm.image)
    } catch { /* charts unavailable */ }
    finally { setChartsLoading(false) }
  }

  async function handleTrain() {
    setTraining(true); setTrainError(''); setTrainResult(null)
    try {
      const r = await trainModel()
      setTrainResult(r)
      setStatus({ trained: true, accuracy: r.accuracy as number, auc: r.auc as number })
      await loadCharts()
    } catch (e: unknown) {
      setTrainError((e as { message?: string })?.message ?? 'Training failed')
    } finally { setTraining(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-ink-900">Model Performance</h2>
        <p className="text-xs text-ink-400 mt-0.5">
          Random Forest classifier trained on 11 features — predict loan eligibility with confidence
        </p>
      </div>

      {/* Model status card */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: status?.trained ? '#10b981' : '#f59e0b' }}
              />
              <p className="font-semibold text-sm text-ink-900">
                {status?.trained ? 'Model Trained & Ready' : 'Model Not Trained'}
              </p>
            </div>
            <p className="text-xs text-ink-400">
              {status?.trained
                ? `Random Forest · 200 estimators · 11 features · Accuracy: ${(status.accuracy! * 100).toFixed(1)}% · AUC: ${status.auc!.toFixed(3)}`
                : 'Click "Train Model" to fit the Random Forest classifier on the full dataset.'}
            </p>
          </div>
          <button
            onClick={handleTrain}
            disabled={training}
            className="btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            {training ? (
              <>
                <div className="spinner" style={{ width: 15, height: 15, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                Training…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
                {status?.trained ? 'Retrain Model' : 'Train Model'}
              </>
            )}
          </button>
        </div>

        {training && (
          <div className="mt-4 rounded-lg p-3 bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-700">
              Training Random Forest on 6,500 records with 80/20 train/test split. This takes 15–30 seconds…
            </p>
          </div>
        )}

        {trainError && (
          <div className="mt-4 rounded-lg p-3 bg-red-50 border border-red-100">
            <p className="text-xs text-red-600">{trainError}</p>
          </div>
        )}
      </div>

      {/* Train result metrics */}
      {trainResult && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Accuracy', value: `${((trainResult.accuracy as number) * 100).toFixed(1)}%`, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'AUC Score', value: (trainResult.auc as number).toFixed(4), color: '#2563eb', bg: '#eff6ff' },
            { label: 'Train Set', value: '5,200', color: '#7c3aed', bg: '#faf5ff' },
            { label: 'Test Set', value: '1,300', color: '#0d9488', bg: '#f0fdfa' },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-4" style={{ background: m.bg }}>
              <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
              <p className="text-xs text-ink-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Classification report */}
      {trainResult?.report && (() => {
        const rep = trainResult.report as Record<string, Record<string, number>>
        return (
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-ink-900 mb-3">Classification Report</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {['Class', 'Precision', 'Recall', 'F1-Score', 'Support'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['0', '1'].map(cls => (
                    <tr key={cls}>
                      <td className="font-medium">{cls === '0' ? 'Not Eligible (0)' : 'Eligible (1)'}</td>
                      {['precision','recall','f1-score','support'].map(k => (
                        <td key={k} className="font-mono text-xs">
                          {k === 'support' ? rep[cls]?.[k] : (rep[cls]?.[k] * (k === 'support' ? 1 : 1)).toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc' }}>
                    <td className="font-semibold text-ink-700">Weighted Avg</td>
                    {['precision','recall','f1-score','support'].map(k => (
                      <td key={k} className="font-mono text-xs font-semibold">
                        {k === 'support' ? rep['weighted avg']?.[k] : rep['weighted avg']?.[k]?.toFixed(3)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Charts */}
      {status?.trained && (
        <>
          {chartsLoading && (
            <div className="flex items-center justify-center h-24">
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          )}

          {!chartsLoading && (
            <>
              {/* Feature importance + confusion matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {fiImg && (
                  <div className="card p-5 lg:col-span-2">
                    <h3 className="font-semibold text-sm text-ink-900 mb-1">Feature Importance</h3>
                    <p className="text-xs text-ink-400 mb-3">Gini impurity reduction — which features matter most</p>
                    <img src={`data:image/png;base64,${fiImg}`} alt="Feature importance"
                      className="w-full rounded-lg" style={{ maxHeight: '400px', objectFit: 'contain' }} />
                  </div>
                )}
                {cmImg && (
                  <div className="card p-5">
                    <h3 className="font-semibold text-sm text-ink-900 mb-1">Confusion Matrix</h3>
                    <p className="text-xs text-ink-400 mb-3">Predicted vs actual on test set</p>
                    <img src={`data:image/png;base64,${cmImg}`} alt="Confusion matrix"
                      className="w-full rounded-lg" style={{ maxHeight: '300px', objectFit: 'contain' }} />
                  </div>
                )}
              </div>

              {/* ROC Curve */}
              {rocImg && (
                <div className="card p-5">
                  <h3 className="font-semibold text-sm text-ink-900 mb-1">ROC Curve</h3>
                  <p className="text-xs text-ink-400 mb-3">Receiver operating characteristic — discriminative power of the model</p>
                  <img src={`data:image/png;base64,${rocImg}`} alt="ROC Curve"
                    className="w-full rounded-lg" style={{ maxHeight: '380px', objectFit: 'contain' }} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Model info card */}
      <div className="card p-5 bg-slate-50 border-slate-100">
        <h3 className="font-semibold text-sm text-ink-900 mb-3">Model Architecture</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Algorithm', value: 'Random Forest Classifier' },
            { label: 'Estimators', value: '200 trees' },
            { label: 'Max Depth', value: '12 levels' },
            { label: 'Class Weights', value: 'Balanced (handles imbalance)' },
            { label: 'Train/Test Split', value: '80% / 20%' },
            { label: 'Target Variable', value: 'loan_eligible (0/1)' },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-3 bg-white border border-slate-100">
              <p className="text-xs text-ink-400">{item.label}</p>
              <p className="text-sm font-semibold text-ink-900 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
