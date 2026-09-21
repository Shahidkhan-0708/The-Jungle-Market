import io
import wave
import struct
import math
import numpy as np
from PIL import Image

def test_rembg():
    print("Testing Rembg (U2Net)...")
    try:
        from rembg import remove
        # Create a valid simple PIL image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes = img_bytes.getvalue()
        
        out_bytes = remove(img_bytes)
        print("Rembg (U2Net) executed successfully and removed background!")
    except Exception as e:
        print(f"Rembg failed: {e}")

def test_whisper():
    print("\nTesting Faster-Whisper...")
    try:
        from faster_whisper import WhisperModel
        # Initialize small model
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        
        # Generate a dummy 1-second sine wave audio file
        audio_file = "dummy_audio.wav"
        with wave.open(audio_file, 'w') as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(16000)
            # 1 second of 440Hz sine wave
            for i in range(16000):
                value = int(32767.0 * math.cos(440.0 * math.pi * float(i) / 16000.0))
                data = struct.pack('<h', value)
                f.writeframesraw(data)
                
        segments, info = model.transcribe(audio_file, beam_size=1)
        # Just iterating over segments to force inference
        for segment in segments:
            pass
            
        print(f"Faster-Whisper (tiny, int8) loaded and executed successfully!")
    except Exception as e:
        print(f"Faster-Whisper failed: {e}")

if __name__ == "__main__":
    test_rembg()
    test_whisper()
