# Minimal Python image
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml /app/
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .[dev]
COPY server /app/server
ENV PYTHONUNBUFFERED=1
EXPOSE 8088
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8088"]
