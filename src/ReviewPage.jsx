import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import './ReviewPage.css'

// Type-specific context for AI
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

const generateReviews = async (rating, businessName, businessType) => {
  const typeContext = TYPE_CONTEXTS[businessType] || TYPE_CONTEXTS.restaurant
  
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        rating, 
        businessName,
        businessType,
        typeContext
      })
    })
    if (!res.ok) throw new Error(`API Error: ${res.status}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (err) {
    console.error('Gemini error:', err)
    return getFallbackReviews(rating, businessName, businessType)
  }
}

// Realistic fallback reviews per type
function getFallbackReviews(rating, businessName, type) {
  const fallbacks = {
    restaurant: {
      5: [
        `The butter chicken at ${businessName} was absolutely incredible! Perfect spice level and the garlic naan was fresh off the tandoor. Already planning my next visit.`,
        `Best biryani I've had in ages. ${businessName} nails the authentic flavors. The staff recommended the perfect wine pairing too. 10/10!`,
        `Hidden gem! The wood-fired pizzas at ${businessName} have that perfect char. Fresh ingredients, generous toppings, and the tiramisu is homemade.`,
        `Amazing family dinner at ${businessName}. The thali was loaded with variety, everything tasted fresh. Service was warm and attentive.`,
        `Outstanding! The sushi at ${businessName} was melt-in-your-mouth fresh. The chef's special roll is a must-try. Worth every penny.`
      ],
      4: [
        `Really enjoyed the pasta at ${businessName}. The carbonara was creamy and authentic. Only wish the bread basket was refilled faster.`,
        `Solid choice for brunch. ${businessName} has great pancakes and the coffee is strong. Gets busy on weekends so come early!`,
        `Good food and nice vibes at ${businessName}. The burger was juicy and fries were crispy. Service could be a touch quicker but overall great.`,
        `Pleasant surprise! ${businessName} delivered quality steaks at fair prices. The mashed potatoes were buttery perfection.`
      ],
      3: [
        `Decent meal at ${businessName}. The food was okay but nothing memorable. Might try a different dish next time.`,
        `Average experience at ${businessName}. Some dishes were good, others bland. Prices a bit high for the quality.`
      ],
      2: [
        `Disappointed with ${businessName}. Food took 45 mins and arrived cold. The manager didn't even apologize.`,
        `Below average. ${businessName} needs to work on food quality and kitchen speed. Won't be returning soon.`
      ],
      1: [
        `Terrible experience at ${businessName}. Found hair in my food, staff was rude, and they overcharged us. Avoid at all costs.`,
        `Worst meal ever. ${businessName} was dirty, the food tasted old, and the server ignored us. Never again.`
      ]
    },
    salon: {
      5: [
        `Best haircut I've had in years! The stylist at ${businessName} actually listened to what I wanted. The scalp massage during wash was heavenly.`,
        `Amazing color job at ${businessName}! My highlights look so natural. The staff is knowledgeable and the salon is spotless.`,
        `Love this place! The facial at ${businessName} left my skin glowing for days. Professional, hygienic, and relaxing atmosphere.`,
        `The beard trim at ${businessName} is top-notch. Precise lines, hot towel treatment, and great conversation. My new go-to barber.`
      ],
      4: [
        `Great haircut at ${businessName}. The stylist understood my reference photo perfectly. Slightly pricey but quality work.`,
        `Nice salon experience. ${businessName} has skilled staff and good products. Waited 15 mins past my appointment though.`
      ],
      3: [
        `Okay haircut, nothing special. ${businessName} was clean but the stylist seemed rushed. Average value for money.`
      ],
      2: [
        `Rushed service at ${businessName}. The haircut was uneven and they didn't even style it at the end. Disappointing.`
      ],
      1: [
        `Worst salon experience. The stylist at ${businessName} completely ignored my instructions and damaged my hair. Never going back.`
      ]
    },
    gym: {
      5: [
        `Best gym in the area! ${businessName} has top-tier equipment, never too crowded, and the trainers actually care about your form.`,
        `Transformed my fitness at ${businessName}. The group classes are energetic, lockers are clean, and the protein bar is reasonably priced.`,
        `Love the 24/7 access at ${businessName}. Equipment is well-maintained, showers are clean, and the community is motivating.`
      ],
      4: [
        `Good gym with solid equipment. ${businessName} has everything I need for my routine. Could use more squat racks during peak hours.`,
        `Nice facility at ${businessName}. Clean, organized, and friendly staff. Membership is a bit steep but the amenities justify it.`
      ],
      3: [
        `Average gym. ${businessName} has basic equipment but some machines are old. Gets too crowded after 6pm.`
      ],
      2: [
        `Disappointing. ${businessName} has broken equipment that stays unfixed for weeks. AC doesn't work properly either.`
      ],
      1: [
        `Terrible gym. ${businessName} charged me hidden fees, equipment is unsafe, and the staff is unhelpful. Canceling my membership.`
      ]
    }
  }
  
  const typeFallbacks = fallbacks[type] || fallbacks.restaurant
  const reviews = typeFallbacks[rating] || typeFallbacks[3] || ['Good experience.', 'Nice place.']
  
  // Shuffle the array and return up to 4 items so it's different every time
  return [...reviews].sort(() => Math.random() - 0.5).slice(0, 4)
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
  const businessName = searchParams.get('name') || 'this business'
  const businessType = searchParams.get('type') || 'restaurant'

  const [step, setStep] = useState(1)
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
      const generated = await generateReviews(stars, businessName, businessType)
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
      window.open(targetUrl, '_blank')
    } catch {
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
        <div className="review-header">
          <div className="logo-mark">★</div>
          <h1>{businessName}</h1>
          <p>Help others by sharing your experience</p>
        </div>

        <div className="progress-bar">
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
            {loading && (
              <div className="loading-state">
                <div className="spinner small" />
                <p>AI is writing your {businessType} review options...</p>
              </div>
            )}
            {error && <p className="error-text">{error}</p>}
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

        <div className="review-footer">
          <p>Powered by AI Review Assistant</p>
        </div>
      </div>
    </div>
  )
}
