import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import QRCodeStyling from 'qr-code-styling'
import html2canvas from 'html2canvas'
import { Link } from 'react-router-dom'
import './App.css'

const ALLOWED_DOMAINS = [
  'google.com', 'g.page', 'search.google.com', 'business.google.com',
]

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant / Cafe' },
  { value: 'salon', label: 'Salon / Barber / Spa' },
  { value: 'gym', label: 'Gym / Fitness Center' },
  { value: 'hotel', label: 'Hotel / Inn / B&B' },
  { value: 'retail', label: 'Retail Shop / Store' },
  { value: 'medical', label: 'Clinic / Hospital / Dental' },
  { value: 'automotive', label: 'Auto Repair / Car Wash' },
  { value: 'education', label: 'School / Tutoring / Classes' },
  { value: 'other', label: 'Other Business' },
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

const STORAGE_KEY = 'review-qr-history-v3'

function App() {
  const [inputUrl, setInputUrl] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('restaurant')
  const [customType, setCustomType] = useState('')
  const [qrData, setQrData] = useState('') // For history thumbnails
  const [qrLink, setQrLink] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])
  const posterRef = useRef(null)
  const qrRef = useRef(null)
  
  const [qrCodeStyling] = useState(new QRCodeStyling({
    width: 220,
    height: 220,
    type: 'canvas',
    margin: 5,
    qrOptions: {
      errorCorrectionLevel: 'L',
    },
    dotsOptions: {
      color: '#000000',
      type: 'dots' // Gives the rounded pixel look
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#000000',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#000000',
    },
    backgroundOptions: {
      color: 'transparent'
    }
  }))

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setHistory(saved)
    } catch { setHistory([]) }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }, [history])

  // Update dotted QR canvas when qrLink changes
  useEffect(() => {
    if (qrLink && qrRef.current) {
      qrCodeStyling.update({ data: qrLink })
      qrRef.current.innerHTML = '' // Clear old canvas
      qrCodeStyling.append(qrRef.current)
    }
  }, [qrLink, qrCodeStyling])

  const updateInput = (value) => {
    setInputUrl(value)
    setBusinessName(getBusinessName(value))
    if (!value.trim()) { setError(''); return }
    setError(getValidationMessage(value))
  }

  const getFinalBusinessType = () => {
    return businessType === 'other' ? customType : businessType
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
      const finalType = getFinalBusinessType()
      
      const reviewFlowUrl = `${baseUrl}/review/${businessId}?target=${encodeURIComponent(trimmedUrl)}&name=${encodeURIComponent(businessName || getBusinessName(trimmedUrl))}&type=${encodeURIComponent(finalType)}`

      // Generate a small basic QR for the history panel thumbnail
      const thumbDataUrl = await QRCode.toDataURL(reviewFlowUrl, {
        width: 100, margin: 1, color: { dark: '#000', light: '#fff' }
      })

      setQrData(thumbDataUrl)
      setQrLink(reviewFlowUrl)
      
      setHistory(prev => [{
        id: `${Date.now()}`,
        businessName: businessName || getBusinessName(trimmedUrl),
        businessType: finalType,
        googleUrl: trimmedUrl,
        reviewFlowUrl,
        qrDataUrl: thumbDataUrl,
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
    if (!qrLink || !posterRef.current) return
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 3, backgroundColor: null, useCORS: true })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${businessName || 'business'}-google-poster.png`
      link.click()
    } catch (err) {
      console.error('Download failed', err)
    }
  }

  const handleHistorySelect = (item) => {
    setInputUrl(item.googleUrl)
    setBusinessName(item.businessName)
    setBusinessType(item.businessType)
    setQrData(item.qrDataUrl)
    setQrLink(item.reviewFlowUrl)
    setError('')
  }

  return (
    <main className="page-shell">
      <section className="generator-card">
        <div className="hero-copy">
          <p className="eyebrow">Review QR Generator v4</p>
          <h1>AI-Powered Review QR Codes</h1>
          <p className="subtitle">
            Tell us your business type → AI writes realistic, specific reviews → Customers post with confidence.
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
              <button type="button" className="link-button" onClick={() => updateInput('https://g.page/r/tonys-pizza/review')}>
                Try sample
              </button>
            </div>
            {error && inputUrl && <p className="error-text">{error}</p>}

            <label className="field-label" htmlFor="bizName" style={{marginTop: '16px'}}>Business Name</label>
            <input
              id="bizName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Tony's Pizza"
              className="input"
            />

            <label className="field-label" style={{marginTop: '16px'}}>What type of business is this?</label>
            <div className="business-type-grid">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`type-card ${businessType === type.value ? 'selected' : ''}`}
                  onClick={() => setBusinessType(type.value)}
                >
                  <span className="type-label">{type.label}</span>
                </button>
              ))}
            </div>

            {businessType === 'other' && (
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g. Pet Grooming, Yoga Studio, Law Firm..."
                className="input"
                style={{marginTop: '12px'}}
              />
            )}

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
              ) : qrLink ? (
                <div className="google-poster-wrap">
                  <div className="google-poster" ref={posterRef}>
                    <div className="wave wave-top-right"></div>
                    <div className="wave wave-bottom-left"></div>
                    
                    <div className="floating-icon icon-left">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" />
                    </div>
                    <div className="floating-icon icon-right">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg" alt="Google Maps" />
                    </div>

                    <div className="poster-content-g">
                      <div className="feedback-badge">
                        <span className="heart-icon">🤍</span> WE VALUE YOUR FEEDBACK
                      </div>
                      
                      <div className="review-us-text">Review us on</div>
                      <div className="google-logo-full">
                        <span className="g-blue">G</span><span className="g-red">o</span><span className="g-yellow">o</span><span className="g-blue">g</span><span className="g-green">l</span><span className="g-red">e</span>
                      </div>
                      
                      <div className="stars-row">
                        <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                      </div>
                      <p className="feedback-subtitle">
                        Your feedback helps us improve and<br/>helps others make the right choice.
                      </p>

                      <div className="qr-3d-container">
                        <div className="scan-me-badge">
                          <span className="scan-lines">↘</span> Scan me <span className="scan-lines">↙</span>
                        </div>
                        <div className="qr-code-canvas" ref={qrRef}></div>
                      </div>
                      
                      <div className="thank-you-script">Thank you!</div>
                      <div className="for-support">for your support</div>
                    </div>
                    
                    <div className="google-footer">
                      <div className="footer-business-info">
                        <div className="gmb-icon">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg" alt="GMB" />
                        </div>
                        <div className="b-details">
                          <div className="b-name">{businessName || 'Your Business Name'}</div>
                          <div className="b-tagline"><span className="pin">📍</span> Your Tagline Here</div>
                        </div>
                      </div>
                      <div className="footer-website-g">
                        🌐 www.yourwebsite.com
                      </div>
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
              <button type="button" className="primary-button" onClick={handleDownload} disabled={!qrLink}>Download PNG</button>
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
                    <span>{item.businessType} • {new Date(item.createdAt).toLocaleDateString()}</span>
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
