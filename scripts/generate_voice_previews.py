#!/usr/bin/env python3
"""Generate Gemini TTS preview WAV files (no jq/ffmpeg required)."""

from __future__ import annotations

import base64
import json
import os
import shutil
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path

VOICES = [
    "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
    "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
    "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
    "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
    "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
]

API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash-preview-tts:generateContent"
)
SAMPLE_RATE = 24000
SCRIPT_DIR = Path(__file__).resolve().parent
FRONTEND_ROOT = SCRIPT_DIR.parent
DEFAULT_OUTPUT = FRONTEND_ROOT / "voices-agent"
PUBLIC_OUTPUT = FRONTEND_ROOT / "apps" / "platform-shell" / "public" / "voices-agent"


def load_api_key() -> str:
    key = os.environ.get("GOOGLE_API_KEY", "").strip()
    if key:
        return key

    backend_env = FRONTEND_ROOT.parent / "Appointment-Setter-Backend" / ".env"
    if backend_env.is_file():
        for line in backend_env.read_text(encoding="utf-8").splitlines():
            if line.startswith("GOOGLE_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")

    raise SystemExit("GOOGLE_API_KEY not set. Export it or add it to Appointment-Setter-Backend/.env")


def pcm_to_wav(pcm_bytes: bytes, output_path: Path) -> None:
    with wave.open(str(output_path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(pcm_bytes)


def generate_voice_preview(api_key: str, voice_name: str) -> bytes:
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            f"Hi, I'm {voice_name}. I can help you book an appointment, "
                            "answer your questions, and connect you with our team."
                        )
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice_name}
                }
            },
        },
    }

    request = urllib.request.Request(
        f"{API_URL}?key={api_key}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        try:
            message = json.loads(detail)["error"]["message"]
        except (json.JSONDecodeError, KeyError, TypeError):
            message = detail or str(exc)
        raise RuntimeError(message) from exc

    try:
        encoded = body["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected API response for {voice_name}: {body}") from exc

    return base64.b64decode(encoded)


def main() -> int:
    output_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUTPUT
    output_dir.mkdir(parents=True, exist_ok=True)

    api_key = load_api_key()
    failures: list[str] = []

    for voice in VOICES:
        print(f"[{voice}]")
        output_path = output_dir / f"{voice}.wav"
        try:
            pcm_bytes = generate_voice_preview(api_key, voice)
            pcm_to_wav(pcm_bytes, output_path)
            print(f"  -> {output_path}")
        except (urllib.error.URLError, RuntimeError, OSError) as exc:
            failures.append(f"{voice}: {exc}")
            print(f"  !! failed: {exc}", file=sys.stderr)

    if failures:
        print("\nFailures:", file=sys.stderr)
        for item in failures:
            print(f"  - {item}", file=sys.stderr)
        return 1

    public_dir = PUBLIC_OUTPUT
    public_dir.mkdir(parents=True, exist_ok=True)
    for wav_file in output_dir.glob("*.wav"):
        shutil.copy2(wav_file, public_dir / wav_file.name)

    print(f"\nDone. Generated {len(VOICES)} files in {output_dir}")
    print(f"Copied previews to {public_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
