"""HubServis musiqa studiyasi.

10 ta TAYYOR uslub (o'sha video-stil kartalariga mos) + har safar boshqacha
musiqa chiqaradigan "random" rejim. Hammasi kod bilan sintez qilinadi:
hech qanday tayyor trek yuklanmaydi, mualliflik huquqi muammosi yo'q.

Ishlatish:
    python3 hubmusic.py --list
    python3 hubmusic.py --preset kiberpank          # -> presets/kiberpank.wav (+mp3)
    python3 hubmusic.py --preset all                # 10 tasini birdan
    python3 hubmusic.py --preset random             # HAR SAFAR boshqacha
    python3 hubmusic.py --preset oltin --dur 74 --out /tmp/oltin.wav
    python3 hubmusic.py --preset random --seed 123  # takrorlanadigan random

Videoga qo'yish:
    cp presets/reels.wav ../v3/hubservis-reels/assets/audio/bgm.wav
    cd ../v3/hubservis-reels && npx hyperframes render -q high -o ../video.mp4
"""
import argparse
import json
import os
import subprocess
import sys
import time
import wave

import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DEFAULT = os.path.join(HERE, "presets")
CACHE = {}


# ----------------------------------------------------------------------------
# Asosiy tovush qurilmalari
# ----------------------------------------------------------------------------
def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def T(sec):
    return np.arange(max(1, int(sec * SR))) / SR


def env(n, a=0.005, d=0.1, s=0.7, r=0.05):
    e = np.full(n, s, dtype=float)
    na = max(1, min(n, int(a * SR)))
    nd = max(1, min(n - na, int(d * SR)))
    e[:na] = np.linspace(0, 1, na)
    e[na:na + nd] = np.linspace(1, s, nd)
    nr = min(n, int(r * SR))
    if nr > 0:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lp(x, fc, order=4):
    if fc >= SR / 2.2:
        return x
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / max(fc, 20)) ** order)
    return np.fft.irfft(X, len(x))


def hp(x, fc, order=4):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / np.sqrt(1 + (f / max(fc, 20)) ** order)
    return np.fft.irfft(X, len(x))


def bp(x, lo, hi):
    return hp(lp(x, hi), lo)


def saw(f, t, ph=0.0):
    return 2 * ((t * f + ph) % 1.0) - 1


def square(f, t, ph=0.0):
    return np.sign(saw(f, t, ph))


def sine(f, t, ph=0.0):
    return np.sin(2 * np.pi * f * t + ph)


def noise(n, rng):
    return rng.standard_normal(n)


# ---------------------------- barabanlar ----------------------------
def kick(rng, tune=48, decay=6.0, click=0.3):
    t = T(0.45)
    f = tune + 150 * np.exp(-t * 34)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * decay)
    c = hp(noise(len(t), rng), 3000) * np.exp(-t * 240) * click
    return np.tanh((body + c) * 1.5)


def snare(rng):
    t = T(0.3)
    n = bp(noise(len(t), rng), 1200, 7000) * np.exp(-t * 26)
    tone = sine(190, t) * np.exp(-t * 30) * 0.5
    return (n * 0.8 + tone) * 0.6


def rim(rng):
    t = T(0.09)
    return (hp(noise(len(t), rng), 2500) * np.exp(-t * 90)
            + sine(1700, t) * np.exp(-t * 120) * 0.5) * 0.5


def clap(rng):
    t = T(0.35)
    n = bp(noise(len(t), rng), 900, 6000)
    e = np.exp(-t * 16) * 0.8
    for off in (0.0, 0.010, 0.021):
        k = int(off * SR)
        e[k:] += 0.7 * np.exp(-t[: len(t) - k] * 90)
    return n * e * 0.5


def hat(rng, open_=False):
    t = T(0.24 if open_ else 0.05)
    n = hp(noise(len(t), rng), 8000)
    return n * np.exp(-t * (15 if open_ else 90)) * 0.34


def shaker(rng):
    t = T(0.12)
    n = hp(noise(len(t), rng), 5500)
    a = np.clip(t / 0.02, 0, 1)
    return n * a * np.exp(-t * 45) * 0.3


def dum(rng, tune=85):
    t = T(0.35)
    f = tune + 40 * np.exp(-t * 40)
    s = sine(1, t) * 0  # joy egallovchi (pastda cumsum ishlatiladi)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    skin = lp(noise(len(t), rng), 700) * np.exp(-t * 30) * 0.4
    return (s + skin) * 0.9


def tak(rng):
    t = T(0.14)
    ring = sine(420, t) * np.exp(-t * 45) * 0.5
    snap = bp(noise(len(t), rng), 1800, 5500) * np.exp(-t * 55)
    return (ring + snap) * 0.6


def jingle(rng):
    t = T(0.18)
    n = hp(noise(len(t), rng), 6500)
    e = np.zeros(len(t))
    for off in (0.0, 0.012, 0.027, 0.041):
        k = int(off * SR)
        e[k:] += np.exp(-t[: len(t) - k] * 60)
    return n * e * 0.18


def timpani(rng):
    t = T(1.6)
    f = 62 + 40 * np.exp(-t * 5)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    hit = lp(noise(len(t), rng), 1200) * np.exp(-t * 12) * 0.5
    return (body + hit) * 0.9


# ---------------------------- cholg'ular ----------------------------
def _cache(key, fn):
    if key not in CACHE:
        CACHE[key] = fn()
    return CACHE[key]


def pluck(n, length, bright=3200, harm=7):
    key = ("pluck", n, round(length, 3), bright, harm)
    def build():
        t = T(length)
        f = midi(n)
        s = np.zeros(len(t))
        for k in range(1, harm + 1):
            if f * k > SR / 2.4:
                break
            s += sine(f * k, t) * np.exp(-t * (3.0 + 0.9 * k)) / k
        return lp(s, bright) * 0.6
    return _cache(key, build)


