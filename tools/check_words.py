# -*- coding: utf-8 -*-
"""単語データ（app/data/words.json）の点検ツール。

使い方（プロジェクトフォルダーで）:
    python tools/check_words.py

やること:
  - JSON として読めるか
  - 必須項目がそろっているか（id, word, pos, meanings, kana, level, theme, example, exampleJa）
  - id の重複がないか
  - level が 1〜3、theme が themes の一覧にあるか
  - 例文（example）の中に、その単語（または form で指定した形）が含まれているか
  - レベル別・テーマ別の語数を表示
問題があれば 1 行ずつ表示して、終了コード 1 で終わる。
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "words.json"
REQUIRED = ["id", "word", "pos", "meanings", "kana", "level", "theme", "example", "exampleJa"]


def variants(word: str) -> list[str]:
    """単語の活用形の候補（アプリ側 js/data.js と同じ規則）。"""
    w = word.lower()
    out = {w, w + "s", w + "es", w + "ed", w + "d", w + "ing"}
    if w.endswith("e"):
        out.add(w[:-1] + "ing")
        out.add(w[:-1] + "ed")
    if w.endswith("y"):
        out.add(w[:-1] + "ies")
        out.add(w[:-1] + "ied")
    if re.search(r"[^aeiou][aeiou][^aeiouwxy]$", w):
        out.add(w + w[-1] + "ing")
        out.add(w + w[-1] + "ed")
    return sorted(out, key=len, reverse=True)


def find_form(entry: dict) -> str | None:
    text = entry["example"]
    if entry.get("form"):
        pat = re.compile(r"\b" + re.escape(entry["form"]) + r"\b", re.IGNORECASE)
        m = pat.search(text)
        return m.group(0) if m else None
    for v in variants(entry["word"]):
        m = re.search(r"\b" + re.escape(v) + r"\b", text, re.IGNORECASE)
        if m:
            return m.group(0)
    return None


def main() -> int:
    try:
        data = json.loads(DATA.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"NG: JSON を読めません: {e}")
        return 1

    themes = set(data.get("themes", []))
    words = data.get("words", [])
    errors: list[str] = []
    seen_ids: Counter = Counter()

    for i, w in enumerate(words, 1):
        where = f"{i}番目 ({w.get('id', '?')})"
        for k in REQUIRED:
            if k not in w or w[k] in ("", None, []):
                errors.append(f"{where}: 項目 {k} がありません")
        if not isinstance(w.get("meanings"), list):
            errors.append(f"{where}: meanings はリストにしてください")
        if w.get("level") not in (1, 2, 3):
            errors.append(f"{where}: level は 1, 2, 3 のどれかにしてください")
        if w.get("theme") not in themes:
            errors.append(f"{where}: theme「{w.get('theme')}」が themes の一覧にありません")
        if "id" in w:
            seen_ids[w["id"]] += 1
            if w["id"] != w["id"].lower() or " " in w["id"]:
                errors.append(f"{where}: id は小文字・空白なしにしてください")
        if "example" in w and "word" in w and find_form(w) is None:
            errors.append(f"{where}: 例文に単語が見つかりません: {w['example']}")
        for k in ("example", "exampleJa"):
            if isinstance(w.get(k), str) and w[k] != w[k].strip():
                errors.append(f"{where}: {k} の前後に空白があります")

    for wid, n in seen_ids.items():
        if n > 1:
            errors.append(f"id「{wid}」が {n} 回あります（重複）")

    print(f"単語数: {len(words)}  データ版: {data.get('version')}")
    by_level = Counter(w.get("level") for w in words)
    print("レベル別:", ", ".join(f"中{k}: {v}" for k, v in sorted(by_level.items(), key=lambda x: str(x[0]))))
    by_theme = Counter(w.get("theme") for w in words)
    print("テーマ別:", ", ".join(f"{k} {v}" for k, v in by_theme.most_common()))
    forms = sum(1 for w in words if w.get("form"))
    print(f"form 指定あり: {forms}  note あり: {sum(1 for w in words if w.get('note'))}")

    if errors:
        print(f"\nNG: {len(errors)} 件の問題")
        for e in errors:
            print(" -", e)
        return 1
    print("\nOK: 問題は見つかりませんでした")
    return 0


if __name__ == "__main__":
    sys.exit(main())
