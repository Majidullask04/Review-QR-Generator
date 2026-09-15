# Google Places Review API - FastAPI Backend

A clean, production-ready FastAPI backend for fetching Google Place details and reviews using **Google Places API (New)** Place Details.

---

## Architecture & Mental Model

```
CLIENT (React / Curl / Docs)
       │
       │ GET /places/{place_id}/reviews
       ▼
   FastAPI Route (app/routes/places.py)
       │
       │ 1. Validate place_id (Pydantic / FastAPI Path)
       ▼
Google Places Service (app/services/google_places.py)
       │
       │ 2. Load API key securely from app/core/config.py
       │ 3. Call Google Places API (New) with FieldMask
       │    GET https://places.googleapis.com/v1/places/{place_id}
       │    X-Goog-FieldMask: id,displayName,rating,userRatingCount,reviews,googleMapsUri
       ▼
  Google Places API (New)
       │
       │ 4. Returns raw Google JSON
       ▼
Transform & Contract (app/schemas/review.py)
       │
       │ 5. Map into clean PlaceInfo & ReviewItem schemas
       ▼
CLIENT RESPONSE (Normalized JSON)
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI application instance, CORS, routes mount
│   ├── routes/
│   │   └── places.py           # HTTP route: GET /places/{place_id}/reviews
│   ├── services/
│   │   └── google_places.py    # Google Places API (New) client & data transformation
│   ├── schemas/
│   │   └── review.py           # Pydantic schemas (ReviewsResponse, PlaceInfo, ReviewItem)
│   └── core/
│       └── config.py           # Secure settings & secrets management (.env)
├── .env                        # GOOGLE_PLACES_API_KEY
├── .gitignore                  # Keeps secrets & cache out of Git
└── requirements.txt            # Python dependencies
```

---

## Quickstart

### 1. Activate Environment
```bash
cd backend
source .venv/bin/activate
```

### 2. Start the Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Interactive Documentation
Visit:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Example Requests

### Test with Demo Mode:
```bash
curl -s "http://localhost:8000/places/ChIJlVOHr4oJyzsRG2cIAmyERMM/reviews?demo=true"
```

### Test Live with Google Places API:
```bash
curl -s "http://localhost:8000/places/ChIJlVOHr4oJyzsRG2cIAmyERMM/reviews"
```

> **Note on Google Cloud Setup**:
> If Google returns `403 PERMISSION_DENIED: The caller does not have permission`, ensure that **Places API (New)** is enabled in your Google Cloud Console:
> [Enable Places API (New)](https://console.cloud.google.com/apis/library/places.googleapis.com)