def bell(n, length, ratio=3.0, index=2.4, decay=3.2):
    key = ("bell", n, round(length, 3), ratio, index, decay)
    def build():
        t = T(length)
        f = midi(n)
        mod = index * np.exp(-t * 6) * np.sin(2 * np.pi * f * ratio * t)
        s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * decay)
        s += 0.3 * np.sin(2 * np.pi * f * 2 * t + mod) * np.exp(-t * decay * 1.8)
        return s * 0.5
    return _cache(key, build)


def glass(n, length):
    return bell(n, length, ratio=7.0, index=1.2, decay=2.2) * 0.85


def square_lead(n, length, vib=True):
    key = ("sql", n, round(length, 3))
    def build():
        t = T(length)
        f = midi(n)
        drift = 1 + (0.004 * np.sin(2 * np.pi * 5.4 * t) if vib else 0)
        ph = np.cumsum(f * drift) / SR
        s = 2 * (ph % 1.0) - 1
        s = 0.7 * np.sign(s) + 0.3 * s
        return lp(s, 4200) * env(len(t), a=0.01, d=0.12, s=0.75, r=0.05) * 0.45
    return _cache(key, build)


def saw_lead(n, length, voices=6, spread=0.02, vib=True):
    key = ("sawl", n, round(length, 3), voices, spread)
    def build():
        t = T(length)
        f = midi(n)
        drift = 1 + (0.005 * np.sin(2 * np.pi * 5.0 * t) if vib else 0)
        s = np.zeros(len(t))
        for k in range(voices):
            d = (k - (voices - 1) / 2) / max(1, (voices - 1) / 2) * spread
            s += saw(f * drift * (1 + d), t, ph=(k * 0.137) % 1)
        s /= voices
        return lp(s, 5200) * env(len(t), a=0.02, d=0.15, s=0.7, r=0.06) * 0.5
    return _cache(key, build)


def surnay(n, length):
    key = ("surnay", n, round(length, 3))
    def build():
        t = T(length)
        f = midi(n)
        vib = 0.006 * np.clip((t - 0.12) / 0.2, 0, 1)
        ph = np.cumsum(f * (1 + vib * np.sin(2 * np.pi * 5.6 * t))) / SR
        s = 2 * (ph % 1.0) - 1
        s = 0.6 * s + 0.4 * np.sign(np.sin(2 * np.pi * ph))
        s = lp(s + hp(noise(len(t), np.random.default_rng(1)), 3000) * 0.05, 3200)
        pl = sine(f * 2, t) * np.exp(-t * 18) * 0.3
        return (s * env(len(t), a=0.015, d=0.12, s=0.75, r=0.06) + pl) * 0.5
    return _cache(key, build)


LEADS = {
    "pluck": lambda n, l: pluck(n, l),
    "bell": lambda n, l: bell(n, l),
    "glass": lambda n, l: glass(n, l),
    "square": lambda n, l: square_lead(n, l),
    "saw": lambda n, l: saw_lead(n, l),
    "surnay": lambda n, l: surnay(n, l),
}


def chord_voice(notes, length, kind):
    key = ("chord", tuple(notes), round(length, 3), kind)
    def build():
        if kind == "pad":
            t = T(length)
            s = np.zeros(len(t))
            for n in notes:
                f = midi(n)
                for k in range(5):
                    d = (k - 2) / 2 * 0.009
                    s += saw(f * (1 + d), t, ph=(k * 0.11) % 1)
            s /= len(notes) * 5
            return lp(s, 1500) * env(len(t), a=0.5, d=0.3, s=0.85, r=0.6) * 0.5
        if kind == "strings":
            t = T(length)
            s = np.zeros(len(t))
            for n in notes:
                f = midi(n)
                for d in (-0.004, 0.0, 0.004):
                    s += saw(f * (1 + d), t, ph=(abs(d) * 100) % 1)
            s /= len(notes) * 3
            trem = 1 + 0.05 * np.sin(2 * np.pi * 5.5 * t)
            return lp(s * trem, 2600) * env(len(t), a=0.35, d=0.2, s=0.9, r=0.5) * 0.42
        if kind == "pluck":
            t = T(length)
            s = np.zeros(len(t))
            for n in notes:
                s += pluck(n, length, bright=3600, harm=6)
            return s / len(notes) * 0.8
        if kind == "muted":  # yumshoq, qisqa
            t = T(length)
            s = sum(saw(midi(n), t) for n in notes) / len(notes)
            return lp(s, 1100) * env(len(t), a=0.006, d=0.10, s=0.25, r=0.04) * 0.5
        # "stab" — zamonaviy akkord zarbasi
        t = T(length)
        s = np.zeros(len(t))
        for n in notes:
            f = midi(n)
            for k in range(7):
                d = (k - 3) / 3 * 0.018
                s += saw(f * (1 + d), t, ph=(k * 0.137) % 1)
        s /= len(notes) * 7
        return lp(s, 4200) * env(len(t), a=0.004, d=0.2, s=0.5, r=0.06) * 0.5
    return _cache(key, build)


def bass(n, length, kind):
    key = ("bass", n, round(length, 3), kind)
    def build():
        t = T(length)
        f = midi(n)
        if kind == "sub":
            s = sine(f, t) + 0.2 * lp(saw(f, t), 400)
        elif kind == "reese":
            s = 0.5 * saw(f * 0.995, t) + 0.5 * saw(f * 1.006, t)
            s = lp(s, 900)
            s *= 1 + 0.25 * np.sin(2 * np.pi * 0.8 * t)
        elif kind == "pluck":
            s = lp(saw(f, t) + sine(f, t), 1400)
            s *= np.exp(-t * 9)
        else:
            s = sine(f, t)
        return s * env(len(t), a=0.004, d=0.06, s=0.9, r=0.03) * 0.6
    return _cache(key, build)


