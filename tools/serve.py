# -*- coding: utf-8 -*-
"""手元で試すための簡易サーバー（app/ フォルダーをそのまま配信する）。

ふつうは run.bat から起動される（ポート番号は共通の台帳で決まる）。
直接動かすときは:  python tools/serve.py --port 20009

- /healthz は {"app": "englishwords1800"} を返す（共通ランチャーの識別用）
- キャッシュしない（編集した結果をすぐ確認できるように）
"""
from __future__ import annotations

import argparse
import http.server
import json
import os
import sys
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_DIR = ROOT / "app"
APP_NAME = "englishwords1800"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".svg": "image/svg+xml",
    }

    def do_GET(self):  # noqa: N802
        if self.path.split("?")[0] == "/healthz":
            body = json.dumps({"app": APP_NAME}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # 静かにする（エラー以外は出さない）
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT") or os.environ.get("APP_PORT") or 0))
    ap.add_argument("--host", default=os.environ.get("APP_HOST", "127.0.0.1"))
    args = ap.parse_args()
    if not args.port:
        print("ポート番号を --port で指定してください（ふつうは run.bat から起動します）")
        return 2
    handler = partial(Handler, directory=str(APP_DIR))
    try:
        httpd = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as e:
        print(f"{args.port}番で起動できませんでした: {e}")
        return 1
    print(f"まいにち英単語（手元用）: http://{args.host}:{args.port}/  終了は Ctrl+C")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
