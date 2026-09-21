# faster-whisper

> **Purpose:** Artisan voice → transcript.

## Initial deployment
- CPU
- INT8
- optional VAD

## Return
- transcript
- segments/timestamps
- detected language where available
- quality/confidence metadata available from the pipeline

## Production gate
Low-quality/noisy/uncertain transcript:
1. request re-recording, or
2. Ambassador review

## Do not
- silently continue with an unreliable transcript
