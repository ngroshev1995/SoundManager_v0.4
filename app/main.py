from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from app.api.endpoints import blog

from app.api.endpoints import auth, recordings, playlists, users, dashboard, search

ROOT_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Classical Music Manager API")

origins = [
    "http://localhost", "http://localhost:8000", "http://localhost:8001",
    "http://127.0.0.1", "http://127.0.0.1:8000", "http://127.0.0.1:8001",
]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(recordings.router, prefix="/api/recordings", tags=["Recordings"])
app.include_router(playlists.router, prefix="/api/playlists", tags=["Playlists"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(blog.router, prefix="/api/blog", tags=["Blog"])

STATIC_DIR = ROOT_DIR.parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def read_root():
    index_path = STATIC_DIR / "index.html"
    if not index_path.is_file():
        return HTMLResponse(content=f"<h1>File not found at {index_path}</h1>", status_code=404)
    return HTMLResponse(content=index_path.read_text(encoding="utf-8"))