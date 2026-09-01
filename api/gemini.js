// api/gemini.js — No external API. Pure JSON template engine.

const stripControl = (v) =>
  [...(v || '')]
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');

// ── HELPERS ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

function parseHighlights(about) {
  if (!about) return [];
  return about
    .split(/[,;.]| and | or /i)
    .map((s) => s.trim().replace(/^we are /i, '').replace(/^they are /i, '').replace(/^known for /i, '').replace(/^famous for /i, ''))
    .filter((s) => s.length > 2)
    .slice(0, 4);
}

function buildDetail(about, customer, rating) {
  const highlights = parseHighlights(about);
  const parts = [];

  if (customer?.trim()) {
    parts.push(customer.trim());
  }
  if (highlights.length) {
    const connector = rating >= 4 ? 'Loved' : rating === 3 ? 'Noticed' : 'Had issues with';
    parts.push(`${connector} the ${highlights.join(', ')}.`);
  }

  return parts.join(' ');
}

// ── REVIEW TEMPLATE DATABASE ──
// Each category has 5-star, 4-star, 3-star, 2-star, 1-star templates.
// Placeholders: {name} = business name, {detail} = personalized context
const REVIEW_DB = {
  restaurant: {
    5: [
      "{name} never disappoints! {detail} The flavors are incredible and the staff always makes you feel at home.",
      "Best spot in town. {detail} Already planning my next visit — can't get enough of this place!",
      "Absolutely loved everything about {name}. {detail} A must-visit for anyone who appreciates great food.",
      "Went to {name} last night and was blown away. {detail} Perfect from start to finish.",
      "{name} is hands down my favorite. {detail} The quality and service are always top-notch.",
      "Can't recommend {name} enough. {detail} Every visit feels special.",
      "The food at {name} is next level. {detail} This place deserves every star.",
      "Had an amazing time at {name}. {detail} You need to try this place if you haven't already!"
    ],
    4: [
      "Really enjoyed my meal at {name}. {detail} Just wish the wait was a bit shorter, but still great.",
      "{name} is a solid choice for a nice dinner out. {detail} Will definitely be coming back soon.",
      "Great food and friendly staff at {name}. {detail} A few minor hiccups but overall a good experience.",
      "Had a lovely dinner at {name}. {detail} Almost perfect — just a tiny room for improvement.",
      "{name} delivers good quality consistently. {detail} Worth checking out for sure.",
      "Pretty good experience overall at {name}. {detail} Would recommend to friends.",
      "The ambiance and food at {name} were great. {detail} A reliable spot for a night out."
    ],
    3: [
      "{name} was okay. {detail} Nothing special but not bad either — just average.",
      "Decent spot for a quick bite. {detail} Some things were good, others felt lacking.",
      "Went to {name} with friends. {detail} It was fine, just didn't wow me.",
      "Average experience at {name}. {detail} Has potential but needs a bit more consistency.",
      "{name} is middle of the road. {detail} Might give it another try later.",
      "Not bad, not great. {detail} Just an ordinary meal at {name}."
    ],
    2: [
      "Disappointed with {name}. {detail} Expected much better for the price we paid.",
      "{name} fell short of expectations. {detail} Service was slow and the food was underwhelming.",
      "Not a great experience at {name}. {detail} Probably won't be returning anytime soon.",
      "Had issues with my order at {name}. {detail} Hopefully they improve their standards.",
      "{name} needs work. {detail} The atmosphere was nice but everything else was lacking."
    ],
    1: [
      "Terrible experience at {name}. {detail} Would not recommend this place to anyone.",
      "Completely let down by {name}. {detail} Waste of time and money honestly.",
      "Avoid {name} at all costs. {detail} Worst service and food quality I've encountered.",
      "Had a really bad time at {name}. {detail} Needs serious improvement across the board.",
      "Never going back to {name}. {detail} One of the worst dining experiences I've had."
    ]
  },

  salon: {
    5: [
      "{name} is amazing! {detail} Left feeling like a completely new person.",
      "Best salon experience ever at {name}. {detail} The stylist really knew what they were doing.",
      "Absolutely love {name}. {detail} Friendly staff and perfect results every single time.",
      "Can't stop looking at my hair after visiting {name}. {detail} Truly talented team.",
      "{name} exceeded all my expectations. {detail} Already booked my next appointment!",
      "The atmosphere at {name} is so welcoming. {detail} Best self-care spot in town."
    ],
    4: [
      "Really nice visit to {name}. {detail} Great results, just took a bit longer than expected.",
      "{name} does solid work. {detail} Happy with the outcome and will return.",
      "Good experience overall at {name}. {detail} Staff was professional and attentive.",
      "Liked my new look from {name}. {detail} Minor wait but worth it in the end.",
      "{name} is a reliable choice. {detail} Consistent quality and friendly service."
    ],
    3: [
      "{name} was okay. {detail} The cut was fine but nothing extraordinary.",
      "Average salon experience at {name}. {detail} Decent job, just not exactly what I wanted.",
      "Went to {name} for a trim. {detail} It was alright, might try somewhere else next time.",
      "{name} is pretty standard. {detail} Affordable but you get what you pay for."
    ],
    2: [
      "Not happy with my visit to {name}. {detail} The style didn't turn out how I asked.",
      "{name} was a letdown. {detail} Rushed service and mediocre results.",
      "Disappointed by {name}. {detail} Won't be booking again unfortunately.",
      "Had a frustrating time at {name}. {detail} Communication with the stylist was poor."
    ],
    1: [
      "Awful experience at {name}. {detail} Completely messed up my hair.",
      "Would never return to {name}. {detail} Unprofessional and overpriced for what you get.",
      "Avoid {name}. {detail} Worst salon visit I've ever had.",
      "Terrible service at {name}. {detail} Left angry and unsatisfied."
    ]
  },

  gym: {
    5: [
      "{name} is the best gym I've joined. {detail} Equipment is top-tier and always clean.",
      "Love working out at {name}. {detail} The trainers are super knowledgeable and motivating.",
      "{name} has everything you need. {detail} Great community vibe and excellent facilities.",
      "Best fitness investment I've made. {detail} {name} keeps me coming back every day.",
      "The atmosphere at {name} is unmatched. {detail} Clean, organized, and never too crowded."
    ],
    4: [
      "Really good gym — {name}. {detail} Solid equipment and friendly members.",
      "{name} is a great place to train. {detail} Just wish they had longer weekend hours.",
      "Happy with my membership at {name}. {detail} Good value and decent crowd levels.",
      "{name} delivers what it promises. {detail} Clean space and helpful staff."
    ],
    3: [
      "{name} is an okay gym. {detail} Gets the job done but nothing special.",
      "Average fitness center. {detail} Some machines are old and need updating.",
      "Went to {name} for a few weeks. {detail} It's fine, but I'm considering switching.",
      "{name} has potential. {detail} Needs better maintenance and more variety."
    ],
    2: [
      "Not impressed with {name}. {detail} Equipment is often broken and staff seems uninterested.",
      "{name} fell below expectations. {detail} Too crowded and not enough machines.",
      "Frustrating experience at {name}. {detail} Billing issues and poor communication.",
      "Wouldn't recommend {name}. {detail} Needs serious upgrades and better management."
    ],
    1: [
      "Worst gym experience at {name}. {detail} Dirty, disorganized, and unprofessional.",
      "Canceling my membership at {name}. {detail} Total waste of money.",
      "Avoid {name}. {detail} Broken equipment and rude staff — not worth it.",
      "Had a terrible time at {name}. {detail} Completely unacceptable for the price."
    ]
  },

  hotel: {
    5: [
      "{name} was absolutely perfect. {detail} Best stay I've had in a long time.",
      "Loved every minute at {name}. {detail} The room, the staff, the location — all 10/10.",
      "Can't wait to return to {name}. {detail} Felt like a home away from home.",
      "{name} sets the standard. {detail} Impeccable service and beautiful rooms.",
      "Outstanding hotel — {name}. {detail} Every detail was thoughtfully handled."
    ],
    4: [
      "Really enjoyed my stay at {name}. {detail} Great value, just minor noise from the hallway.",
      "{name} is a solid choice. {detail} Clean rooms and helpful front desk staff.",
      "Good experience at {name}. {detail} Comfortable bed and nice amenities.",
      "Would stay at {name} again. {detail} Almost perfect, just a few small things.",
      "Pleasant stay overall. {detail} {name} delivers reliable quality."
    ],
    3: [
      "{name} was okay. {detail} Average room, average service — nothing memorable.",
      "Decent hotel for the price. {detail} {name} works if you just need a bed.",
      "Mixed feelings about {name}. {detail} Some good aspects, some disappointing.",
      "Stayed at {name} for a night. {detail} It was fine, but I've had better."
    ],
    2: [
      "Not satisfied with {name}. {detail} Room cleanliness was below standard.",
      "{name} needs improvement. {detail} Staff was unresponsive to basic requests.",
      "Disappointing stay at {name}. {detail} Overpriced for what you actually get.",
      "Wouldn't book {name} again. {detail} Too many issues during my visit."
    ],
    1: [
      "Terrible stay at {name}. {detail} Worst hotel experience I've ever had.",
      "Avoid {name} completely. {detail} Dirty, unsafe, and completely unprofessional.",
      "Nightmare experience at {name}. {detail} Demanded a refund and left early.",
      "Shocked by how bad {name} was. {detail} Zero stars if I could give it."
    ]
  },

  retail: {
    5: [
      "{name} is my favorite store. {detail} Amazing selection and super helpful staff.",
      "Always a great experience at {name}. {detail} They go above and beyond for customers.",
      "Love shopping at {name}. {detail} Great quality and fair prices every time.",
      "{name} never disappoints. {detail} Found exactly what I needed with zero hassle.",
      "Best shop in the area — {name}. {detail} Friendly team and well-organized layout."
    ],
    4: [
      "Good shopping trip at {name}. {detail} Solid selection and reasonable prices.",
      "{name} is a reliable store. {detail} Staff was helpful and checkout was quick.",
      "Happy with my purchase from {name}. {detail} Good quality, just limited sizes.",
      "Nice store — {name}. {detail} Clean and easy to find what you need."
    ],
    3: [
      "{name} is okay. {detail} Average selection and average service.",
      "Decent shop. {detail} {name} has some good stuff but nothing unique.",
      "Stopped by {name}. {detail} It was fine, might browse again if I'm nearby.",
      "Middle of the road experience at {name}. {detail} Nothing stood out."
    ],
    2: [
      "Not impressed with {name}. {detail} Overpriced and understaffed.",
      "{name} was frustrating. {detail} Couldn't find help and the return policy is strict.",
      "Disappointing visit to {name}. {detail} Shelves were messy and disorganized.",
      "Wouldn't recommend {name}. {detail} Poor customer service ruined the experience."
    ],
    1: [
      "Awful experience at {name}. {detail} Rude staff and terrible product quality.",
      "Never shopping at {name} again. {detail} Complete waste of time and money.",
      "Avoid {name}. {detail} False advertising and unhelpful management.",
      "Worst store visit ever at {name}. {detail} Zero effort from the team."
    ]
  },

  medical: {
    5: [
      "{name} provided excellent care. {detail} The doctor was thorough and compassionate.",
      "Best medical experience at {name}. {detail} Staff made a stressful visit feel easy.",
      "Highly recommend {name}. {detail} Professional, clean, and genuinely caring team.",
      "Grateful for {name}. {detail} They took time to listen and explain everything.",
      "Outstanding clinic — {name}. {detail} From check-in to follow-up, everything was smooth."
    ],
    4: [
      "Good experience at {name}. {detail} Professional staff, just a bit of a wait.",
      "{name} is a solid choice. {detail} Clean facility and knowledgeable doctors.",
      "Satisfied with my visit to {name}. {detail} Would return for future care.",
      "{name} handled everything well. {detail} Good communication and clear billing."
    ],
    3: [
      "{name} was okay. {detail} The visit was fine but felt a bit rushed.",
      "Average clinic experience. {detail} {name} gets the job done.",
      "Went to {name} for a checkup. {detail} Decent care, long wait time though.",
      "{name} is standard. {detail} Nothing wrong, just not exceptional."
    ],
    2: [
      "Not happy with {name}. {detail} Felt dismissed and the wait was unreasonable.",
      "{name} needs improvement. {detail} Billing was confusing and staff seemed overwhelmed.",
      "Disappointing visit to {name}. {detail} Expected better care and communication.",
      "Would look elsewhere next time. {detail} {name} fell short of expectations."
    ],
    1: [
      "Terrible experience at {name}. {detail} Unprofessional and uncaring staff.",
      "Avoid {name}. {detail} Worst medical visit I've ever experienced.",
      "Completely dissatisfied with {name}. {detail} Negligent care and poor hygiene.",
      "Left {name} feeling worse. {detail} Needs serious oversight and reform."
    ]
  },

  automotive: {
    5: [
      "{name} is the most honest shop around. {detail} Fair pricing and excellent work.",
      "Trust {name} completely with my car. {detail} Fast service and transparent communication.",
      "Best mechanic experience at {name}. {detail} They explained everything without upselling.",
      "{name} saved me time and money. {detail} Reliable, skilled, and respectful team.",
      "Highly recommend {name} for any auto needs. {detail} Quality work every single time."
    ],
    4: [
      "Good service at {name}. {detail} Fair prices and solid workmanship.",
      "{name} is a reliable shop. {detail} Honest assessment and quick turnaround.",
      "Happy with my visit to {name}. {detail} Would bring my car back here.",
      "{name} did a great job. {detail} Just wish they had a waiting area with WiFi."
    ],
    3: [
      "{name} was okay. {detail} The repair was fine but took longer than quoted.",
      "Average auto shop experience. {detail} {name} gets the work done eventually.",
      "Went to {name} for an oil change. {detail} Decent job, nothing special.",
      "{name} is standard. {detail} Prices are fair but communication could be better."
    ],
    2: [
      "Not satisfied with {name}. {detail} Felt overcharged for a simple fix.",
      "{name} disappointed me. {detail} Had to return because the issue wasn't fixed properly.",
      "Frustrating experience at {name}. {detail} Poor communication about delays and costs.",
      "Wouldn't recommend {name}. {detail} Unprofessional handling of my vehicle."
    ],
    1: [
      "Awful service at {name}. {detail} Damaged my car and refused to take responsibility.",
      "Avoid {name} at all costs. {detail} Dishonest and incompetent mechanics.",
      "Worst auto shop experience at {name}. {detail} Overcharged and underdelivered.",
      "Furious with {name}. {detail} Complete lack of accountability and respect."
    ]
  },

  education: {
    5: [
      "{name} is an incredible place to learn. {detail} The instructors are passionate and patient.",
      "Best educational experience at {name}. {detail} My skills improved dramatically in just weeks.",
      "Highly recommend {name}. {detail} Well-structured classes and supportive environment.",
      "{name} exceeded my expectations. {detail} The material was relevant and engaging.",
      "Amazing teachers at {name}. {detail} They make complex topics easy to understand."
    ],
    4: [
      "Good learning experience at {name}. {detail} Solid curriculum and helpful instructors.",
      "{name} is a great choice. {detail} Professional setup and good value for money.",
      "Happy with my classes at {name}. {detail} Would sign up for another course.",
      "{name} delivers quality education. {detail} Just wish there were more weekend slots."
    ],
    3: [
      "{name} was okay. {detail} The course was decent but felt a bit disorganized.",
      "Average learning center. {detail} {name} covers the basics adequately.",
      "Went to {name} for tutoring. {detail} It was fine, not transformative though.",
      "{name} is standard. {detail} Good enough if you need something local."
    ],
    2: [
      "Not impressed with {name}. {detail} Outdated materials and unmotivated instructors.",
      "{name} fell short. {detail} Felt like a waste of time and tuition.",
      "Disappointing classes at {name}. {detail} Poor structure and little feedback.",
      "Wouldn't return to {name}. {detail} Needs better curriculum and engagement."
    ],
    1: [
      "Terrible experience at {name}. {detail} Unqualified staff and misleading promises.",
      "Avoid {name}. {detail} Complete scam — took my money and delivered nothing.",
      "Worst educational choice at {name}. {detail} Zero support and outdated content.",
      "Angry about {name}. {detail} Felt cheated and ignored throughout the course."
    ]
  },

  // Fallback for "other" business types — uses generic templates
  other: {
    5: [
      "{name} is fantastic! {detail} Couldn't ask for a better experience.",
      "Absolutely love {name}. {detail} The team is amazing at what they do.",
      "Best in the business — {name}. {detail} Professional, friendly, and top-quality.",
      "{name} exceeded every expectation. {detail} Will definitely be a returning customer.",
      "Highly recommend {name} to everyone. {detail} They truly care about their work."
    ],
    4: [
      "Really good experience at {name}. {detail} Solid service and friendly people.",
      "{name} is a great find. {detail} Reliable quality and fair pricing.",
      "Happy with {name}. {detail} Would use their services again without hesitation.",
      "Pleasant visit to {name}. {detail} Just a tiny thing kept it from being perfect."
    ],
    3: [
      "{name} was okay. {detail} Average experience, nothing to complain about.",
      "Decent place — {name}. {detail} Does the job but doesn't stand out.",
      "Went to {name}. {detail} It was fine, might try again or might not.",
      "{name} is pretty standard. {detail} You get what you pay for."
    ],
    2: [
      "Not satisfied with {name}. {detail} Expected better service and attention.",
      "{name} was a letdown. {detail} Communication was poor and results lacking.",
      "Disappointed by {name}. {detail} Won't be returning anytime soon.",
      "Had issues at {name}. {detail} Needs improvement in several areas."
    ],
    1: [
      "Terrible experience at {name}. {detail} Would not recommend to anyone.",
      "Avoid {name} completely. {detail} Unprofessional and disrespectful.",
      "Worst experience with {name}. {detail} Complete waste of time and money.",
      "Furious about my visit to {name}. {detail} Zero accountability from the team."
    ]
  }
};