# ---------------------------- effektlar ----------------------------
def whoosh(rng, length=0.6):
    t = T(length)
    n = noise(len(t), rng)
    x = t / length
    lo = bp(n, 400, 2000) * (1 - x) * x * 2
    hi = hp(n, 3500) * x ** 2.2
    return (lo * 0.25 + hi * 0.45) * np.sin(np.pi * np.clip(x, 0, 1)) ** 0.4


def riser(rng, length):
    t = T(length)
    x = t / length
    n = hp(noise(len(t), rng), 1800) * x ** 2 * 0.35
    sweep = sine(1, t) * 0
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 2600 * x ** 2.4) / SR) * x ** 2 * 0.12
    return n + sweep


def impact(rng, length=2.2, tune=38):
    t = T(length)
    boom = np.sin(2 * np.pi * np.cumsum(tune + 70 * np.exp(-t * 7)) / SR) * np.exp(-t * 2.0)
    crash = hp(noise(len(t), rng), 4000) * np.exp(-t * 2.8) * 0.35
    return boom + crash


def siren(rng, length=1.2):
    t = T(length)
    x = t / length
    f = 500 + 700 * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - x) * 0.35


def make_ir(decay=1.4, brightness=0.5, seed=3):
    key = ("ir", decay, brightness, seed)
    def build():
        n = int(decay * SR)
        rng = np.random.default_rng(seed)
        ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (decay / 5))
        ir = lp(ir, 1200 + 6000 * brightness)
        ir[: int(0.005 * SR)] = 0
        return ir / np.abs(ir).max()
    return _cache(key, build)


