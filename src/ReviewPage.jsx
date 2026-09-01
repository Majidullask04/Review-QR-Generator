import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import './ReviewPage.css'

const TYPE_CONTEXTS = {
  restaurant: 'a restaurant/cafe. Mention specific dishes, food quality, ambiance, service speed, cleanliness, and value for money.',
  salon: 'a salon/barber/spa. Mention haircut quality, staff skill, hygiene, waiting time, products used, and overall experience.',
  gym: 'a gym/fitness center. Mention equipment quality, cleanliness, trainer knowledge, crowd levels, membership value, and atmosphere.',
  hotel: 'a hotel/inn/B&B. Mention room cleanliness, bed comfort, staff service, amenities, location, breakfast quality, and value.',
  retail: 'a retail shop/store. Mention product variety, staff helpfulness, store layout, pricing, return policy, and shopping experience.',
  medical: 'a clinic/hospital/dental. Mention doctor expertise, wait time, staff behavior, facility cleanliness, billing transparency, and care quality.',
  automotive: 'an auto repair/car wash. Mention service quality, pricing fairness, wait time, staff honesty, and vehicle care.',
  education: 'a school/tutoring center. Mention teaching quality, course material, instructor knowledge, facility, and value for money.',
}

const isGoogleReviewUrl = (value) => {
  if (!value) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return ['google.com', 'g.page', 'search.google.com', 'business.google.com']
      .some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

const generateReviews = async (rating, businessName, businessType, customerContext, businessGuidance, locationAbout) => {
  const typeContext = TYPE_CONTEXTS[businessType] || TYPE_CONTEXTS.restaurant;
  
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      rating, 
      businessName,
      businessType,
      typeContext,
      customerContext,
      businessGuidance,
      locationAbout
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${res.status}`);
  }

  const data = await res.json();
  const reviews = data.reviews || [];
  
  return Array.isArray(reviews)
    ? reviews.filter((item) => typeof item === 'string' && item.trim()).slice(0, 5)
    : [];
};

function StarRating({ rating, setRating, interactive = true }) {
  return (
    <div className="star-rating" role={interactive ? 'radiogroup' : undefined} aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star <= rating}
          className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onClick={() => interactive && setRating(star)}
          disabled={!interactive}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function ReviewPage() {
  const [searchParams] = useSearchParams()
  const targetUrl = searchParams.get('target') || ''
  const businessName = searchParams.get('name') || 'this business'
  const businessType = searchParams.get('type') || 'restaurant'
  const businessGuidance = searchParams.get('guidance') || ''
  const locationAbout = searchParams.get('about') || ''
  const hasValidTarget = isGoogleReviewUrl(targetUrl)

  const [step, setStep] = useState(1)
  const [rating, setRating] = useState(0)
  const [reviews, setReviews] = useState([])
  const [selectedReview, setSelectedReview] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [customerContext, setCustomerContext] = useState('')

  useEffect(() => {
    if (!hasValidTarget && targetUrl) {
      setError('Invalid review link. Please scan a valid QR code.')
    }
  }, [hasValidTarget, targetUrl])

  const copyText = useCallback(async () => {
    if (!selectedReview) return
    try {
      await navigator.clipboard.writeText(selectedReview)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }, [selectedReview])

  const handleRate = useCallback((stars) => {
    setRating(stars)
    setError('')
  }, [])

  const handleGenerateReview = useCallback(async () => {
    if (!hasValidTarget) {
      setError('Cannot generate review: invalid business link.')
      return
    }
    if (rating === 0) {
      setError('Please select a star rating first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const generated = await generateReviews(rating, businessName, businessType, customerContext, businessGuidance, locationAbout)
      if (!generated.length) throw new Error('No review options returned')
      setReviews(generated)
      setStep(2)
    } catch (err) {
      setError(err.message || 'Failed to generate reviews. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [hasValidTarget, rating, businessName, businessType, customerContext, businessGuidance, locationAbout])

  const handleDirectRedirect = useCallback(() => {
    if (hasValidTarget && targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    } else {
      setError('Invalid business link.')
    }
  }, [hasValidTarget, targetUrl])

  const handleSelectReview = useCallback((review) => {
    setSelectedReview(review)
    setStep(3)
  }, [])

  const copyAndRedirect = useCallback(async () => {
    if (!hasValidTarget || !selectedReview) return
    
    let clipboardSuccess = false
    try {
      await navigator.clipboard.writeText(selectedReview)
      setCopied(true)
      clipboardSuccess = true
    } catch {
      clipboardSuccess = false
    }
    
    const openReview = () => {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    }
    
    if (clipboardSuccess) {
      openReview()
    } else {
      openReview()
      setError('Could not auto-copy. Please copy the review manually.')
    }
  }, [hasValidTarget, selectedReview, targetUrl])

  const goBack = useCallback(() => {
    if (step === 3) { setStep(2); setSelectedReview('') }
    else if (step === 2) { setStep(1); setRating(0); setReviews([]) }
  }, [step])

  return (
    <div className="review-page">
      <div className="review-card">
        <div className="review-header">
          <div className="logo-mark">★</div>
          <h1>{businessName}</h1>
          <p>Share your real experience with others</p>
        </div>

        <div className="progress-bar" aria-hidden="true">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-line ${step >= 2 ? 'active' : ''}`} />
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-line ${step >= 3 ? 'active' : ''}`} />
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        {step === 1 && (
          <div className="step-content">
            <h2>How was your experience at {businessName}?</h2>
            <p className="step-subtitle">Tap the stars to rate</p>
            <StarRating rating={rating} setRating={handleRate} />
            {rating > 0 && (
              <p className="rating-label">
                {rating === 5 ? 'Excellent!' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
              </p>
            )}
            <label className="context-label" htmlFor="customerContext">
              What would you like to mention? <span>Optional, but makes the draft more personal</span>
            </label>
            <textarea
              id="customerContext"
              className="experience-input"
              rows={4}
              maxLength={600}
              value={customerContext}
              onChange={(e) => setCustomerContext(e.target.value.slice(0, 600))}
              placeholder="e.g. I tried the ramen, our server was Sam, and the wait was about 10 minutes"
            />
            <p className="truth-note">The AI only uses details you provide. Please review and edit the draft so it reflects your real experience.</p>
            
            <div className="action-buttons" style={{ marginTop: '24px' }}>
              <button 
                className="primary-button" 
                onClick={handleGenerateReview} 
                disabled={loading || rating === 0}
              >
                {loading ? 'Generating...' : '✨ Generate AI Review'}
              </button>
              <button 
                className="secondary-button" 
                onClick={handleDirectRedirect}
              >
                Write Directly on Google
              </button>
            </div>
            {loading && (
              <div className="loading-state">
                <div className="spinner small" />
                <p>AI is writing your {businessType} review options...</p>
              </div>
            )}
            {error && <p className="error-text" role="alert">{error}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <div className="step-header-row">
              <button className="back-btn" onClick={goBack}>← Back</button>
              <div className="your-rating">
                Your rating: <StarRating rating={rating} interactive={false} />
              </div>
            </div>
            <h2>Pick a review to post</h2>
            <p className="step-subtitle">AI generated these for a {businessType}</p>
            <div className="reviews-list">
              {reviews.map((review, idx) => (
                <button
                  key={idx}
                  className={`review-option ${selectedReview === review ? 'selected' : ''}`}
                  onClick={() => handleSelectReview(review)}
                >
                  <span className="review-number">{idx + 1}</span>
                  <p>{review}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <div className="step-header-row">
              <button className="back-btn" onClick={goBack}>← Back</button>
            </div>
            <h2>Almost done!</h2>
            <p className="step-subtitle">Your review is ready to paste</p>
            <label className="context-label" htmlFor="selectedReview">Edit your review before posting</label>
            <textarea 
              id="selectedReview" 
              className="experience-input selected-review-input" 
              rows={5} 
              value={selectedReview} 
              onChange={(e) => setSelectedReview(e.target.value.slice(0, 500))} 
            />
            <div className="action-buttons">
              <button className="primary-button large" onClick={copyAndRedirect} disabled={!hasValidTarget}>
                <span className="btn-icon" aria-hidden="true">📋</span>
                {copied ? 'Copied! Open Google Reviews →' : 'Copy Review & Open Google'}
              </button>
              <button className="secondary-button" onClick={copyText}>
                Copy Text Only
              </button>
            </div>
            {!hasValidTarget && <p className="error-text" role="alert">This review link is invalid. Please ask the business for a new QR code.</p>}
            {copied && (
              <div className="success-hint">
                <p>✅ Review copied! Paste it on the Google page that just opened.</p>
                <p className="small">Didn't open? <a href={targetUrl} target="_blank" rel="noopener noreferrer">Click here</a></p>
              </div>
            )}
          </div>
        )}

        <div className="review-footer">
          <p>Powered by AI Review Assistant</p>
        </div>
      </div>
    </div>
  )
}
