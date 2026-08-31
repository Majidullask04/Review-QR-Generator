import { useEffect, useState, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import QRCodeStyling from 'qr-code-styling'
import html2canvas from 'html2canvas'
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
  if (!value?.trim()) return 'Please enter a Google review URL.'
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase()
    if (!ALLOWED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      return 'Must be a valid Google Review URL.'
    }
    return ''
  } catch {
    return 'Please enter a valid URL.'
  }
}

const STORAGE_KEY = 'review-qr-history-v4'
const MAX_HISTORY_ITEMS = 10

const readHistory = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(saved)) return []
    return saved
      .filter((item) => item && typeof item === 'object' && item.id && item.googleUrl && item.reviewFlowUrl && item.qrDataUrl)
      .slice(0, MAX_HISTORY_ITEMS)
  } catch {
    return []
  }
}

function App() {
  const [inputUrl, setInputUrl] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('restaurant')
  const [customType, setCustomType] = useState('')
  const [reviewGuidance, setReviewGuidance] = useState('')
  const [locationAbout, setLocationAbout] = useState('')
  const [qrLink, setQrLink] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const posterRef = useRef(null)
  const qrRef = useRef(null)
  const copyTimeoutRef = useRef(null)

  const qrCodeStylingRef = useRef(null)

  useEffect(() => {
    qrCodeStylingRef.current = new QRCodeStyling({
      width: 220,
      height: 220,
      type: 'canvas',
      margin: 5,
      qrOptions: { errorCorrectionLevel: 'L' },
      dotsOptions: { color: '#000000', type: 'dots' },
      cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
      cornersDotOptions: { type: 'dot', color: '#000000' },
      backgroundOptions: { color: 'transparent' }
    })
    return () => {
      qrCodeStylingRef.current = null
    }
  }, [])

  const [history, setHistory] = useState(() => readHistory())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch {
      // Storage full or disabled
    }
  }, [history])

  useEffect(() => {
    if (qrLink && qrRef.current && qrCodeStylingRef.current) {
      qrCodeStylingRef.current.update({ data: qrLink })
      qrRef.current.innerHTML = ''
      qrCodeStylingRef.current.append(qrRef.current)
    }
  }, [qrLink])

  const updateInput = useCallback((value) => {
    setInputUrl(value)
    if (!value.trim()) { setError(''); return }
    setError(getValidationMessage(value))
  }, [])

  const getFinalBusinessType = useCallback(() => {
    return businessType === 'other' ? customType.trim() : businessType
  }, [businessType, customType])

  const generateQr = useCallback(async () => {
    const trimmedUrl = inputUrl.trim()
    const validationMessage = getValidationMessage(trimmedUrl)
    if (validationMessage) { setError(validationMessage); return }
    if (!getFinalBusinessType()) { setError('Please enter your business type.'); return }
    if (!businessName.trim()) { setError('Please enter your business name.'); return }

    setError('')
    setIsGenerating(true)

    try {
      const businessId = btoa(trimmedUrl).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      const baseUrl = window.location.origin
      const finalType = getFinalBusinessType()
      const safeBusinessName = businessName.trim().slice(0, 120)
      
      const reviewFlowUrl = `${baseUrl}/review/${businessId}?target=${encodeURIComponent(trimmedUrl)}&name=${encodeURIComponent(safeBusinessName)}&type=${encodeURIComponent(finalType)}&guidance=${encodeURIComponent(reviewGuidance.trim().slice(0, 500))}&about=${encodeURIComponent(locationAbout.trim().slice(0, 300))}`

      const thumbDataUrl = await QRCode.toDataURL(reviewFlowUrl, {
        width: 100, margin: 1, color: { dark: '#000', light: '#fff' }
      })

      setQrLink(reviewFlowUrl)
      
      setHistory(prev => [{
        id: `${Date.now()}`,
        businessName: safeBusinessName,
        businessType: finalType,
        customType: businessType === 'other' ? customType.trim() : '',
        googleUrl: trimmedUrl,
        reviewFlowUrl,
        qrDataUrl: thumbDataUrl,
        locationAbout: locationAbout.trim().slice(0, 300),
        createdAt: Date.now(),
      }, ...prev].slice(0, MAX_HISTORY_ITEMS))
    } catch {
      setError('Failed to generate QR code. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [inputUrl, businessName, businessType, customType, reviewGuidance, locationAbout, getFinalBusinessType])

  const copyUrl = useCallback(async () => {
    if (!qrLink) return
    try {
      await navigator.clipboard.writeText(qrLink)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }, [qrLink])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (!qrLink || !posterRef.current) return
    setDownloadError('')
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 3, backgroundColor: null, useCORS: true })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      const safeName = (businessName || 'business')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'business'
      link.download = `${safeName}-google-poster.png`
      link.click()
    } catch {
      setDownloadError('Download failed. Please use Print or try again.')
    }
  }, [qrLink, businessName])

  const handleHistorySelect = useCallback((item) => {
    setInputUrl(item.googleUrl)
    setBusinessName(item.businessName)
    setReviewGuidance('')
    setLocationAbout(item.locationAbout || '')
    const isKnownType = BUSINESS_TYPES.some(t => t.value === item.businessType && t.value !== 'other')
    if (isKnownType) {
      setBusinessType(item.businessType)
      setCustomType('')
    } else {
      setBusinessType('other')
      setCustomType(item.customType || item.businessType)
    }
    setQrLink(item.reviewFlowUrl)
    setError('')
  }, [])

  return (
    <main className="page-shell">
      <section className="generator-card">
        <div className="hero-copy">
          <p className="eyebrow">Review QR Generator v4</p>
          <h1>AI-Powered Review QR Codes</h1>
          <p className="subtitle">
            Create a QR flow where customers can turn their real experience into an editable review draft.
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
              aria-invalid={!!error && !!inputUrl}
              aria-describedby={error && inputUrl ? 'url-error' : undefined}
            />
            <div className="field-row">
              <span className="helper-text">Paste your Google Business review link</span>
              <button type="button" className="link-button" onClick={() => updateInput('https://g.page/r/tonys-pizza/review')}>
                Try sample
              </button>
            </div>
            {error && inputUrl && <p id="url-error" className="error-text" role="alert">{error}</p>}

            <label className="field-label" htmlFor="bizName" style={{marginTop: '16px'}}>Business Name</label>
            <input
              id="bizName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter the name customers should see"
              maxLength={120}
              className="input"
            />
            <p className="field-note">Enter this manually so short Google links cannot fill in the wrong name.</p>

            <label className="field-label" htmlFor="locationAbout" style={{marginTop: '16px'}}>
              What is this location about?
            </label>
            <textarea
              id="locationAbout"
              value={locationAbout}
              onChange={(e) => setLocationAbout(e.target.value.slice(0, 300))}
              placeholder="e.g. We are a family-run cafe known for filter coffee, crispy dosas, and fast service. Mention our weekend brunch or Maya at the counter."
              className="input guidance-input"
              rows={3}
              maxLength={300}
            />
            <p className="field-note">
              This helps the AI write accurate, location-specific reviews. Customers will see this context too.
            </p>

            <label className="field-label" style={{marginTop: '16px'}}>What type of business is this?</label>
            <div className="business-type-grid" role="radiogroup" aria-label="Business type">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  role="radio"
                  aria-checked={businessType === type.value}
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
                aria-label="Custom business type"
              />
            )}

            <label className="field-label" htmlFor="reviewGuidance" style={{marginTop: '16px'}}>Optional review guidance</label>
            <textarea
              id="reviewGuidance"
              value={reviewGuidance}
              onChange={(e) => setReviewGuidance(e.target.value.slice(0, 500))}
              placeholder="What should customers remember? e.g. mention our weekend brunch or Maya at reception"
              className="input guidance-input"
              rows={3}
              maxLength={500}
            />
            <p className="field-note">This gives the AI useful context. Customers will still be asked for their own experience.</p>

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
                    <div className="wave wave-top-right" />
                    <div className="wave wave-bottom-left" />
                    <div className="floating-icon icon-left g-blue" aria-hidden="true">G</div>
                    <div className="floating-icon icon-right" aria-hidden="true">📍</div>
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
                        <div className="qr-code-canvas" ref={qrRef} />
                      </div>
                      <div className="thank-you-script">Thank you!</div>
                      <div className="for-support">for your support</div>
                    </div>
                    <div className="google-footer">
                      <div className="footer-business-info">
                        <div className="gmb-icon">
                          <span className="gmb-letter" aria-hidden="true">G</span>
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
            {downloadError && <p className="error-text" role="alert">{downloadError}</p>}
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
                  <img src={item.qrDataUrl} alt={`${item.businessName} preview`} loading="lazy" />
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
