import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import './App.css'

const ALLOWED_DOMAINS = [
  'google.com',
  'g.page',
  'search.google.com',
  'business.google.com',
]

const getValidationMessage = (value) => {
  if (!value.trim()) return 'Please enter a Google review URL.'

  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()

    if (!ALLOWED_DOMAINS.some((domain) => host.includes(domain))) {
      return 'Must be a valid Google Review URL.'
    }

    return ''
  } catch {
    return 'Please enter a valid URL.'
  }
}

const getBusinessName = (value) => {
  try {
    const url = new URL(value)
    const host = url.hostname
      .replace(/^www\./i, '')
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/^-+|-+$/g, '')

    return host || 'business'
  } catch {
    return 'business'
  }
}

const STORAGE_KEY = 'review-qr-history'

function App() {
  const [inputUrl, setInputUrl] = useState('')
  const [qrData, setQrData] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setHistory(savedHistory)
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }, [history])

  const updateInput = (value) => {
    setInputUrl(value)

    if (!value.trim()) {
      setError('')
      return
    }

    setError(getValidationMessage(value))
  }

  const addHistoryItem = (item) => {
    setHistory((current) => [item, ...current].slice(0, 10))
  }

  async function generateQr() {
    const trimmedUrl = inputUrl.trim()
    const validationMessage = getValidationMessage(trimmedUrl)

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const dataUrl = await QRCode.toDataURL(trimmedUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1a73e8',
          light: '#ffffff',
        },
      })

      setQrData(dataUrl)
      addHistoryItem({
        id: `${Date.now()}`,
        businessName: getBusinessName(trimmedUrl),
        url: trimmedUrl,
        qrDataUrl: dataUrl,
        createdAt: Date.now(),
      })
    } catch {
      setError('Failed to generate QR code. Please try again.')
      setQrData('')
    } finally {
      setIsGenerating(false)
    }
  }

  async function copyUrl() {
    if (!inputUrl) return

    try {
      await navigator.clipboard.writeText(inputUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  function handleDownload() {
    if (!qrData) return

    const filename = `${getBusinessName(inputUrl || qrData)}-qr.png`
    const link = document.createElement('a')
    link.href = qrData
    link.download = filename
    link.click()
  }

  function handleHistorySelect(item) {
    setInputUrl(item.url)
    setQrData(item.qrDataUrl)
    setError('')
  }

  function clearHistory() {
    setHistory([])
  }

  return (
    <main className="page-shell">
      <section className="generator-card">
        <div className="hero-copy">
          <p className="eyebrow">Google Review QR</p>
          <h1>Turn any review link into a shareable QR code.</h1>
          <p className="subtitle">
            Generate a branded QR code for your Google Business Profile review link in under a second.
          </p>
        </div>

        <div className="workspace-grid">
          <div className="panel input-panel">
            <label className="field-label" htmlFor="reviewUrl">
              Review URL
            </label>
            <input
              id="reviewUrl"
              type="url"
              value={inputUrl}
              onChange={(event) => updateInput(event.target.value)}
              placeholder="https://g.page/your-business"
              className={error && inputUrl ? 'input invalid' : 'input'}
            />

            <div className="field-row">
              <span className="helper-text">Accepts Google, g.page, and search URLs</span>
              <button type="button" className="link-button" onClick={() => setInputUrl('https://g.page/your-business')}>
                Try sample
              </button>
            </div>

            {error && inputUrl && <p className="error-text">{error}</p>}

            <div className="toolbar">
              <button
                type="button"
                className="primary-button"
                onClick={generateQr}
                disabled={isGenerating || !inputUrl.trim()}
              >
                {isGenerating ? 'Generating...' : 'Generate QR'}
              </button>

              <button type="button" className="secondary-button" onClick={copyUrl} disabled={!inputUrl}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>

          <div className="panel preview-panel">
            <div className="preview-box">
              {isGenerating ? (
                <div className="spinner-wrap">
                  <div className="spinner" />
                  <p>Creating your QR code…</p>
                </div>
              ) : qrData ? (
                <img src={qrData} alt="Generated Google review QR code" className="qr-image" />
              ) : (
                <div className="empty-state">
                  <div className="placeholder-qr" aria-hidden="true" />
                  <p>No QR generated yet</p>
                </div>
              )}
            </div>

            <div className="preview-actions">
              <button type="button" className="primary-button" onClick={handleDownload} disabled={!qrData}>
                Download PNG
              </button>
              <button type="button" className="secondary-button" onClick={() => window.print()}>
                Print
              </button>
            </div>
          </div>
        </div>

        <div className="history-panel panel">
          <div className="history-header">
            <h2>Recent QR codes</h2>
            {history.length > 0 && (
              <button type="button" className="link-button danger" onClick={clearHistory}>
                Clear history
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="empty-history">Your generated QR history will appear here.</p>
          ) : (
            <div className="history-grid">
              {history.map((item) => (
                <button key={item.id} type="button" className="history-item" onClick={() => handleHistorySelect(item)}>
                  <img src={item.qrDataUrl} alt={`${item.businessName} QR preview`} />
                  <div>
                    <strong>{item.businessName}</strong>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
