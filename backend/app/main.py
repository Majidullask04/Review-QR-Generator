from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.places import router as places_router

app = FastAPI(
    title="Google Review API Backend",
    description="Professional backend for fetching Google Place details, ratings, and reviews directly from Google Places API (New).",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware to allow React frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(places_router)

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "service": "google-places-review-backend"}

@app.get("/", tags=["Root"])
async def root():
    """Root redirect / information."""
    return {
        "message": "Google Places Review API is running.",
        "docs": "/docs",
        "example": "/places/ChIJlVOHr4oJyzsRG2cIAmyERMM/reviews"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
