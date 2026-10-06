#!/usr/bin/env python3
"""
airek.uz — Talking-Head video uchun Speech-to-Text transkripsiya.

Berilgan audio/video fayldan nutqni so'z darajasida (word-level) vaqt belgilari
bilan transkripsiya qiladi va JSON ko'rinishida chiqaradi. faster-whisper (CPU)
ishlatiladi — GPU shart emas, mualliflik huquqi muammosi yo'q, bepul/local.

Ishlatish:
  venv/bin/python transcribe.py --input /path/video.mp4 --out /path/words.json \
      [--model small] [--lang uz]

Chiqish JSON tuzilishi:
{
  "language": "uz",
  "duration": 32.4,
  "text": "to'liq matn ...",
  "words": [
    {"word": "Salom", "start": 0.12, "end": 0.44},
    ...
  ],
  "segments": [
    {"start": 0.0, "end": 3.2, "text": "Salom bugun ..."},
    ...
  ]
}
"""
import argparse
import json
import sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Audio yoki video fayl yo'li")
    ap.add_argument("--out", required=True, help="Chiqish JSON fayli")
    ap.add_argument("--model", default="small",
                    help="Whisper model: tiny, base, small, medium (default: small)")
    ap.add_argument("--lang", default=None,
                    help="Til kodi (uz, ru, en). Bo'sh bo'lsa avtomatik aniqlanadi.")
    args = ap.parse_args()

    try:
        from faster_whisper import WhisperModel
    except Exception as e:
        print(json.dumps({"error": f"faster-whisper import failed: {e}"}), file=sys.stderr)
        sys.exit(2)

    # CPU, int8 — eng tejamkor va server uchun yetarlicha aniq
    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    segments, info = model.transcribe(
        args.input,
        language=args.lang,          # None -> avtomatik aniqlash
        word_timestamps=True,        # so'z darajasida vaqt belgilari (ASOSIY talab)
        vad_filter=True,             # jim pauzalarni olib tashlab aniqlikni oshiradi
        beam_size=5,
    )

    words = []
    seg_list = []
    full_text_parts = []

    for seg in segments:
        seg_list.append({
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "text": seg.text.strip(),
        })
        full_text_parts.append(seg.text.strip())
        if seg.words:
            for w in seg.words:
                token = (w.word or "").strip()
                if not token:
                    continue
                words.append({
                    "word": token,
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                })

    result = {
        "language": info.language,
        "language_probability": round(getattr(info, "language_probability", 0.0), 3),
        "duration": round(getattr(info, "duration", 0.0), 3),
        "text": " ".join(full_text_parts).strip(),
        "words": words,
        "segments": seg_list,
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(json.dumps({
        "ok": True,
        "language": result["language"],
        "duration": result["duration"],
        "word_count": len(words),
        "segment_count": len(seg_list),
    }))


if __name__ == "__main__":
    main()
