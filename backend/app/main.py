from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import config, license, stock, analytics

app = FastAPI(
    title="Viraltech-Markets",
    description="Professional modular business management system",
    version="1.0.0",
)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(config.router)
app.include_router(license.router)
app.include_router(stock.router)
app.include_router(analytics.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "app": "Viraltech-Markets", "version": "1.0.0"}
