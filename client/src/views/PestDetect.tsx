import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'

type Result = {
  disease: string
  confidence: number
  treatments: string[]
  plant_type: string
  severity: string
}

export default function PestDetect() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    setResult(null)
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!file) {
      setError('Please select an image file.')
      return
    }

    setLoading(true)
    trackEvent('pest_detection_attempt', { fileName: file.name })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const resp = await fetch('/api/pestdetect', {
        method: 'POST',
        body: formData,
      })

      if (!resp.ok) throw new Error('Detection failed')

      const data = await resp.json()
      setResult(data)
      trackEvent('pest_detection_success', {
        disease: data.disease,
        confidence: data.confidence,
      })
    } catch (e: any) {
      setError(e?.message || 'Detection failed')
      trackEvent('pest_detection_error', { message: e?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="grid"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4 }}
    >
      <motion.section
        className="card"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2>Pest & Disease Detection</h2>
        <p className="muted">
          Upload a crop image to detect possible diseases or pests.
        </p>

        <form onSubmit={handleSubmit} style={{ marginBottom: 12 }}>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            style={{ marginLeft: 8 }}
          >
            Detect
          </motion.button>
        </form>

        {/* Image Preview */}
        {file && (
          <motion.div
            className="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: 12 }}
          >
            <p className="muted">Selected Image:</p>
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              style={{
                maxWidth: '200px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            />
          </motion.div>
        )}

        {/* Error Box */}
        {error && (
          <motion.div
            className="error-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              marginTop: 12,
              padding: '10px',
              backgroundColor: 'var(--red-100)',
              border: '1px solid var(--red-300)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--red-700)',
            }}
          >
            ❌ {error}
          </motion.div>
        )}
      </motion.section>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.section
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="loading-spinner" />
            <p className="muted">Analyzing crop health…</p>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Detection Result */}
      {result && (
        <motion.section
          className="card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h3>Detection Result</h3>
          <p>
            <b>Disease:</b> {result.disease}
          </p>
          <p>
            <b>Plant Type:</b> {result.plant_type}
          </p>
          <p>
            <b>Severity:</b> {result.severity}
          </p>
          <p>
            <b>Confidence:</b>{' '}
            <span
              style={{
                color: result.confidence > 0.8 ? 'green' : 'orange',
                fontWeight: 600,
              }}
            >
              {Math.round(result.confidence * 100)}%
            </span>
          </p>

          {result.treatments && result.treatments.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4>Treatment Recommendations</h4>
              <ul>
                {result.treatments.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <div
            className="disclaimer"
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: 'var(--blue-100)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--blue-200)',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                color: 'var(--blue-700)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ℹ️ <strong>Disclaimer:</strong> AI-powered disease detection for
              guidance only. For critical cases, consult local agricultural
              experts or extension services.
            </p>
          </div>
        </motion.section>
      )}
    </motion.div>
  )
}
