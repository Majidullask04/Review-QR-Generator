import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Link } from 'react-router-dom'
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
    const pathParts = url.pathname.split('/').filter(Boolean)
    return pathParts[pathParts.length - 1] || url.hostname.replace(/^www\./i, '').split('.')[0]
  } catch {
    return 'business'
  }
}

const STORAGE_KEY = 'review-qr-history-v2'

function App() {
  const [inputUrl, setInputUrl] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [qrData, setQrData] = useState('')
  const [qrLink, setQrLink] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setHistory(saved)
    } catch { setHistory([]) }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }, [history])

  const updateInput = (value) => {
    setInputUrl(value)
    setBusinessName(getBusinessName(value))
    if (!value.trim()) { setError(''); return }
    setError(getValidationMessage(value))
  }

  const generateQr = async () => {
    const trimmedUrl = inputUrl.trim()
    const validationMessage = getValidationMessage(trimmedUrl)
    if (validationMessage) { setError(validationMessage); return }

    setError('')
    setIsGenerating(true)

    try {
      const businessId = btoa(trimmedUrl).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      const baseUrl = window.location.origin
      const reviewFlowUrl = `${baseUrl}/review/${businessId}?target=${encodeURIComponent(trimmedUrl)}&name=${encodeURIComponent(businessName || getBusinessName(trimmedUrl))}`

      const dataUrl = await QRCode.toDataURL(reviewFlowUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#1a73e8', light: '#ffffff' },
      })

      setQrData(dataUrl)
      setQrLink(reviewFlowUrl)
      setHistory(prev => [{
        id: `${Date.now()}`,
        businessName: businessName || getBusinessName(trimmedUrl),
        googleUrl: trimmedUrl,
        reviewFlowUrl,
        qrDataUrl: dataUrl,
        createdAt: Date.now(),
      }, ...prev].slice(0, 10))
    } catch {
      setError('Failed to generate QR code. Please try again.')
      setQrData('')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyUrl = async () => {
    if (!qrLink) return
    try {
      await navigator.clipboard.writeText(qrLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { setCopied(false) }
  }

  const handleDownload = () => {
    if (!qrData) return
    const link = document.createElement('a')
    link.href = qrData
    link.download = `${businessName || 'business'}-review-qr.png`
    link.click()
  }

  const handleHistorySelect = (item) => {
    setInputUrl(item.googleUrl)
    setBusinessName(item.businessName)
    setQrData(item.qrDataUrl)
    setQrLink(item.reviewFlowUrl)
    setError('')
  }

  return (
    <main className="page-shell">
      <section className="generator-card">
        <div className="hero-copy">
          <p className="eyebrow">Review QR Generator v2</p>
          <h1>AI-Powered Review QR Codes</h1>
          <p className="subtitle">
            Customers scan → Rate with stars → Get AI-generated review → Post to Google.
            No more blank-page anxiety.
          </p>
        </div>

        <div className="workspace-grid">
          <div className="panel input-panel">
            <label className="field-label" htmlFor="reviewUrl">Google Review URL</label>
            <input
              id="reviewUrl"
              type="url"
              value={inputUrl}
              onChange={(e) => updateInput(e.target.value)}
              placeholder="https://g.page/your-business/review"
              className={error && inputUrl ? 'input invalid' : 'input'}
            />
            <div className="field-row">
              <span className="helper-text">Paste your Google Business review link</span>
              <button type="button" className="link-button" onClick={() => updateInput('https://g.page/r/CW example')}>
                Try sample
              </button>
            </div>
            {error && inputUrl && <p className="error-text">{error}</p>}

            <label className="field-label" htmlFor="bizName" style={{marginTop: '16px'}}>Business Name (optional)</label>
            <input
              id="bizName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Tony's Pizza"
              className="input"
            />

            <div className="toolbar">
              <button type="button" className="primary-button" onClick={generateQr} disabled={isGenerating || !inputUrl.trim()}>
                {isGenerating ? 'Generating...' : 'Generate Smart QR'}
              </button>
              <button type="button" className="secondary-button" onClick={copyUrl} disabled={!qrLink}>
                {copied ? 'Copied!' : 'Copy QR Link'}
              </button>
            </div>
          </div>

          <div className="panel preview-panel">
            <div className="preview-box">
              {isGenerating ? (
                <div className="spinner-wrap">
                  <div className="spinner" />
                  <p>Creating smart QR...</p>
                </div>
              ) : qrData ? (
                <>
                  <img src={qrData} alt="Generated review QR code" className="qr-image" />
                  <p className="qr-caption">Scans open AI review helper</p>
                </>
              ) : (
                <div className="empty-state">
                  <div className="placeholder-qr" aria-hidden="true" />
                  <p>QR preview appears here</p>
                </div>
              )}
            </div>
            <div className="preview-actions">
              <button type="button" className="primary-button" onClick={handleDownload} disabled={!qrData}>Download PNG</button>
              <button type="button" className="secondary-button" onClick={() => window.print()}>Print</button>
            </div>
          </div>
        </div>

        <div className="history-panel panel">
          <div className="history-header">
            <h2>Recent QR Codes</h2>
            {history.length > 0 && (
              <button type="button" className="link-button danger" onClick={() => setHistory([])}>Clear</button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="empty-history">Your generated QR history will appear here.</p>
          ) : (
            <div className="history-grid">
              {history.map((item) => (
                <button key={item.id} type="button" className="history-item" onClick={() => handleHistorySelect(item)}>
                  <img src={item.qrDataUrl} alt={`${item.businessName} preview`} />
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
