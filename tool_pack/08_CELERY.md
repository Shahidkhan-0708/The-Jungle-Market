# Celery

> **Purpose:** Run expensive work asynchronously.

## Jobs
- image preprocessing
- rembg
- detection/classification
- speech transcription
- SEO generation
- scheduled market-intelligence pipeline

## Requirements
- idempotent tasks where possible
- retries only for retryable failures
- persistent job status/result references
- cap OpenCV threads per worker

## Do not
- endlessly retry deterministic bad inputs
