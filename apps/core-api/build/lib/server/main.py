from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CollectorRegistry, CONTENT_TYPE_LATEST, generate_latest
from prometheus_client import Counter, Histogram
from .settings import settings
from .routes import router as api_router
import time

app = FastAPI(title="Signet Protocol Core API", version="0.1.0")

# CORS (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
REQUEST_COUNT = Counter("signet_http_requests_total", "HTTP requests", ["method", "path", "status"])
REQUEST_LATENCY = Histogram("signet_http_request_latency_seconds", "Latency", ["path"])

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start
    path = request.url.path
    REQUEST_LATENCY.labels(path=path).observe(elapsed)
    REQUEST_COUNT.labels(method=request.method, path=path, status=response.status_code).inc()
    return response

@app.get("/healthz")
async def healthz():
    return {"ok": True, "service": "signet-core-api"}

@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

# Mount API
app.include_router(api_router, prefix="")
