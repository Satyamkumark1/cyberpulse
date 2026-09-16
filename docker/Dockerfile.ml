# architecture/deployment-architecture.md §4. Multi-stage: builder installs
# requirements.txt into a venv; runtime copies the venv and app, runs as a
# non-root user, and bakes the model artefacts into the image so a container
# start needs no external fetch (ADR: artefacts are a property of the image tag).
FROM python:3.11-slim AS builder
WORKDIR /build
COPY apps/ml-service/requirements.txt .
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runtime
RUN useradd --create-home --uid 10001 appuser
COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY apps/ml-service/app ./app
COPY apps/ml-service/models ./models
ENV PATH=/opt/venv/bin:$PATH MODEL_DIR=/app/models PYTHONUNBUFFERED=1
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
