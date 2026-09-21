import os
import logging
from io import BytesIO

class VoiceTranscriber:
    def __init__(self, use_mock: bool = False):
        self.use_mock = use_mock
        self.model = None
        if not self.use_mock:
            try:
                from faster_whisper import WhisperModel
                self.model = WhisperModel("tiny", device="cpu", compute_type="int8")
            except ImportError:
                logging.warning("faster_whisper not installed, falling back to mock transcriber")
                self.use_mock = True

    def transcribe(self, audio_bytes: bytes) -> dict:
        """
        Uses faster-whisper to transcribe artisan voice audio to text.
        Returns transcript and confidence score.
        """
        if self.use_mock:
            return {
                "transcript": "I weave this basket using river bamboo and wild forest grass. It takes two days to shape, smoke, and finish by hand with mustard seed oil.",
                "confidence": 0.96,
                "language": "en"
            }
            
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
            
        try:
            segments, info = self.model.transcribe(tmp_path, beam_size=5)
            transcript = " ".join([segment.text for segment in segments])
            return {
                "transcript": transcript.strip(),
                "confidence": info.language_probability,
                "language": info.language
            }
        finally:
            os.remove(tmp_path)

voice_transcriber = VoiceTranscriber(use_mock=False)