// ── MAIN HANDLER ──
export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Parse body
    let body = {};
    try {
      if (typeof req.body === 'string') body = JSON.parse(req.body);
      else if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
      else if (req.body && typeof req.body === 'object') body = req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }

    const { rating, businessName, businessType, customerContext, locationAbout } = body;
    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5.' });
    }
    if (!businessName?.trim() || businessName.length > 120) {
      return res.status(400).json({ error: 'Business name required (max 120 chars).' });
    }

    const cleanName = stripControl(businessName.trim());
    const cleanCustomer = stripControl((customerContext || '').trim());
    const cleanAbout = stripControl((locationAbout || '').trim());

    // Pick template set
    const category = REVIEW_DB[businessType] ? businessType : 'other';
    const templates = REVIEW_DB[category][numericRating] || REVIEW_DB.other[numericRating];

    // Build personalized detail string
    const detail = buildDetail(cleanAbout, cleanCustomer, numericRating);

    // Generate 4-5 unique reviews by picking random templates and replacing placeholders
    const count = numericRating >= 4 ? 5 : 4;
    const selected = pick(templates, count);

    const reviews = selected.map((template) => {
      let text = template
        .replace(/{name}/g, cleanName)
        .replace(/{detail}/g, detail);

      // Clean up double spaces or trailing spaces
      text = text.replace(/\s+/g, ' ').trim();

      // If detail was empty, remove the extra space/punctuation artifacts
      text = text.replace(' .', '.').replace(' ,', ',').replace('  ', ' ');

      return text;
    });

    // Shuffle again so the order varies each time
    const finalReviews = shuffle(reviews);

    return res.status(200).json({ reviews: finalReviews });

  } catch (err) {
    console.error('FATAL:', err.name, err.message);
    return res.status(500).json({ error: 'Server error. Please retry.' });
  }
}
