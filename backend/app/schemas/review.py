from typing import List, Optional
from pydantic import BaseModel, Field

class PlaceInfo(BaseModel):
    """Clean representation of the place details."""
    id: str = Field(..., description="Google Place ID")
    name: str = Field(..., description="Display name of the place")
    rating: Optional[float] = Field(None, description="Average star rating (1-5)")
    total_reviews: Optional[int] = Field(None, description="Total count of reviews")
    google_maps_uri: Optional[str] = Field(None, description="Direct URL to Google Maps listing")
    review_url: str = Field(..., description="Direct URL that opens Google's 5-star review dialog directly")

class ReviewItem(BaseModel):
    """Normalized review item extracted from Google's response."""
    author: str = Field(..., description="Reviewer author name")
    author_photo_url: Optional[str] = Field(None, description="Profile photo URL if available")
    rating: int = Field(..., description="Rating given by user (1 to 5)")
    text: str = Field(default="", description="Review comment text")
    published: Optional[str] = Field(None, description="ISO publish timestamp")
    relative_time: Optional[str] = Field(None, description="Human description e.g. '2 weeks ago'")
    google_maps_uri: Optional[str] = Field(None, description="URL pointing to this specific review")

class ReviewsResponse(BaseModel):
    """Standardized API response contract for the client."""
    place: PlaceInfo
    reviews: List[ReviewItem]
    count: int = Field(..., description="Number of reviews returned")
