from fastapi import APIRouter, Path, Query
from app.schemas.review import ReviewsResponse
from app.services.google_places import fetch_place_reviews

router = APIRouter(prefix="/places", tags=["Places & Reviews"])

@router.get(
    "/{place_id}/reviews",
    response_model=ReviewsResponse,
    summary="Get Reviews for a Place ID",
    description="Fetches official Google reviews and rating details for a given Google Place ID (e.g. ChIJlVOHr4oJyzsRG2cIAmyERMM)."
)
async def get_place_reviews(
    place_id: str = Path(
        ...,
        description="Google Place ID (e.g. ChIJlVOHr4oJyzsRG2cIAmyERMM)",
        min_length=5,
        examples=["ChIJlVOHr4oJyzsRG2cIAmyERMM"]
    ),
    demo: bool = Query(
        False,
        description="Set to true to preview the transformed response contract immediately using simulated data."
    )
) -> ReviewsResponse:
    """
    1. Receives place_id from client.
    2. Validates it through FastAPI / Pydantic.
    3. Calls Google Places service securely with server-side API key.
    4. Returns normalized place details and reviews.
    """
    return await fetch_place_reviews(place_id=place_id, demo=demo)
