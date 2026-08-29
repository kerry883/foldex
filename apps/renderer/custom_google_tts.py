from manim_voiceover.services.base import SpeechService
from google.cloud import texttospeech
import google.auth
from google.oauth2 import service_account
from pathlib import Path
import os
import json

class CustomGoogleService(SpeechService):
    """
    Custom Google Cloud Text-to-Speech service for manim-voiceover.
    Automatically handles both local JSON keys and Cloud Run default credentials.
    """
    
    def __init__(
        self,
        voice: str = "en-US-Neural2-J",
        language_code: str = "en-US",
        credentials_file: str = None,
        credentials_dict: dict = None,
        speaking_rate: float = 1.0,
        pitch: float = 0.0,
        **kwargs
    ):
        # --- Load credentials ---
        credentials = None
        
        try:
            if credentials_dict:
                credentials = service_account.Credentials.from_service_account_info(credentials_dict)
                print(f"[OK] Loaded credentials from dictionary")
            
            elif credentials_file and Path(credentials_file).exists():
                creds_path = Path(credentials_file)
                credentials = service_account.Credentials.from_service_account_file(str(creds_path))
                print(f"[OK] Loaded credentials from: {creds_path}")

            elif os.getenv("GOOGLE_CREDENTIALS_JSON"):
                credentials = service_account.Credentials.from_service_account_info(
                    json.loads(os.environ["GOOGLE_CREDENTIALS_JSON"])
                )
                print("[OK] Loaded credentials from GOOGLE_CREDENTIALS_JSON")

            elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                creds_path = Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"])
                credentials = service_account.Credentials.from_service_account_file(str(creds_path))
                print(f"[OK] Loaded credentials from: {creds_path}")
            
            else:
                # FALLBACK: Use Google Cloud Default Credentials (ADC)
                # This works automatically on Cloud Run without any JSON file!
                print("[INFO] Attempting to use Application Default Credentials (ADC)...")
                credentials, project = google.auth.default()
                print(f"[OK] Loaded ADC for project: {project}")

        except Exception as e:
            print(f"[WARNING] Credential loading failed: {e}. Attempting to proceed without explicit creds (client might find them in env vars).")

        # Initialize Google TTS client
        # If credentials is None, the client library will look for ADC automatically
        self.client = texttospeech.TextToSpeechClient(credentials=credentials)
        
        # Configure voice and audio
        self.voice_params = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice,
        )
        self.audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=speaking_rate,
            pitch=pitch,
        )
        
        # Initialize base service
        SpeechService.__init__(self, **kwargs)
        print(f"[OK] Custom Google TTS initialized: {voice}")
    
    def generate_from_text(
        self, 
        text: str, 
        cache_dir: str = None, 
        path: str = None,
        **kwargs
    ) -> dict:
        """
        Generate speech audio from text
        Returns format expected by manim-voiceover
        """
        try:
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=self.voice_params,
                audio_config=self.audio_config,
            )
            
            # Determine output path
            if path:
                output_path = Path(path)
            elif cache_dir:
                cache_path = Path(cache_dir)
                cache_path.mkdir(parents=True, exist_ok=True)
                import hashlib
                text_hash = hashlib.md5(text.encode()).hexdigest()
                output_path = cache_path / f"google_tts_{text_hash}.mp3"
            else:
                import tempfile
                fd, temp_path = tempfile.mkstemp(suffix=".mp3")
                os.close(fd)
                output_path = Path(temp_path)
            
            # Save audio
            with open(output_path, "wb") as out:
                out.write(response.audio_content)
            
            # Get audio duration
            duration = self._get_audio_duration(output_path)
            
            return {
                "original_audio": str(output_path),
                "duration": duration,
            }
        except Exception as e:
            print(f"[ERROR] Google TTS Generation Failed: {e}")
            raise e
    
    def _get_audio_duration(self, audio_path: Path) -> float:
        """Get audio file duration in seconds"""
        try:
            from mutagen.mp3 import MP3
            audio = MP3(str(audio_path))
            return float(audio.info.length)
        except Exception as e:
            print(f"[WARNING] Could not detect audio duration: {e}")
            # Fallback estimate: ~16KB per second for 128kbps MP3
            return float(audio_path.stat().st_size) / 16000.0