def reverb(x, amount, decay=1.4, brightness=0.5):
    if amount <= 0:
        return x
    ir = make_ir(decay, brightness)
    wet = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, len(x) + len(ir) - 1)[: len(x) // 2 + 1], len(x))
    wet /= max(1e-6, np.abs(wet).max())
    return (1 - amount) * x + amount * wet * np.abs(x).max()


# ----------------------------------------------------------------------------
# Musiqiy material
# ----------------------------------------------------------------------------
HOOKS = {
    "dark":   [74, None, 75, 74, 78, None, 74, None, 75, 74, 72, 70, 72, None, None, None,
               72, None, 74, 72, 70, 69, 70, None, 69, 70, 69, 66, 67, None, None, None],
    "rise":   [74, 77, 79, 77, 74, None, 72, None, 70, 72, 74, 72, 70, None, None, None,
               69, 72, 74, 72, 69, None, 67, None, 66, None, 67, None, 69, None, None, None],
    "sweep":  [79, None, 74, None, 77, None, 72, None, 74, None, 70, None, 72, None, 69, None,
               67, None, 69, None, 70, None, 72, None, 74, None, 76, None, 79, None, None, None],
    "pop":    [72, None, 72, 74, 76, None, 76, None, 79, None, 76, 74, 72, None, None, None,
               74, None, 74, 76, 77, None, 77, None, 76, 74, 72, 69, 71, None, None, None],
    "epic":   [62, None, None, 65, 69, None, None, None, 67, None, None, 70, 74, None, None, None,
               65, None, 67, None, 69, None, 70, None, 69, None, None, None, 67, None, None, None],
    "glass":  [86, None, 84, None, 81, None, 79, None, 81, None, 84, None, 86, None, None, None,
               88, None, 86, None, 84, None, 81, None, 79, None, 81, None, 84, None, None, None],
    "pulse":  [69, None, 69, None, 72, None, 76, None, 74, None, 72, None, 69, None, None, None,
               71, None, 71, None, 74, None, 79, None, 76, None, 74, None, 71, None, None, None],
    "drive":  [69, 72, 76, 72, 69, 72, 71, 69, 67, 71, 74, 71, 67, 71, 69, 67,
               65, 69, 72, 69, 65, 69, 67, 65, 64, 67, 71, 67, 69, None, None, None],
    "sale":   [72, 72, 76, 76, 79, 76, 72, None, 74, 74, 77, 77, 81, 77, 74, None,
               76, 76, 79, 79, 83, 79, 76, None, 74, 72, 71, 69, 72, None, None, None],
    "calm":   [69, None, None, None, 72, None, None, None, 74, None, None, None, 71, None, None, None,
               69, None, None, None, 67, None, None, None, 65, None, None, None, 67, None, None, None],
}

PROGS = {
    "dark":   [([57, 60, 64, 69], 45), ([53, 57, 60, 65], 41), ([55, 60, 64, 67], 48), ([55, 59, 62, 67], 43)],
    "deep":   [([45, 52, 57, 60], 33), ([48, 55, 60, 64], 36), ([50, 57, 62, 65], 38), ([43, 50, 55, 58], 31)],
    "warm":   [([57, 60, 64, 67], 45), ([50, 57, 62, 65], 38), ([53, 57, 60, 65], 41), ([55, 59, 62, 67], 43)],
    "bright": [([60, 64, 67, 72], 48), ([57, 60, 64, 69], 45), ([53, 57, 60, 65], 41), ([55, 59, 62, 67], 43)],
    "uplift": [([53, 57, 60, 65], 41), ([55, 60, 64, 67], 48), ([57, 60, 64, 69], 45), ([55, 59, 62, 67], 43)],
    "epic":   [([45, 52, 57, 64], 33), ([43, 50, 55, 62], 31), ([41, 48, 53, 60], 29), ([43, 50, 55, 59], 31)],
    "cool":   [([55, 58, 62, 67], 43), ([53, 57, 60, 65], 41), ([50, 55, 58, 62], 38), ([48, 55, 60, 64], 36)],
}

# ---------------------------- 10 ta uslub ----------------------------
# Har biri video-stil kartochkalaridan biriga moslangan.
PRESETS = {
    "kiberpank": dict(
        label="Kiberpank & Neon", desc="Qorong'i, tez, detune qilingan sintezatorlar, hard baraban",
        bpm=128, seed=11, prog="cool", hook="drive", hook_oct=12,
        lead=dict(timbre="square", level=0.34, bar_every=4),
        chords=dict(kind="stab", level=0.40, steps=[0, 3, 6, 8, 11, 14], dur=0.4),
        bass=dict(kind="reese", level=0.55, steps=[0, 2, 4, 6, 8, 10, 12, 14]),
        drums=dict(kick=[0, 4, 8, 12], clap=[4, 12], hat_open=[2, 6, 10, 14], hat=[1, 3, 5, 7, 9, 11, 13, 15],
                   snare=[], doira=[], shaker=[], timpani=[]),
        fx=dict(whoosh=True, riser="long", impact=True, siren=False, every4=True),
        mix=dict(reverb=0.22, decay=1.1, bright=0.8, sidechain=0.7, wobble=0.0, chorus=0.0),
        pad=dict(kind="pad", level=0.0),
        sections={"intro": 0.10, "drop1": 0.34, "break": 0.12, "drop2": 0.32, "outro": 0.12},
    ),
    "oltin": dict(
        label="Hashamatli Oltin", desc="Sekin, torli akkordlar, yumshoq bas, nafis pluck",
        bpm=96, seed=22, prog="warm", hook="glass", hook_oct=0,
        lead=dict(timbre="glass", level=0.30, bar_every=4),
        chords=dict(kind="strings", level=0.42, steps=[0, 8], dur=1.9),
        bass=dict(kind="sub", level=0.48, steps=[0, 8]),
        drums=dict(kick=[0, 10], clap=[8], hat_open=[], hat=[0, 4, 8, 12], snare=[], doira=[3, 11], shaker=[6, 14], timpani=[]),
        fx=dict(whoosh=True, riser="short", impact=True, siren=False, every4=False),
        mix=dict(reverb=0.42, decay=2.2, bright=0.45, sidechain=0.35, wobble=0.0, chorus=0.2),
        pad=dict(kind="strings", level=0.22),
        sections={"intro": 0.16, "drop1": 0.30, "break": 0.16, "drop2": 0.26, "outro": 0.12},
    ),
    "minimal": dict(
        label="Zamonaviy Minimalizm", desc="Toza, siyrak, yumshoq baraban, jim akkordlar",
        bpm=112, seed=33, prog="warm", hook="calm", hook_oct=0,
        lead=dict(timbre="pluck", level=0.26, bar_every=4),
        chords=dict(kind="muted", level=0.34, steps=[0, 6, 10], dur=0.3),
        bass=dict(kind="pluck", level=0.42, steps=[0, 6, 10]),
        drums=dict(kick=[0, 8], clap=[12], hat_open=[], hat=[2, 4, 6, 10, 12, 14], snare=[], doira=[], shaker=[], timpani=[]),
        fx=dict(whoosh=True, riser="none", impact=False, siren=False, every4=False),
        mix=dict(reverb=0.3, decay=1.2, bright=0.5, sidechain=0.3, wobble=0.0, chorus=0.0),
        pad=dict(kind="pad", level=0.26),
        sections={"intro": 0.14, "drop1": 0.32, "break": 0.14, "drop2": 0.28, "outro": 0.12},
    ),
    "kinetik": dict(
        label="Kinetik Tipografika", desc="Stakkato ritm, matn harflariga mos aniq zarbalar",
        bpm=124, seed=44, prog="dark", hook="pulse", hook_oct=12,
        lead=dict(timbre="pluck", level=0.30, bar_every=4),
        chords=dict(kind="stab", level=0.46, steps=[0, 2, 4, 6, 8, 10, 12, 14], dur=0.22),
        bass=dict(kind="sub", level=0.5, steps=[0, 4, 8, 12]),
        drums=dict(kick=[0, 4, 8, 12], clap=[4, 12], hat_open=[], hat=[0, 2, 4, 6, 8, 10, 12, 14],
                   snare=[10], doira=[0, 7], shaker=[], timpani=[]),
        fx=dict(whoosh=True, riser="short", impact=True, siren=False, every4=True),
        mix=dict(reverb=0.16, decay=0.8, bright=0.7, sidechain=0.6, wobble=0.0, chorus=0.0),
        pad=dict(kind="pad", level=0.0),
        sections={"intro": 0.08, "drop1": 0.36, "break": 0.10, "drop2": 0.34, "outro": 0.12},
    ),
    "reels": dict(
        label="Reels & TikTok Trend", desc="Quvnoq, doira+clap, yorqin pluck, tez o'tishlar",
        bpm=122, seed=55, prog="uplift", hook="pop", hook_oct=0,
        lead=dict(timbre="pluck", level=0.34, bar_every=4),
        chords=dict(kind="stab", level=0.4, steps=[0, 3, 8, 11], dur=0.5),
        bass=dict(kind="sub", level=0.5, steps=[0, 2, 4, 6, 8, 10, 12, 14]),
        drums=dict(kick=[0, 4, 8, 12], clap=[2, 6, 10, 14], hat_open=[6, 14], hat=[0, 2, 4, 8, 10, 12],
                   snare=[], doira=[0, 3, 7, 11, 15], shaker=[4, 12], timpani=[]),
        fx=dict(whoosh=True, riser="short", impact=True, siren=False, every4=True),
        mix=dict(reverb=0.2, decay=0.9, bright=0.7, sidechain=0.65, wobble=0.0, chorus=0.0),
        pad=dict(kind="pad", level=0.18),
        sections={"intro": 0.08, "drop1": 0.36, "break": 0.10, "drop2": 0.34, "outro": 0.12},
    ),
    "biznes": dict(
        label="Biznes & Korporativ", desc="Xotirjam, ishonchli, ortiqcha effektsiz",
        bpm=100, seed=66, prog="bright", hook="calm", hook_oct=0,
        lead=dict(timbre="bell", level=0.24, bar_every=4),
        chords=dict(kind="pad", level=0.36, steps=[0, 8], dur=1.9),
        bass=dict(kind="sub", level=0.46, steps=[0, 4, 8, 12]),
        drums=dict(kick=[0, 8], clap=[4, 12], hat_open=[], hat=[2, 6, 10, 14], snare=[], doira=[], shaker=[4, 12], timpani=[]),
        fx=dict(whoosh=True, riser="short", impact=False, siren=False, every4=False),
        mix=dict(reverb=0.28, decay=1.4, bright=0.5, sidechain=0.3, wobble=0.0, chorus=0.0),
        pad=dict(kind="pad", level=0.3),
        sections={"intro": 0.14, "drop1": 0.32, "break": 0.14, "drop2": 0.28, "outro": 0.12},
    ),
    "izometriya": dict(
        label="3D Izometriya & Grafika", desc="Shishasimon qo'ng'iroqlar, o'yinchoq kayfiyat",
        bpm=110, seed=77, prog="bright", hook="glass", hook_oct=12,
        lead=dict(timbre="bell", level=0.32, bar_every=2),
        chords=dict(kind="pluck", level=0.3, steps=[0, 6, 8, 14], dur=0.35),
        bass=dict(kind="pluck", level=0.4, steps=[0, 4, 8, 12]),
        drums=dict(kick=[0, 6, 8, 14], clap=[4, 12], hat_open=[2, 10], hat=[0, 4, 6, 8, 12, 14],
                   snare=[], doira=[3, 11], shaker=[6, 14], timpani=[]),
        fx=dict(whoosh=True, riser="short", impact=True, siren=False, every4=False),
        mix=dict(reverb=0.3, decay=1.0, bright=0.85, sidechain=0.45, wobble=0.0, chorus=0.15),
        pad=dict(kind="pad", level=0.2),
        sections={"intro": 0.12, "drop1": 0.34, "break": 0.12, "drop2": 0.30, "outro": 0.12},
    ),
    "retro": dict(
        label="Retro & Nostalgiya", desc="80-lar uslubi: kvadrat lead, lenta tebranishi, gated pad",
        bpm=108, seed=88, prog="dark", hook="rise", hook_oct=0,
        lead=dict(timbre="square", level=0.32, bar_every=4),
        chords=dict(kind="muted", level=0.38, steps=[0, 3, 6, 8, 11, 14], dur=0.22),
        bass=dict(kind="pluck", level=0.46, steps=[0, 2, 4, 6, 8, 10, 12, 14]),
        drums=dict(kick=[0, 8], clap=[4, 12], hat_open=[6, 14], hat=[0, 2, 4, 6, 8, 10, 12, 14],
                   snare=[4, 12], doira=[], shaker=[], timpani=[]),
        fx=dict(whoosh=True, riser="short", impact=True, siren=False, every4=False),
        mix=dict(reverb=0.26, decay=1.6, bright=0.45, sidechain=0.4, wobble=0.0016, chorus=0.25),
        pad=dict(kind="pad", level=0.24),
        sections={"intro": 0.14, "drop1": 0.32, "break": 0.14, "drop2": 0.28, "outro": 0.12},
    ),
    "savdo": dict(
        label="Savdo & Katta Chegirma", desc="Shoshilinch, baland clap, sirena va tez o'tishlar",
        bpm=126, seed=99, prog="uplift", hook="sale", hook_oct=0,
        lead=dict(timbre="pluck", level=0.36, bar_every=4),
        chords=dict(kind="stab", level=0.46, steps=[0, 2, 4, 6, 8, 10, 12, 14], dur=0.2),
        bass=dict(kind="reese", level=0.5, steps=[0, 2, 4, 6, 8, 10, 12, 14]),
        drums=dict(kick=[0, 4, 8, 12], clap=[2, 6, 10, 14], hat_open=[6, 14], hat=[0, 4, 8, 12],
                   snare=[15], doira=[0, 3, 7, 11], shaker=[4, 12], timpani=[]),
        fx=dict(whoosh=True, riser="long", impact=True, siren=True, every4=True),
        mix=dict(reverb=0.18, decay=0.9, bright=0.75, sidechain=0.7, wobble=0.0, chorus=0.0),
        pad=dict(kind="pad", level=0.0),
        sections={"intro": 0.08, "drop1": 0.36, "break": 0.08, "drop2": 0.36, "outro": 0.12},
    ),
    "kinematik": dict(
        label="Kinematik & Epik", desc="Sekin, keng, timpani va kuchli yakun",
        bpm=84, seed=111, prog="epic", hook="epic", hook_oct=0,
        lead=dict(timbre="saw", level=0.3, bar_every=4),
        chords=dict(kind="strings", level=0.56, steps=[0], dur=3.9),
        bass=dict(kind="sub", level=0.5, steps=[0, 8]),
        drums=dict(kick=[0], clap=[], hat_open=[], hat=[], snare=[], doira=[], shaker=[], timpani=[0, 8]),
        fx=dict(whoosh=True, riser="long", impact=True, siren=False, every4=False),
        mix=dict(reverb=0.5, decay=2.8, bright=0.4, sidechain=0.2, wobble=0.0, chorus=0.1),
        pad=dict(kind="strings", level=0.46),
        sections={"intro": 0.20, "drop1": 0.28, "break": 0.16, "drop2": 0.24, "outro": 0.12},
    ),
}

STYLE_MAP = {
    "kiberpank": "Kiberpank & Neon",
    "oltin": "Hashamatli Oltin",
    "minimal": "Zamonaviy Minimalizm",
    "kinetik": "Kinetik Tipografika",
    "reels": "Reels & TikTok Trend",
    "biznes": "Biznes & Korporativ",
    "izometriya": "3D Izometriya & Grafika",
    "retro": "Retro & Nostalgiya",
    "savdo": "Savdo & Katta Chegirma",
    "kinematik": "Kinematik & Epik",
}


def random_preset(seed=None):
    """Har safar boshqacha musiqa: barcha parametrlar tasodifiy tanlanadi."""
    rng = np.random.default_rng(seed if seed is not None else int.from_bytes(os.urandom(6), "little"))
    base = dict(PRESETS[rng.choice(list(PRESETS))])
    prog = str(rng.choice(list(PROGS)))
    hook = str(rng.choice(list(HOOKS)))
    timbre = str(rng.choice(list(LEADS)))
    kind = str(rng.choice(["stab", "pad", "muted", "strings"]))
    bk = str(rng.choice(["sub", "reese", "pluck"]))
    bpm = int(rng.integers(84, 132))
    # baraban naqshini ham tasodifiy yig'amiz
    kick = sorted(rng.choice(np.arange(0, 16, 2), size=int(rng.integers(2, 5)), replace=False).tolist())
    clap = sorted(rng.choice(np.arange(0, 16, 2), size=int(rng.integers(1, 4)), replace=False).tolist())
    hats = sorted(rng.choice(np.arange(0, 16), size=int(rng.integers(4, 10)), replace=False).tolist())
    doira = sorted(rng.choice(np.arange(0, 16), size=int(rng.integers(0, 5)), replace=False).tolist())
    steps = sorted(rng.choice(np.arange(16), size=int(rng.integers(2, 7)), replace=False).tolist())
    d = dict(
        label="Random (har safar yangi)", desc="Tasodifiy uslub, akkord, tembr va ritm",
        bpm=bpm, seed=int(rng.integers(0, 10 ** 6)), prog=prog, hook=hook,
        hook_oct=int(rng.choice([0, 0, 12])),
        lead=dict(timbre=timbre, level=float(rng.uniform(0.22, 0.38)), bar_every=int(rng.choice([2, 4]))),
        chords=dict(kind=kind, level=float(rng.uniform(0.3, 0.46)), steps=steps,
                    dur=float(rng.uniform(0.2, 1.6))),
        bass=dict(kind=bk, level=float(rng.uniform(0.4, 0.56)),
                  steps=sorted(rng.choice(np.arange(0, 16, 2), size=int(rng.integers(2, 8)), replace=False).tolist())),
        drums=dict(kick=kick, clap=clap, hat_open=[], hat=hats, snare=[], doira=doira,
                   shaker=[], timpani=[]),
        fx=dict(whoosh=True, riser=str(rng.choice(["short", "long", "none"])),
                impact=bool(rng.integers(0, 2)), siren=bool(rng.integers(0, 4) == 0),
                every4=bool(rng.integers(0, 2))),
        mix=dict(reverb=float(rng.uniform(0.14, 0.42)), decay=float(rng.uniform(0.8, 2.4)),
                 bright=float(rng.uniform(0.4, 0.9)), sidechain=float(rng.uniform(0.25, 0.7)),
                 wobble=float(rng.choice([0.0, 0.0, 0.0012])), chorus=float(rng.choice([0.0, 0.15, 0.25]))),
        pad=dict(kind=str(rng.choice(["pad", "strings"])), level=float(rng.uniform(0.0, 0.32))),
        sections={"intro": float(rng.uniform(0.08, 0.18)), "drop1": 0.32,
                  "break": float(rng.uniform(0.08, 0.16)), "drop2": 0.30, "outro": 0.12},
    )
    base.update(d)
    base["_random"] = True
    return base


# ----------------------------------------------------------------------------
# Aranjirovka
# ----------------------------------------------------------------------------
def add(bus, sig, start, gain=1.0, pan=0.0):
    i = int(round(start * SR))
    n = bus.shape[1]
    if i >= n or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: n - i]
    lg = gain * np.cos((pan + 1) * np.pi / 4) * 1.414
    rg = gain * np.sin((pan + 1) * np.pi / 4) * 1.414
    bus[0, i:i + len(sig)] += sig * lg
    bus[1, i:i + len(sig)] += sig * rg


