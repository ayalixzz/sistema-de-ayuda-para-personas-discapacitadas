FROM python:3.11-slim

WORKDIR /app

# Ensure gcc and postgres dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# We expose 8000 but it's handled by docker-compose
EXPOSE 8000

# The command is provided in docker-compose.yml
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
