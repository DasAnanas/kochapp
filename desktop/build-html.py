#!/usr/bin/env python3
"""Baut eine einzelne, im Browser startbare Kochapp-Datei (nur Standardbibliothek)."""
from pathlib import Path
import re


def build():
    root = Path(__file__).resolve().parent.parent
    html = (root / "index.html").read_text(encoding="utf-8")
    css = (root / "style.css").read_text(encoding="utf-8")
    css = re.sub(r"</style", r"<\\/style", css, flags=re.IGNORECASE)
    html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>\n{css}\n</style>")
    for name in ("data.js", "rezepte.js", "bilder.js", "logic.js", "order.js", "app.js"):
        script = (root / name).read_text(encoding="utf-8")
        script = re.sub(r"</script", r"<\\/script", script, flags=re.IGNORECASE)
        html = html.replace(f'<script src="{name}"></script>', f"<script>\n{script}\n</script>")
    target = root / "Kochapp.html"
    target.write_text(html, encoding="utf-8")
    print(f"Fertig: {target} ({target.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build()
