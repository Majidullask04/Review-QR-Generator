import { useState, useEffect, useRef, useCallback } from 'react'
import QRCodeStyling from 'qr-code-styling'
import html2canvas from 'html2canvas'
import './App.css'

// Default sample matching the user's provided link
const DEFAULT_SAMPLE = {
  name: 'Ramoji Film City',
  location: 'Hyderabad • Telangana',
  reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJlVOHr4oJyzsRG2cIAmyERMM',
}

const STORAGE_KEY_API_KEY = 'google_places_api_key'

// Helper to ensure link is direct Google Review dialog (NOT Maps overview)
function toDirectReviewUrl(input) {
  if (!input) return ''
  const trimmed = input.trim()

  // 1. If already writereview URL
  if (trimmed.includes('writereview') && trimmed.includes('placeid=')) {
    return trimmed
  }

  // 2. If raw Place ID (e.g. ChIJ...)
  if (trimmed.startsWith('ChIJ') && !trimmed.includes('http') && !trimmed.includes(' ')) {
    return `https://search.google.com/local/writereview?placeid=${trimmed}`
  }

  // 3. If URL with placeid param
  try {
    const url = new URL(trimmed)
    const pid = url.searchParams.get('placeid') || url.searchParams.get('place_id')
    if (pid) {
      return `https://search.google.com/local/writereview?placeid=${pid}`
    }
    // Check if ChIJ Place ID is embedded in maps URL
    const match = trimmed.match(/(ChIJ[a-zA-Z0-9_-]{20,})/)
    if (match && match[1]) {
      return `https://search.google.com/local/writereview?placeid=${match[1]}`
    }
  } catch {
    const match = trimmed.match(/(ChIJ[a-zA-Z0-9_-]{20,})/)
    if (match && match[1]) {
      return `https://search.google.com/local/writereview?placeid=${match[1]}`
    }
  }

  return trimmed
}

