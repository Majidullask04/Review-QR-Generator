import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import './ReviewPage.css'

const generateReviews = async (rating, businessName) => {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, businessName })
    })
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (err) {
    console.error('Gemini error:', err)
    // Fallback reviews
    const fallbacks = {
      5: [
        `Amazing experience at ${businessName}! The food was incredible and service was top-notch. Highly recommend!`,
        `Best meal I've had in ages. ${businessName} exceeded all expectations. Will definitely be back!`,
        `Loved everything about ${businessName}. Great atmosphere, delicious food, friendly staff. 10/10!`,
        `${businessName} is a hidden gem! Fresh ingredients, generous portions, and reasonable prices.`,
        `Outstanding! The flavors at ${businessName} were absolutely divine. A must-visit spot.`
      ],
      4: [
        `Really enjoyed our meal at ${businessName}. Great food, just a small wait time. Would come back!`,
        `Solid choice for dinner. ${businessName} has great vibes and tasty dishes. Recommended!`,
        `Good food and nice ambiance at ${businessName}. Service could be a touch faster but overall great.`,
        `Pleasant surprise! ${businessName} delivered quality food at fair prices. Happy customer.`
      ],
      3: [
        `Decent experience at ${businessName}. Food was okay, nothing special. Might try again.`,
        `Average visit to ${businessName}. Some dishes were good, others just meh. Room for improvement.`,
        `${businessName} was alright. Prices a bit high for what you get, but service was friendly.`
      ],
      2: [
        `Disappointed with ${businessName}. Food took too long and wasn't worth the wait.`,
        `Below average experience. ${businessName} needs to work on food quality and speed.`
      ],
      1: [
        `Terrible experience at ${businessName}. Cold food, rude staff, overpriced. Avoid.`,
        `Worst meal ever. ${businessName} was dirty, slow, and the food was inedible. Never again.`
      ]
    }
    return fallbacks[rating] || fallbacks[3]
  }
}

function StarRating({ rating, setRating, interactive = true }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onClick={() => interactive && setRating(star)}
          disabled={!interactive}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function ReviewPage() {
  const { businessId } = useParams()
  const [searchParams] = useSearchParams()
  const targetUrl = searchParams.get('target') || ''
  const businessName = searchParams.get('name') || 'this restaurant'

  const [step, setStep] = useState(1) // 1: rating, 2: select review, 3: copy & redirect
  const [rating, setRating] = useState(0)
  const [reviews, setReviews] = useState([])
  const [selectedReview, setSelectedReview] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleRate = async (stars) => {
    setRating(stars)
    setLoading(true)
    setError('')
    try {
      const generated = await generateReviews(stars, businessName)
      setReviews(generated)
      setStep(2)
    } catch (err) {
      setError('Failed to generate reviews. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectReview = (review) => {
    setSelectedReview(review)
    setStep(3)
  }

  const copyAndRedirect = async () => {
    try {
      await navigator.clipboard.writeText(selectedReview)
      setCopied(true)
      // Open Google review page in new tab
      window.open(targetUrl, '_blank')
    } catch {
      // Fallback: just open Google
      window.open(targetUrl, '_blank')
    }
  }

  const goBack = () => {
    if (step === 3) { setStep(2); setSelectedReview('') }
    else if (step === 2) { setStep(1); setRating(0); setReviews([]) }
  }

  return (
    <div className="review-page">
      <div className="review-card">
        {/* Header */}
        <div className="review-header">
          <div className="logo-mark">★</div>
          <h1>{businessName}</h1>
          <p>Help others by sharing your experience</p>
        </div>

        {/* Progress */}
        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-line ${step >= 2 ? 'active' : ''}`} />
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-line ${step >= 3 ? 'active' : ''}`} />
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        {/* STEP 1: Rating */}
        {step === 1 && (
          <div className="step-content">
            <h2>How was your experience?</h2>
            <p className="step-subtitle">Tap the stars to rate</p>
            
            <StarRating rating={rating} setRating={handleRate} />
            
            {rating > 0 && (
              <p className="rating-label">
                {rating === 5 ? 'Excellent!' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
              </p>
            )}

            {loading && (
              <div className="loading-state">
                <div className="spinner small" />
                <p>AI is writing your review options...</p>
              </div>
            )}

            {error && <p className="error-text">{error}</p>}
          </div>
        )}

        {/* STEP 2: Select Review */}
        {step === 2 && (
          <div className="step-content">
            <div className="step-header-row">
              <button className="back-btn" onClick={goBack}>← Back</button>
              <div className="your-rating">
                Your rating: <StarRating rating={rating} interactive={false} />
              </div>
            </div>

            <h2>Pick a review to post</h2>
            <p className="step-subtitle">AI generated these based on your {rating}-star rating</p>

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

        {/* STEP 3: Copy & Redirect */}
        {step === 3 && (
          <div className="step-content">
            <div className="step-header-row">
              <button className="back-btn" onClick={goBack}>← Back</button>
            </div>

            <h2>Almost done!</h2>
            <p className="step-subtitle">Your review is ready to paste</p>

            <div className="selected-review-box">
              <p>{selectedReview}</p>
            </div>

            <div className="action-buttons">
              <button className="primary-button large" onClick={copyAndRedirect}>
                <span className="btn-icon">📋</span>
                {copied ? 'Copied! Open Google Reviews →' : 'Copy Review & Open Google'}
              </button>
              
              <button className="secondary-button" onClick={() => {navigator.clipboard.writeText(selectedReview); setCopied(true)}}>
                Copy Text Only
              </button>
            </div>

            {copied && (
              <div className="success-hint">
                <p>✅ Review copied! Paste it on the Google page that just opened.</p>
                <p className="small">Didn't open? <a href={targetUrl} target="_blank" rel="noopener noreferrer">Click here</a></p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="review-footer">
          <p>Powered by AI Review Assistant</p>
        </div>
      </div>
    </div>
  )
}
