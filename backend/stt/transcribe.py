#!/usr/bin/env python3
"""
airek.uz — O'zbekcha Speech-to-Text (so'z darajasida vaqt belgilari bilan).

MUHIM QOIDALAR:
  * Til HAR DOIM o'zbek (uz) ga majburlanadi — avtomatik aniqlash o'zbekchani
    fors/pushtu/arab deb adashtirar edi (arabcha harflar chiqishiga sabab bo'lgan).
  * Chiqish FAQAT lotin alifbosida: kirill -> lotin o'giriladi, arab/boshqa
    yozuvdagi belgilar tashlab yuboriladi.
  * Texnik inglizcha nomlar (Instagram, AI, CRM...) lotin harflarda qoladi.

Model tanlash (--model):
  navai   : NavAI whisper-medium-uzbek (CT2 int8)  -> eng aniq (default)
  turbo   : whisper-large-v3-turbo-uzbek (CT2)     -> tezroq/aniqroq muqobil
  small   : eski umumiy model (faqat zaxira)
  yoki to'liq papka yo'li.
"""
import argparse
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_DIRS = {
    "navai": os.path.join(BASE, "models", "navai-medium-uz-ct2"),
    "turbo": os.path.join(BASE, "models", "turbo-uz-ct2"),
}

# ── Kirill -> Lotin (o'zbek) ────────────────────────────────────────────────
CYR2LAT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "j",
    "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "x", "ц": "ts",
    "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "'", "ы": "i", "ь": "", "э": "e", "ю": "yu",
    "я": "ya", "ў": "o'", "қ": "q", "ғ": "g'", "ҳ": "h", "ҷ": "j", "ә": "a", "ө": "o",
}


def cyr_to_lat(s: str) -> str:
    out = []
    for ch in s:
        low = ch.lower()
        if low in CYR2LAT:
            rep = CYR2LAT[low]
            out.append(rep.capitalize() if ch != low and rep else rep)
        else:
            out.append(ch)
    return "".join(out)


# Ruxsat etilgan belgilar: lotin harflar, raqam, tinish, apostrof variantlari
_ALLOWED = re.compile(r"[^A-Za-z0-9\s.,!?:;'\"()\-%$€@#&/+\u2018\u2019\u02bb\u02bc\u00b4`ʻʼ]")


def normalize_word(w: str) -> str:
    w = cyr_to_lat(w)
    # Apostrof variantlarini yagona ' ga (o', g' uchun)
    w = (w.replace("\u2018", "'").replace("\u2019", "'").replace("\u02bb", "'")
           .replace("\u02bc", "'").replace("ʻ", "'").replace("ʼ", "'")
           .replace("`", "'").replace("\u00b4", "'"))
    w = _ALLOWED.sub("", w)
    return w.strip()


def script_stats(text: str):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0, 0
    latin = sum(1 for c in letters if "a" <= c.lower() <= "z" or c in "ʻʼ")
    return latin, len(letters)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="navai")
    ap.add_argument("--lang", default="uz", help="Standart: uz (majburiy o'zbek)")
    args = ap.parse_args()

    try:
        from faster_whisper import WhisperModel
    except Exception as e:
        print(json.dumps({"error": f"faster-whisper import failed: {e}"}), file=sys.stderr)
        sys.exit(2)

    model_path = MODEL_DIRS.get(args.model, args.model)
    if args.model in MODEL_DIRS and not os.path.exists(os.path.join(model_path, "model.bin")):
        print(f"[STT] {args.model} model topilmadi ({model_path}) -> 'small' zaxira", file=sys.stderr)
        model_path = "small"

    threads = max(1, (os.cpu_count() or 2))
    model = WhisperModel(model_path, device="cpu", compute_type="int8", cpu_threads=threads)

    segments, info = model.transcribe(
        args.input,
        language="uz",               # HAR DOIM o'zbek (auto-detect o'chirilgan)
        task="transcribe",
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
        condition_on_previous_text=False,   # takrorlanish/gallyutsinatsiyani kamaytiradi
        no_repeat_ngram_size=4,
        initial_prompt="Assalomu alaykum. Bugun biz biznes, marketing va tajriba haqida gaplashamiz.",
    )

    words, seg_list, parts = [], [], []
    for seg in segments:
        seg_words = []
        if seg.words:
            for w in seg.words:
                tok = normalize_word((w.word or "").strip())
                if not tok or not re.search(r"[A-Za-z0-9]", tok):
                    continue
                item = {"word": tok, "start": round(w.start, 3), "end": round(w.end, 3)}
                words.append(item)
                seg_words.append(tok)
        seg_text = " ".join(seg_words) if seg_words else normalize_word(seg.text.strip())
        if not seg_text:
            continue
        seg_list.append({"start": round(seg.start, 3), "end": round(seg.end, 3), "text": seg_text})
        parts.append(seg_text)

    full_text = " ".join(parts).strip()
    latin, total = script_stats(full_text)
    result = {
        "language": "uz",
        "script": "latin",
        "model": os.path.basename(str(model_path)),
        "duration": round(getattr(info, "duration", 0.0), 3),
        "text": full_text,
        "words": words,
        "segments": seg_list,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(json.dumps({
        "ok": True, "language": "uz", "model": result["model"],
        "duration": result["duration"], "word_count": len(words),
        "segment_count": len(seg_list), "latin_ratio": round(latin / total, 3) if total else 1.0,
    }))


if __name__ == "__main__":
    main()