export default function App() {
  // Simple Input States
  const [reviewInput, setReviewInput] = useState(DEFAULT_SAMPLE.reviewUrl)
  const [businessName, setBusinessName] = useState(DEFAULT_SAMPLE.name)
  const [locationText, setLocationText] = useState(DEFAULT_SAMPLE.location)
  const [template, setTemplate] = useState('dark') // 'dark' | 'light'
  const [nfcLabel, setNfcLabel] = useState('NFC TAP')
  const [headerStyle, setHeaderStyle] = useState('natural') // 'natural' | 'bracketed' | 'none'
  const [viewMode, setViewMode] = useState('flat') // 'flat' | 'mockup'

  // Active Generated Card State (Updated when user clicks "Generate QR Stand" or on init)
  const [generatedCard, setGeneratedCard] = useState({
    businessName: DEFAULT_SAMPLE.name,
    locationText: DEFAULT_SAMPLE.location,
    reviewUrl: DEFAULT_SAMPLE.reviewUrl,
    template: 'dark',
    nfcLabel: 'NFC TAP',
    headerStyle: 'natural'
  })

  // QR Code Image Data URL
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [justGenerated, setJustGenerated] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Google Places Search (Optional helper)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')

  const cardRef = useRef(null)
  const qrStylingInstance = useRef(null)

  // Initialize QR Code Styling instance with EXACT rounded design from user image:
  // - extra-rounded corner squares
  // - dot inner corner
  // - rounded matrix dots
  useEffect(() => {
    qrStylingInstance.current = new QRCodeStyling({
      width: 480,
      height: 480,
      type: 'canvas',
      margin: 8,
      qrOptions: {
        errorCorrectionLevel: 'Q'
      },
      dotsOptions: {
        type: 'rounded',
        color: '#111827'
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
        color: '#111827'
      },
      cornersDotOptions: {
        type: 'dot',
        color: '#111827'
      },
      backgroundOptions: {
        color: '#ffffff'
      }
    })
  }, [])

  // Function to render styled QR code as high-res PNG image
  const renderQrImage = useCallback(async (url) => {
    if (!url || !qrStylingInstance.current) return
    setIsGenerating(true)
    try {
      qrStylingInstance.current.update({ data: url })
      const blob = await qrStylingInstance.current.getRawData('png')
      if (blob) {
        const objectUrl = URL.createObjectURL(blob)
        setQrImageUrl(objectUrl)
      }
    } catch (err) {
      console.error('Error styling QR code:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // Initial QR code generation on mount
  useEffect(() => {
    renderQrImage(DEFAULT_SAMPLE.reviewUrl)
  }, [renderQrImage])

  // Process input link changes (auto-format to direct review dialog)
  const handleLinkInputChange = (val) => {
    setReviewInput(val)
  }

  // ==========================================
  // 1. GENERATE BUTTON ACTION
  // ==========================================
  const handleGenerate = async () => {
    const formattedUrl = toDirectReviewUrl(reviewInput) || reviewInput.trim()

    // Update the active generated card
    setGeneratedCard({
      businessName: businessName.trim() || 'Business Name',
      locationText: locationText.trim(),
      reviewUrl: formattedUrl,
      template,
      nfcLabel,
      headerStyle
    })

    // Update input box to show formatted URL if changed
    setReviewInput(formattedUrl)

    // Render the custom styled QR code
    await renderQrImage(formattedUrl)

    // Flash feedback on the generate button
    setJustGenerated(true)
    setTimeout(() => setJustGenerated(false), 2000)
  }

  // ==========================================
  // 2. DOWNLOAD BUTTON ACTION (SEPARATE)
  // ==========================================
  const handleDownloadStand = async () => {
    if (!cardRef.current) return
    setIsDownloading(true)

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Crisp 3x print resolution
        useCORS: true,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.getElementById('google-review-card')
          if (clonedCard) {
            // Remove box-shadow and 3D tilts so the export has 0 shadow bleeding or corner artifacts
            clonedCard.style.boxShadow = 'none'
            clonedCard.style.transform = 'none'
            clonedCard.style.filter = 'none'

            // Also reset parent assembly transform in clone
            const parentAssembly = clonedCard.closest('.acrylic-stand-assembly')
            if (parentAssembly) {
              parentAssembly.style.transform = 'none'
            }

            // Remove sheen overlays that lighten black to grey
            const bevel = clonedCard.querySelector('.acrylic-bevel')
            if (bevel) {
              bevel.style.display = 'none'
            }

            // Guarantee 100% full pure black for dark theme
            if (generatedCard.template === 'dark') {
              clonedCard.style.backgroundColor = '#000000'
              clonedCard.style.background = '#000000'
              clonedCard.style.color = '#ffffff'
              clonedCard.style.border = '1px solid rgba(255, 255, 255, 0.15)'
            } else {
              clonedCard.style.backgroundColor = '#ffffff'
              clonedCard.style.background = '#ffffff'
              clonedCard.style.color = '#0f172a'
              clonedCard.style.border = '1px solid #cbd5e1'
            }
          }
        }
      })

      const link = document.createElement('a')
      const cleanName = (generatedCard.businessName || 'google-review-stand')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      link.download = `${cleanName}-${generatedCard.template}-stand.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Download error:', err)
      alert('Could not download stand image. Please try Print or take a screenshot.')
    } finally {
      setIsDownloading(false)
    }
  }

  // Download QR code only
  const handleDownloadQrOnly = async () => {
    if (!qrStylingInstance.current) return
    try {
      await qrStylingInstance.current.download({
        name: `${(generatedCard.businessName || 'review').toLowerCase().replace(/\s+/g, '-')}-qr`,
        extension: 'png'
      })
    } catch (err) {
      console.error('Error downloading QR only:', err)
    }
  }

  // Copy direct review link
  const handleCopyLink = async () => {
    const url = generatedCard.reviewUrl || toDirectReviewUrl(reviewInput)
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // ignore
    }
  }

  // Places search handling
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchError('')
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), apiKey: apiKey.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.error || 'Failed to search places.')
        setSearchResults([])
      } else {
        setSearchResults(data.places || [])
      }
    } catch {
      setSearchError('Could not reach search service. You can paste the link directly.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectPlace = (place) => {
    setBusinessName(place.name)
    const parts = place.address.split(',')
    const city = parts.slice(1, 3).join(',').trim() || place.address
    setLocationText(city)
    setReviewInput(place.reviewUrl)
    setShowSearch(false)
    setSearchResults([])
  }

  return (
    <div className="simple-app">
      {/* Top Navbar */}
      <header className="simple-header">
        <div className="header-brand">
          <img src="/review-clean.png" alt="Google Review Icon" className="header-logo" />
          <div>
            <h1 className="header-title">Google Review Link & Stand Generator</h1>
            <p className="header-tagline">Direct Review Dialog Link (No Maps Overview) • Custom Rounded QR</p>
          </div>
        </div>

        <div className="header-right">
          <button
            type="button"
            className={`key-badge-btn ${apiKey ? 'active' : ''}`}
            onClick={() => {
              setTempApiKey(apiKey)
              setShowApiKeyModal(true)
            }}
          >
            🔑 {apiKey ? 'Places API Active' : 'Configure Places Key (Optional)'}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="simple-grid">
        {/* Left Column: Simple Inputs & Actions */}
        <div className="simple-controls">
          {/* Box 1: Link & Place ID */}
          <div className="control-card">
            <div className="card-header-row">
              <label className="main-label" htmlFor="reviewLinkInput">
                1. Google Review Link or Place ID
              </label>
              <button
                type="button"
                className="search-toggle-btn"
                onClick={() => setShowSearch(!showSearch)}
              >
                {showSearch ? '✕ Close Search' : '🔍 Search on Maps'}
              </button>
            </div>

            {/* Optional Places Search Box */}
            {showSearch && (
              <div className="places-search-box">
                <div className="search-input-group">
                  <input
                    type="text"
                    className="styled-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g. Ramoji Film City or Tony's Pizza"
                  />
                  <button
                    type="button"
                    className="search-submit-btn"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? '...' : 'Search'}
                  </button>
                </div>
                {searchError && <p className="search-err-msg">{searchError}</p>}
                {searchResults.length > 0 && (
                  <ul className="places-results-list">
                    {searchResults.map((p) => (
                      <li key={p.placeId} onClick={() => handleSelectPlace(p)}>
                        <strong>{p.name}</strong>
                        <span>{p.address}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="input-wrap">
              <input
                id="reviewLinkInput"
                type="text"
                className="styled-input link-input"
                value={reviewInput}
                onChange={(e) => handleLinkInputChange(e.target.value)}
                placeholder="https://search.google.com/local/writereview?placeid=... or ChIJ..."
              />
            </div>

            {/* Link Mode Indicator */}
            <div className="direct-link-badge">
              <span className="check-dot">✓</span>
              <span>
                <strong>Direct Review Dialog Mode:</strong> When scanned, this opens Google&apos;s 5-star review box immediately instead of browsing the map.
              </span>
            </div>
          </div>

          {/* Box 2: Business Details */}
          <div className="control-card">
            <div className="card-header-row">
              <label className="main-label">2. Business Stand Text</label>
              <div className="header-style-pills">
                <button
                  type="button"
                  className={`mini-pill ${headerStyle === 'natural' ? 'active' : ''}`}
                  onClick={() => {
                    setHeaderStyle('natural')
                    setGeneratedCard((prev) => ({ ...prev, headerStyle: 'natural' }))
                  }}
                  title="Natural typography without artificial brackets"
                >
                  ✨ Natural
                </button>
                <button
                  type="button"
                  className={`mini-pill ${headerStyle === 'bracketed' ? 'active' : ''}`}
                  onClick={() => {
                    setHeaderStyle('bracketed')
                    setGeneratedCard((prev) => ({ ...prev, headerStyle: 'bracketed' }))
                  }}
                  title="Placeholder bracket format: [ Name / Location ]"
                >
                  [ ] Bracketed
                </button>
                <button
                  type="button"
                  className={`mini-pill ${headerStyle === 'none' ? 'active' : ''}`}
                  onClick={() => {
                    setHeaderStyle('none')
                    setGeneratedCard((prev) => ({ ...prev, headerStyle: 'none' }))
                  }}
                  title="Hide top business header (Google only)"
                >
                  🚫 Stand Only
                </button>
              </div>
            </div>

            <div className="fields-grid">
              <div className="field-block">
                <label className="sub-label" htmlFor="bizName">Business Name</label>
                <input
                  id="bizName"
                  type="text"
                  className="styled-input"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value)
                    setGeneratedCard((prev) => ({ ...prev, businessName: e.target.value }))
                  }}
                  placeholder="e.g. Ramoji Film City"
                />
              </div>

              <div className="field-block">
                <label className="sub-label" htmlFor="bizLoc">Location / Subtitle</label>
                <input
                  id="bizLoc"
                  type="text"
                  className="styled-input"
                  value={locationText}
                  onChange={(e) => {
                    setLocationText(e.target.value)
                    setGeneratedCard((prev) => ({ ...prev, locationText: e.target.value }))
                  }}
                  placeholder="e.g. Hyderabad • Telangana"
                />
              </div>
            </div>
          </div>

          {/* Box 3: Template Style */}
          <div className="control-card">
            <label className="main-label">3. Select Card Template</label>
            <div className="template-picker">
              <button
                type="button"
                className={`template-choice dark ${template === 'dark' ? 'active' : ''}`}
                onClick={() => setTemplate('dark')}
              >
                <div className="color-swatch swatch-dark" />
                <div className="choice-text">
                  <strong>Matte Black Acrylic</strong>
                  <span>Dark luxury stand card</span>
                </div>
              </button>

              <button
                type="button"
                className={`template-choice light ${template === 'light' ? 'active' : ''}`}
                onClick={() => setTemplate('light')}
              >
                <div className="color-swatch swatch-light" />
                <div className="choice-text">
                  <strong>Frost White Acrylic</strong>
                  <span>Crisp clean white stand</span>
                </div>
              </button>
            </div>

            <div className="nfc-label-row">
              <label className="sub-label" htmlFor="nfcLabelInput">Action Icon Label</label>
              <div className="nfc-radio-group">
                {['NFC TAP', 'TAP', 'SCAN & TAP'].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    className={`mini-pill ${nfcLabel === lbl ? 'active' : ''}`}
                    onClick={() => setNfcLabel(lbl)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEPARATE GENERATE & DOWNLOAD BUTTON BAR                  */}
          {/* ========================================================= */}
          <div className="primary-action-bar">
            {/* 1. GENERATE BUTTON */}
            <button
              type="button"
              className={`big-btn generate-btn ${justGenerated ? 'success-pulse' : ''}`}
              onClick={handleGenerate}
              disabled={isGenerating || !reviewInput.trim()}
            >
              <span className="btn-icon">✨</span>
              {isGenerating ? 'Generating...' : justGenerated ? '✓ Stand Generated!' : 'Generate QR Stand'}
            </button>

            {/* 2. DOWNLOAD BUTTON (SEPARATE) */}
            <button
              type="button"
              className="big-btn download-btn"
              onClick={handleDownloadStand}
              disabled={isDownloading || isGenerating}
            >
              <span className="btn-icon">📥</span>
              {isDownloading ? 'Saving PNG...' : 'Download Stand (PNG)'}
            </button>
          </div>

          {/* Secondary Quick Utilities */}
          <div className="quick-tools-row">
            <button
              type="button"
              className="tool-btn"
              onClick={handleDownloadQrOnly}
            >
              <span>🔳 Download QR Only</span>
            </button>

            <button
              type="button"
              className="tool-btn"
              onClick={() => window.print()}
            >
              <span>🖨️ Print Card</span>
            </button>

            <button
              type="button"
              className="tool-btn"
              onClick={handleCopyLink}
            >
              <span>{copiedLink ? '✓ Copied!' : '🔗 Copy Direct Link'}</span>
            </button>

            <a
              href={generatedCard.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tool-btn test-link"
            >
              <span>↗️ Test Review Box</span>
            </a>
          </div>
        </div>

        {/* Right Column: Live Stand Card Preview */}
        <div className="simple-preview">
          <div className="preview-sticky">
            {/* View Mode Toggle */}
            <div className="view-mode-bar">
              <div className="toggle-capsule">
                <button
                  type="button"
                  className={`capsule-item ${viewMode === 'flat' ? 'active' : ''}`}
                  onClick={() => setViewMode('flat')}
                >
                  🪪 Print Card View
                </button>
                <button
                  type="button"
                  className={`capsule-item ${viewMode === 'mockup' ? 'active' : ''}`}
                  onClick={() => setViewMode('mockup')}
                >
                  🛋️ 3D Table Stand Mockup
                </button>
              </div>

              <span className="template-indicator">
                {generatedCard.template === 'dark' ? 'Matte Black' : 'Frost White'}
              </span>
            </div>

            {/* Card Frame Container */}
            <div className={`stand-canvas-area ${viewMode === 'mockup' ? 'is-mockup-mode' : ''}`}>
              {viewMode === 'mockup' && (
                <div className="table-backdrop">
                  <div className="table-surface" />
                </div>
              )}

              <div className={`acrylic-stand-assembly ${viewMode === 'mockup' ? 'mockup-tilt' : ''}`}>
                {/* Physical Card */}
                <div
                  ref={cardRef}
                  id="google-review-card"
                  className={`physical-stand-card ${generatedCard.template === 'dark' ? 'theme-dark' : 'theme-light'}`}
                >
                  {/* Subtle bevel sheen */}
                  <div className="acrylic-bevel" />

                  {/* Top Header: Natural Brand Styling (or bracketed / hidden) */}
                  {generatedCard.headerStyle === 'natural' && (
                    <div className="card-natural-header">
                      <div className="card-biz-name">
                        {generatedCard.businessName || 'Business Name'}
                      </div>
                      {generatedCard.locationText && (
                        <div className="card-biz-location">
                          {generatedCard.locationText}
                        </div>
                      )}
                    </div>
                  )}

                  {generatedCard.headerStyle === 'bracketed' && (
                    <div className="card-top-tag">
                      [ {generatedCard.businessName} {generatedCard.locationText ? `/ ${generatedCard.locationText}` : ''} ]
                    </div>
                  )}

                  {/* Review us on */}
                  <div className="card-review-us-text">
                    Review us on
                  </div>

                  {/* Multi-Color Google Wordmark */}
                  <div className="card-google-wordmark" aria-label="Google">
                    <span className="g-blue">G</span>
                    <span className="g-red">o</span>
                    <span className="g-yellow">o</span>
                    <span className="g-blue">g</span>
                    <span className="g-green">l</span>
                    <span className="g-red">e</span>
                  </div>

                  {/* 5 Amber/Gold Stars */}
                  <div className="card-stars-row">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="star-char">★</span>
                    ))}
                  </div>

                  {/* Segmented Google 4-Color Accent Stripe: Red, Green, Blue, Yellow */}
                  <div className="card-stripe-bar">
                    <span className="segment-red" />
                    <span className="segment-green" />
                    <span className="segment-blue" />
                    <span className="segment-yellow" />
                  </div>

                  {/* QR Code Container with EXACT Rounded Corner Brackets from Reference */}
                  <div className="card-qr-box">
                    <div className="bracket bracket-tl" />
                    <div className="bracket bracket-tr" />
                    <div className="bracket bracket-bl" />
                    <div className="bracket bracket-br" />

                    <div className="qr-inner-frame">
                      {qrImageUrl ? (
                        <img
                          src={qrImageUrl}
                          alt={`Direct Google Review QR Code for ${generatedCard.businessName}`}
                          className="styled-qr-img"
                        />
                      ) : (
                        <div className="qr-loading-box">
                          <span>Rendering QR...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Row: NFC TAP | OR | SCAN */}
                  <div className="card-bottom-row">
                    {/* Left: NFC Phone Wave */}
                    <div className="bot-action-item">
                      <svg className="bot-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                        <path d="M12 18 C10 21, 10 27, 12 30" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M7 14 C4 19, 4 29, 7 34" strokeWidth="2.5" strokeLinecap="round" />
                        <rect x="18" y="8" width="22" height="34" rx="4" strokeWidth="2.5" />
                        <line x1="26" y1="12" x2="32" y2="12" strokeWidth="2" strokeLinecap="round" />
                        <line x1="26" y1="38" x2="32" y2="38" strokeWidth="2" strokeLinecap="round" />
                        <path d="M25 24 C27 22, 29 22, 31 24" strokeWidth="2" strokeLinecap="round" />
                        <path d="M23 27 C26 24, 30 24, 33 27" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span className="bot-label">{generatedCard.nfcLabel}</span>
                    </div>

                    {/* Center: OR */}
                    <div className="bot-or-text">
                      OR
                    </div>

                    {/* Right: Phone Scanner */}
                    <div className="bot-action-item">
                      <svg className="bot-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                        <rect x="13" y="6" width="22" height="36" rx="4" strokeWidth="2.5" />
                        <line x1="21" y1="10" x2="27" y2="10" strokeWidth="2" strokeLinecap="round" />
                        <path d="M19 19 H17 V21" strokeWidth="2" strokeLinecap="round" />
                        <path d="M29 19 H31 V21" strokeWidth="2" strokeLinecap="round" />
                        <path d="M19 29 H17 V27" strokeWidth="2" strokeLinecap="round" />
                        <path d="M29 29 H31 V27" strokeWidth="2" strokeLinecap="round" />
                        <rect x="22" y="22" width="4" height="4" fill="currentColor" />
                        <circle cx="24" cy="38" r="1.5" fill="currentColor" />
                      </svg>
                      <span className="bot-label">SCAN</span>
                    </div>
                  </div>
                </div>

                {/* 3D Acrylic Stand Base */}
                {viewMode === 'mockup' && (
                  <div className="acrylic-stand-foot" />
                )}
              </div>
            </div>

            <p className="preview-note">
              300DPI Print Ratio (Standard 4×6 inch / A6 Table Stand)
            </p>
          </div>
        </div>
      </main>

      {/* Places API Key Modal */}
      {showApiKeyModal && (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>Google Places API Key</h3>
              <button
                type="button"
                className="modal-x"
                onClick={() => setShowApiKeyModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-content">
              <p>
                Optional: Enter your Google Places API Key to search businesses directly by name.
              </p>
              <input
                type="password"
                className="styled-input"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
              />
              <p className="modal-hint">
                Stored safely in your local browser storage (`localStorage`).
              </p>
            </div>
            <div className="modal-bottom">
              <button
                type="button"
                className="tool-btn"
                onClick={() => {
                  setTempApiKey('')
                  setApiKey('')
                  localStorage.removeItem(STORAGE_KEY_API_KEY)
                  setShowApiKeyModal(false)
                }}
              >
                Remove
              </button>
              <button
                type="button"
                className="big-btn generate-btn"
                style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                onClick={() => {
                  const trimmed = tempApiKey.trim()
                  setApiKey(trimmed)
                  if (trimmed) localStorage.setItem(STORAGE_KEY_API_KEY, trimmed)
                  else localStorage.removeItem(STORAGE_KEY_API_KEY)
                  setShowApiKeyModal(false)
                }}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