def build(preset, dur, bpm=None, transpose=0):
    bpm = bpm or preset["bpm"]
    beat = 60.0 / bpm
    bar = 4 * beat
    step = beat / 4
    n = int(SR * dur)
    rng = np.random.default_rng(preset["seed"])
    drums = np.zeros((2, n))
    music = np.zeros((2, n))
    fx = np.zeros((2, n))

    prog = PROGS[preset["prog"]]
    if transpose:
        prog = [([x + transpose for x in ch], b + transpose) for ch, b in prog]
    hook = HOOKS[preset["hook"]]
    if preset.get("hook_oct"):
        hook = [None if x is None else x + preset["hook_oct"] for x in hook]
    if transpose:
        hook = [None if x is None else x + transpose for x in hook]

    # Bo'limlar (davomiylikka nisbatan)
    fr = preset["sections"]
    names = ["intro", "drop1", "break", "drop2", "outro"]
    bounds, acc = [], 0.0
    for nm in names:
        b = acc + fr[nm] * dur
        bounds.append((nm, acc, b))
        acc = b

    def section(t):
        for nm, a, b in bounds:
            if a <= t < b:
                return nm
        return "outro"

    kick_times = []
    nb = int(np.ceil(dur / bar))
    for bi in range(nb):
        t0 = bi * bar
        sec = section(t0)
        ch, broot = prog[bi % 4]
        full = sec in ("drop1", "drop2")
        soft = sec in ("intro", "outro", "break")

        # --- baraban
        dmul = 0.0 if soft else 1.0
        if sec == "break":
            dmul = 0.45
        if dmul > 0:
            for s in preset["drums"]["kick"]:
                if s % 2 and sec == "break":
                    continue
                add(drums, kick(rng, tune=48 if not soft else 44), t0 + s * step, 0.95 * dmul)
                kick_times.append(t0 + s * step)
            for s in preset["drums"]["clap"]:
                add(drums, clap(rng), t0 + s * step, 0.8 * dmul)
            for s in preset["drums"]["snare"]:
                add(drums, snare(rng), t0 + s * step, 0.7 * dmul, pan=0.05)
            for s in preset["drums"]["hat"]:
                add(drums, hat(rng), t0 + s * step, (0.32 if sec != "drop2" else 0.42) * dmul, pan=0.3)
            for s in preset["drums"]["hat_open"]:
                add(drums, hat(rng, open_=True), t0 + s * step, 0.3 * dmul, pan=0.25)
            for s in preset["drums"]["shaker"]:
                add(drums, shaker(rng), t0 + s * step, 0.5 * dmul, pan=-0.3)
            for s in preset["drums"]["timpani"]:
                add(drums, timpani(rng), t0 + s * step, 0.5 * dmul)
        # doira har bo'limda (intro/break'da yumshoqroq)
        dg = 0.55 if soft else 0.8
        for i, s in enumerate(preset["drums"]["doira"]):
            kind = "D" if i % 3 == 0 else "T"
            sig = dum(rng) if kind == "D" else tak(rng)
            add(drums, sig, t0 + s * step, dg * (0.85 if kind == "D" else 0.6), pan=0.15)
            add(drums, jingle(rng), t0 + s * step + step / 2, dg * 0.8, pan=0.35)

        # --- akkordlar
        cl = preset["chords"]["level"] * (1.15 if full else 0.9)
        for s in preset["chords"]["steps"]:
            ln = min(preset["chords"]["dur"], bar - s * step)
            if ln <= 0.05:
                continue
            add(music, chord_voice(ch, ln, preset["chords"]["kind"]), t0 + s * step, cl, pan=-0.25, )
            add(music, chord_voice([x + 12 for x in ch[:3]], ln, preset["chords"]["kind"]),
                t0 + s * step + 0.008, cl * 0.45, pan=0.25)

        # --- bas
        bmul = 1.0 if not soft else (0.55 if sec != "intro" else 0.0)
        if bmul > 0:
            for s in preset["bass"]["steps"]:
                ln = min(bar / max(1, len(preset["bass"]["steps"])), 2 * beat)
                add(music, bass(broot, ln, preset["bass"]["kind"]), t0 + s * step,
                    preset["bass"]["level"] * bmul)

        # --- pad
        if preset["pad"]["level"] > 0:
            add(music, chord_voice(ch, bar + 0.4, preset["pad"]["kind"]), t0,
                preset["pad"]["level"] * (1.15 if soft else 0.8), pan=-0.1)

        # --- ohang (hook), har N taktda
        if bi % max(1, preset["lead"]["bar_every"]) == 0:
            lvl = preset["lead"]["level"]
            if sec == "intro":
                lvl *= 0.55
            elif sec == "break":
                lvl *= 0.75
            play = hook
            if sec == "drop2":
                lvl *= 1.1
            i = 0
            while i < len(play):
                x = play[i]
                if x is None:
                    i += 1
                    continue
                j = i + 1
                while j < len(play) and play[j] is None:
                    j += 1
                ln = (j - i) * step + 0.05
                add(music, LEADS[preset["lead"]["timbre"]](x, ln), t0 + i * step, lvl, pan=0.12)
                i = j

    # --- FX: bo'lim chegaralari va har 4 takt
    fxp = preset["fx"]
    for nm, a, b in bounds[1:]:
        if fxp["whoosh"]:
            add(fx, whoosh(rng), a - 0.6, 0.6)
        if fxp["impact"]:
            add(fx, impact(rng), a, 0.7)
    if fxp["riser"] == "long":
        add(fx, riser(rng, 2.0), bounds[1][1] - 2.0, 0.9)
        add(fx, riser(rng, 1.5), bounds[3][1] - 1.5, 0.8)
    elif fxp["riser"] == "short":
        add(fx, riser(rng, 1.0), bounds[1][1] - 1.0, 0.6)
    if fxp["siren"]:
        add(fx, siren(rng), bounds[3][1] - 1.2, 0.7)
    if fxp["every4"]:
        for bi in range(0, nb, 4):
            t0 = bi * bar
            if t0 > 1.0:
                add(fx, whoosh(rng, 0.4), t0 - 0.4, 0.35)

    # --- filtr o'tishlari
    def sweep(bus, t_a, t_b, f_a, f_b):
        ia, ib = int(t_a * SR), min(n, int(t_b * SR))
        if ib - ia < 100:
            return
        cut = f_a * (f_b / f_a) ** np.linspace(0, 1, ib - ia)
        a_coef = np.exp(-2 * np.pi * cut / SR)
        for c in range(2):
            x = bus[c, ia:ib]
            s1 = s2 = 0.0
            y = np.empty_like(x)
            for i in range(len(x)):
                s1 = (1 - a_coef[i]) * x[i] + a_coef[i] * s1
                s2 = (1 - a_coef[i]) * s1 + a_coef[i] * s2
                y[i] = s2
            bus[c, ia:ib] = y

    sweep(music, bounds[0][1], bounds[0][2], 500, 5200)          # intro ochiladi
    sweep(music, bounds[2][1], bounds[2][2], 2600, 1200)         # break yumshaydi
    if fxp["riser"] != "none":
        sweep(music, bounds[3][1] - 2.0, bounds[3][1], 1200, 12000)  # drop2 oldidan ochiladi

    # --- sidechain (kick "nafas olishi")
    if preset["mix"]["sidechain"] > 0:
        sc = np.ones(n)
        idx = np.arange(n) / SR
        for k in kick_times:
            i = int(k * SR)
            j = min(n, i + int(0.32 * SR))
            if i >= n:
                continue
            x = idx[i:j] - k
            sc[i:j] = np.minimum(sc[i:j], 1 - preset["mix"]["sidechain"] * np.exp(-x / 0.09))
        music *= sc

    # --- reverb, xor, lenta tebranishi
    mx = preset["mix"]
    for c in range(2):
        music[c] = reverb(music[c], mx["reverb"], mx["decay"], mx["bright"])
    if mx["chorus"] > 0:
        d = int(0.018 * SR)
        m2 = np.roll(music, d, axis=1) * mx["chorus"]
        music = music * (1 - mx["chorus"] * 0.5) + m2
    mix = drums * 0.95 + music * 0.9 + fx * 0.85
    if mx["wobble"] > 0:
        t = np.arange(n) / SR
        drift = 1 + mx["wobble"] * np.sin(2 * np.pi * 0.6 * t)
        pos = np.cumsum(drift) - 1
        for c in range(2):
            mix[c] = np.interp(pos, np.arange(n), mix[c])

    # --- master
    fade = np.ones(n)
    fi, fo = int(0.08 * SR), int(1.8 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fade[-fo:] = np.linspace(1, 0, fo) ** 1.6
    mix = np.stack([hp(mix[c], 26, order=2) for c in range(2)]) * fade
    # RMS bo'yicha normallashtirish: bitta qattiq zarba butun trekni bosib ketmasin
    rms = float(np.sqrt(np.mean(mix ** 2)))
    if rms > 1e-9:
        mix *= 0.13 / rms
    peak = float(np.abs(mix).max())
    if peak > 0.95:
        mix = np.tanh(mix / peak * 1.6) / np.tanh(1.6) * 0.95
    return mix


def normalize_loudness(path, target=-12.0, tp=-1.0):
    """ffmpeg loudnorm bilan ovoz balandligini bir xil darajaga keltiradi."""
    tmp = path + ".norm.wav"
    try:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path,
                        "-af", f"loudnorm=I={target}:TP={tp}:LRA=9",
                        "-ar", str(SR), tmp], check=True)
        os.replace(tmp, path)
        return True
    except Exception as e:
        print("  (loudnorm ishlamadi:", e, ")")
        return False


