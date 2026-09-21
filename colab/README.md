# Jungle Market Colab ML runtime

This directory is the remote heavy-inference boundary. Run `ml_server.py` in Colab; do not run
the main Jungle Market backend there.

## Colab cells

The connected notebook now contains a self-contained **Jungle Market** deployment cell with
both source files embedded. After a runtime reset, connect (CPU works if GPU quota is exhausted),
run the existing configuration cell, then that deployment cell. Keep it running while testing.
The current CPU setting uses Whisper `small` with `int8`. No source upload is needed for a restart.
The remaining older notebook cells are not needed for this startup path.

For another notebook/check-out, use:

```python
%cd /content/Jungle-Market
!pip install -r colab/requirements-colab.txt

import os
os.environ["NGROK_TOKEN"] = "your-ngrok-token"
os.environ["COLAB_ML_API_KEY"] = "a-long-random-shared-value"
os.environ["WHISPER_MODEL_SIZE"] = "small"

!python colab/setup_and_run.py
```

Copy the printed `COLAB_ML_URL` into `jungle-market/.env`. Use the same
`COLAB_ML_API_KEY` in both environments.

`GET /health` is public so the local backend can report runtime status. Inference endpoints use
the `X-ML-API-Key` header. An empty or incorrect configured key rejects inference requests.
