from __future__ import annotations

from prometheus_client import Counter, Histogram

"""Prometheus metrics for Signet exchanges."""

# Total exchanges by result classification.
exchanges_total = Counter(
    "signet_exchanges_total",
    "Total /v1/exchange requests by result",
    labelnames=("result",),
)

# Forwarded exchanges by destination host.
forward_total = Counter(
    "signet_forward_total",
    "Total forwarded exchanges by host",
    labelnames=("host",),
)

# Denied exchanges by reason.
denied_total = Counter(
    "signet_denied_total",
    "Total denied exchanges by reason",
    labelnames=("reason",),
)

# Latency histogram for the entire exchange handler.
exchange_latency_seconds = Histogram(
    "signet_exchange_total_latency_seconds",
    "Latency of /v1/exchange handler in seconds",
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

def observe_success(duration: float):  # convenience wrappers
    exchanges_total.labels(result="ok").inc()
    exchange_latency_seconds.observe(duration)

def observe_denied(duration: float, reason: str):
    exchanges_total.labels(result="denied").inc()
    denied_total.labels(reason=reason).inc()
    exchange_latency_seconds.observe(duration)

def observe_error(duration: float):
    exchanges_total.labels(result="error").inc()
    exchange_latency_seconds.observe(duration)

def observe_forward(host: str):
    forward_total.labels(host=host).inc()
