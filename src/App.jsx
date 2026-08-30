import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
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
  const posterRef = useRef(null)

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

  const handleDownload = async () => {
    if (!qrData || !posterRef.current) return
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 2, backgroundColor: null })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${businessName || 'business'}-review-poster.png`
      link.click()
    } catch (err) {
      console.error('Download failed', err)
    }
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
                <div className="poster-container">
                  <div className="poster" ref={posterRef}>
                    <div className="poster-content">
                      <h2 className="poster-header-text">Scan the QR code and<br/>please leave us a review on</h2>
                      <div className="google-logo-wrap">
                        <span className="google-g">G</span><span className="google-o1">o</span><span className="google-o2">o</span><span className="google-g2">g</span><span className="google-l">l</span><span className="google-e">e</span>
                      </div>
                      <div className="poster-stars">★★★★★</div>
                      <div className="scan-me-text">scan me</div>
                      <div className="qr-wrap">
                        <img src={qrData} alt="Generated review QR code" className="poster-qr-image" />
                      </div>
                      <div className="thank-you-text">Thank you</div>
                      <p className="visit-text">for your visit</p>
                    </div>
                    <div className="poster-footer">
                      <div className="footer-logo">
                        <div className="logo-placeholder"></div>
                        <div className="footer-brand">
                          <span className="brand-title">YourBrand</span>
                          <span className="brand-subtitle">connect to the world</span>
                        </div>
                      </div>
                      <div className="footer-website">www.yourwebsite.com</div>
                    </div>
                  </div>
                </div>
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
