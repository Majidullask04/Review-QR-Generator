import httpx
from fastapi import HTTPException
from app.core.config import settings
from app.schemas.review import PlaceInfo, ReviewItem, ReviewsResponse

GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1/places"

def get_demo_reviews(place_id: str) -> ReviewsResponse:
    """Fallback sample data to preview the exact contract when testing without cloud credentials."""
    return ReviewsResponse(
        place=PlaceInfo(
            id=place_id,
            name="Ramoji Film City",
            rating=4.5,
            total_reviews=128500,
            google_maps_uri="https://maps.google.com/?cid=14760596324905838363",
            review_url=f"https://search.google.com/local/writereview?placeid={place_id}"
        ),
        reviews=[
            ReviewItem(
                author="Rahul Sharma",
                author_photo_url=None,
                rating=5,
                text="Magnificent film sets and sprawling grounds. Tour buses were well organized and the live stunt show was spectacular.",
                published="2026-08-20T10:15:00Z",
                relative_time="3 weeks ago",
                google_maps_uri=f"https://search.google.com/local/writereview?placeid={place_id}"
            ),
            ReviewItem(
                author="Ananya Reddy",
                author_photo_url=None,
                rating=5,
                text="Must visit attraction when in Hyderabad! Great experience for family and kids. Spend a full day here.",
                published="2026-08-12T14:30:00Z",
                relative_time="a month ago",
                google_maps_uri=f"https://search.google.com/local/writereview?placeid={place_id}"
            ),
            ReviewItem(
                author="David Miller",
                author_photo_url=None,
                rating=4,
                text="Huge studio complex with lots of history. Takes lots of walking so wear comfortable shoes. Food courts are plentiful.",
                published="2026-07-28T09:00:00Z",
                relative_time="2 months ago",
                google_maps_uri=f"https://search.google.com/local/writereview?placeid={place_id}"
            )
        ],
        count=3
    )

async def fetch_place_reviews(place_id: str, demo: bool = False) -> ReviewsResponse:
    """
    Communicates with Google Places API (New) to fetch Place Details & Reviews.
    Extracts only requested fields via X-Goog-FieldMask and transforms them into
    our application's clean schema contract.
    """
    cleaned_id = place_id.strip()
    if not cleaned_id:
        raise HTTPException(status_code=400, detail="place_id cannot be empty.")

    if demo:
        return get_demo_reviews(cleaned_id)

    api_key = settings.GOOGLE_PLACES_API_KEY.strip()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_PLACES_API_KEY is not configured on the server. Please check your backend/.env file."
        )

    # Google Places API (New) Place Details URL
    url = f"{GOOGLE_PLACES_BASE_URL}/{cleaned_id}"

    # Specifically request only required data fields to minimize latency and billing
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,googleMapsUri,reviews",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)

        # Specific Google Error Handling
        if response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Place with ID '{cleaned_id}' not found on Google Maps."
            )
        elif response.status_code == 403:
            error_data = response.json() if response.content else {}
            google_msg = error_data.get("error", {}).get("message", "Permission Denied")
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Google Places API Error: {google_msg}. "
                    "Please ensure 'Places API (New)' is enabled for your key in the Google Cloud Console "
                    "(https://console.cloud.google.com/apis/library/places.googleapis.com) and that any API restrictions permit Places API. "
                    "(Tip: You can pass ?demo=true to test the pipeline response format right away)."
                )
            )
        elif response.status_code == 400:
            error_data = response.json() if response.content else {}
            msg = error_data.get("error", {}).get("message", "Invalid place_id format.")
            raise HTTPException(status_code=400, detail=msg)
        elif response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Google Places API error ({response.status_code}): {response.text}"
            )

        data = response.json()

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Network error contacting Google Places API: {str(exc)}"
        )

    # Extract Place Details
    raw_name = data.get("displayName", {})
    place_name = raw_name.get("text", "Unknown Place") if isinstance(raw_name, dict) else str(raw_name or "Unknown Place")

    place_info = PlaceInfo(
        id=data.get("id", cleaned_id),
        name=place_name,
        rating=data.get("rating"),
        total_reviews=data.get("userRatingCount"),
        google_maps_uri=data.get("googleMapsUri"),
        review_url=f"https://search.google.com/local/writereview?placeid={cleaned_id}"
    )

    # Transform Reviews
    transformed_reviews = []
    raw_reviews = data.get("reviews", []) or []

    for item in raw_reviews:
        raw_text = item.get("text", {})
        comment = raw_text.get("text", "") if isinstance(raw_text, dict) else str(raw_text or "")

        author_info = item.get("authorAttribution", {}) or {}
        author_name = author_info.get("displayName", "Anonymous")
        photo_url = author_info.get("photoUri")

        transformed_reviews.append(
            ReviewItem(
                author=author_name,
                author_photo_url=photo_url,
                rating=int(item.get("rating", 5)),
                text=comment,
                published=item.get("publishTime"),
                relative_time=item.get("relativePublishTimeDescription"),
                google_maps_uri=item.get("googleMapsUri")
            )
        )

    return ReviewsResponse(
        place=place_info,
        reviews=transformed_reviews,
        count=len(transformed_reviews)
    )