def save(mix, path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    pcm = (mix.T * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return path


def to_mp3(wav_path):
    mp3 = os.path.splitext(wav_path)[0] + ".mp3"
    try:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav_path, "-b:a", "192k", mp3], check=True)
        return mp3
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser(description="HubServis musiqa studiyasi: 10 uslub + random rejim")
    ap.add_argument("--preset", help="uslub nomi yoki 'all' yoki 'random'")
    ap.add_argument("--list", action="store_true", help="uslublar ro'yxati")
    ap.add_argument("--dur", type=float, default=40.0, help="davomiylik, soniya (default 40)")
    ap.add_argument("--bpm", type=int, default=None, help="tezlikni majburan o'zgartirish")
    ap.add_argument("--transpose", type=int, default=0, help="yarim tonlarda surish")
    ap.add_argument("--seed", type=int, default=None, help="random uchun urug' (takrorlash mumkin)")
    ap.add_argument("--out", default=None, help="fayl yoki papka")
    ap.add_argument("--mp3", action="store_true", help="MP3 ham chiqarish")
    ap.add_argument("--no-normalize", action="store_true", help="ovoz balandligini tekislamaslik")
    a = ap.parse_args()

    if a.list or not a.preset:
        print("HubServis musiqa studiyasi — uslublar:\n")
        for k, p in PRESETS.items():
            print(f"  {k:12s} {p['label']:26s} {p['bpm']} BPM — {p['desc']}")
        print("\n  random      Har safar boshqacha: uslub, akkord, tembr va ritm tasodifiy")
        print("\nMisol: python3 hubmusic.py --preset reels --dur 40 --mp3")
        return

    out_root = a.out or OUT_DEFAULT
    jobs = []
    if a.preset == "all":
        for k in PRESETS:
            jobs.append((k, PRESETS[k], None))
    elif a.preset == "random":
        jobs.append(("random", random_preset(a.seed), a.seed))
    else:
        k = a.preset.strip().lower()
        if k not in PRESETS:
            print(f"Noma'lum uslub: {k}\nMavjud: {', '.join(PRESETS)}, random")
            sys.exit(2)
        jobs.append((k, PRESETS[k], None))

    os.makedirs(out_root if (not a.out or os.path.isdir(a.out) or a.preset == "all") else os.path.dirname(a.out) or ".", exist_ok=True)
    for name, preset, seed in jobs:
        t0 = time.time()
        mix = build(preset, a.dur, a.bpm, a.transpose)
        if a.preset == "all":
            dst = os.path.join(out_root, f"{name}.wav")
        elif a.out and (a.out.endswith(".wav") or a.out.endswith(".WAV")):
            dst = a.out
        else:
            stamp = time.strftime("%H%M%S")
            dst = os.path.join(out_root, f"{name}{'-' + str(seed) if seed else ''}-{stamp}.wav")
        save(mix, dst)
        if not a.no_normalize:
            normalize_loudness(dst)
        info = f"{a.dur:.0f}s · {time.time() - t0:.1f}s da yasaldi"
        if a.mp3:
            mp3 = to_mp3(dst)
            info += f" · {os.path.basename(mp3)}" if mp3 else ""
        print(f"  {preset['label']:26s} -> {dst}\n{'':28s}{info}")


if __name__ == "__main__":
    main()
