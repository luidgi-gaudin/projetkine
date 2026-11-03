#!/usr/bin/env python3
"""
Crée le tableau Trello du sprint à partir de docs/scrum/backlog.json.

  1. https://trello.com/power-ups/admin : créer une Power-Up (n'importe quel nom),
     onglet « API key » : copier la clé, puis cliquer sur « Token » pour générer un jeton.
  2. TRELLO_KEY=... TRELLO_TOKEN=... python3 scripts/trello_import.py

Résultat : listes, étiquettes Dev / Réseau / Mixte, une carte par story (checklist Definition of Done)
dans « Product Backlog », une carte par tâche dans « Sprint Backlog », et les modèles de Daily et de Rétro.
Aucune dépendance : bibliothèque standard Python uniquement.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.trello.com/1"
ROOT = Path(__file__).resolve().parent.parent

LISTS = ["Infos sprint", "Product Backlog", "Sprint Backlog", "En cours", "À démontrer au PO", "Terminé", "Daily & Rétro"]
LABELS = {"Dev": "blue", "Réseau": "green", "Mixte": "purple", "Obstacle": "red", "Urgence": "orange", "Changement": "yellow"}

DAILY = """**Daily du [date]** · présents : …

- Hier : …
- Aujourd'hui : …
- Obstacles : … (carte « Obstacle » créée ? qui la lève ?)
- Dev ↔ Réseau : qui attend qui ? …"""

RETRO = """**Rétrospective : Start / Stop / Continue**

- Start : …
- Stop : …
- Continue : …
- Collaboration dev / réseau : ce qui a marché, ce qui a bloqué
- Actions concrètes (qui, quoi, quand) : …"""

PROOF = """---
**Fiche de preuve**
1. Ce que veut le client (une phrase simple) :
2. Comment on le prouve (le test que le PO montrera) :
3. Résultat (capture, vidéo, démo en direct) :
4. Definition of Done : cases cochées ci-dessous + preuve associée"""


def call(method: str, path: str, **params) -> dict:
    params.update(key=os.environ["TRELLO_KEY"], token=os.environ["TRELLO_TOKEN"])
    request = urllib.request.Request(
        f"{API}{path}", data=urllib.parse.urlencode(params).encode(), method=method,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    time.sleep(0.12)  # limite Trello : 100 requêtes / 10 s
    try:
        with urllib.request.urlopen(request) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        sys.exit(f"Trello a refusé {method} {path} : {error.code} {error.read().decode()[:200]}")


def checklist(card_id: str, name: str, items: list[str]) -> None:
    checklist_id = call("POST", "/checklists", idCard=card_id, name=name)["id"]
    for item in items:
        call("POST", f"/checklists/{checklist_id}/checkItems", name=item)


def main() -> None:
    if not os.environ.get("TRELLO_KEY") or not os.environ.get("TRELLO_TOKEN"):
        sys.exit(__doc__)

    data = json.loads((ROOT / "docs/scrum/backlog.json").read_text(encoding="utf-8"))
    board = call("POST", "/boards/", name=data["board"], defaultLists="false", defaultLabels="false")
    lists = {name: call("POST", "/lists", name=name, idBoard=board["id"], pos="bottom")["id"] for name in LISTS}
    labels = {name: call("POST", "/labels", name=name, color=color, idBoard=board["id"])["id"]
              for name, color in LABELS.items()}
    print(f"Tableau créé : {board['url']}")

    # Infos sprint : objectif, Definition of Done, mode d'emploi
    call("POST", "/cards", idList=lists["Infos sprint"], name="🎯 Sprint Goal", desc=data["sprintGoal"])
    dod = call("POST", "/cards", idList=lists["Infos sprint"], name="✅ Definition of Done",
               desc="Une carte n'est « Terminée » que si toutes les cases sont cochées.")
    checklist(dod["id"], "Definition of Done", data["definitionOfDone"])
    call("POST", "/cards", idList=lists["Infos sprint"], name="📌 Règles du tableau",
         desc="- Chaque carte porte une étiquette **Dev**, **Réseau** ou **Mixte**.\n"
              "- Un obstacle = une carte rouge **Obstacle**, tracée par le Scrum Master.\n"
              "- Urgence ou changement du client = étiquette **Urgence** / **Changement**, en haut du Sprint Backlog.\n"
              "- Le tableau est la source de vérité : si ce n'est pas dedans, ça n'existe pas.")

    for story in data["stories"]:
        tasks = "\n".join(f"- [{t['label']}] {t['title']}" for t in story["tasks"])
        card = call("POST", "/cards", idList=lists["Product Backlog"], pos="bottom", idLabels=labels["Mixte"],
                    name=f"{story['id']} · {story['title']}",
                    desc=f"{story['story']}\n\n**Preuve :** {story['proof']}\n\n"
                         f"**Priorité :** {story['priority']} · **Points :** {story['points']}\n\n"
                         f"**Tâches :**\n{tasks}\n\n{PROOF}")
        checklist(card["id"], "Definition of Done", data["definitionOfDone"])
        for task in story["tasks"]:
            call("POST", "/cards", idList=lists["Sprint Backlog"], pos="bottom", idLabels=labels[task["label"]],
                 name=f"[{story['id']}] {task['title']}", desc=f"Story : {card['shortUrl']}")
        print(f"  {story['id']} · {len(story['tasks'])} tâches")

    call("POST", "/cards", idList=lists["Daily & Rétro"], name="Modèle · Compte-rendu de Daily", desc=DAILY)
    call("POST", "/cards", idList=lists["Daily & Rétro"], name="Modèle · Rétrospective", desc=RETRO)
    print(f"\nTerminé. Partagez le tableau avec le client (bouton « Partager ») : {board['url']}")


if __name__ == "__main__":
    main()
