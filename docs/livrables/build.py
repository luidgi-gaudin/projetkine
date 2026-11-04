#!/usr/bin/env python3
"""Génère les trois livrables PDF à partir des sources HTML de docs/livrables/src.

    python3 docs/livrables/build.py            # les trois documents
    python3 docs/livrables/build.py rapport    # un seul

Les sources HTML peuvent inclure un fichier du dossier src avec <!--include:nom.svg-->.
Le rendu passe par Google Chrome sans interface (impression PDF, polices du site).
"""
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DOCS = {
    "rapport": "Synego-Rapport-de-projet.pdf",
    "documentation-utilisateur": "Synego-Documentation-utilisateur.pdf",
    "documentation-technique": "Synego-Documentation-technique.pdf",
}


def render(name: str, output: str) -> None:
    html = (SRC / f"{name}.html").read_text(encoding="utf-8")
    html = re.sub(r"<!--include:([\w.-]+)-->", lambda m: (SRC / m.group(1)).read_text(encoding="utf-8"), html)
    built = SRC / f".{name}.build.html"  # même dossier : chemins relatifs (css, img) inchangés
    built.write_text(html, encoding="utf-8")
    try:
        pdf = ROOT / output
        pdf.unlink(missing_ok=True)
        with tempfile.TemporaryDirectory() as profile:
            chrome = subprocess.Popen([
                CHROME, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={profile}",
                "--no-pdf-header-footer", "--allow-file-access-from-files", "--run-all-compositor-stages-before-draw",
                "--virtual-time-budget=8000", f"--print-to-pdf={pdf}", built.as_uri(),
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            # Chrome ne se ferme pas toujours après l'impression : on attend un fichier stable, puis on le ferme.
            last, stable = -1, 0
            for _ in range(240):
                if chrome.poll() is not None:
                    break
                size = pdf.stat().st_size if pdf.exists() else -1
                stable = stable + 1 if size > 0 and size == last else 0
                last = size
                if stable >= 4:
                    break
                time.sleep(0.5)
            chrome.terminate()
            try:
                chrome.wait(timeout=10)
            except subprocess.TimeoutExpired:
                chrome.kill()
        if not pdf.exists() or pdf.stat().st_size == 0:
            raise SystemExit(f"Échec de l'impression de {name}")
    finally:
        built.unlink(missing_ok=True)
    print(f"{output} : {(ROOT / output).stat().st_size // 1024} Ko")


if __name__ == "__main__":
    wanted = sys.argv[1:] or list(DOCS)
    for doc in wanted:
        render(doc, DOCS[doc])
