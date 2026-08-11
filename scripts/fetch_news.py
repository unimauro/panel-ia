#!/usr/bin/env python3
"""Recolecta titulares recientes sobre IA (prensa en español + Hacker News)
y los guarda en data/news.json para que el dashboard estático los consuma.

Solo usa la biblioteca estándar: corre igual en local y en GitHub Actions.
"""
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "news.json"
MAX_ITEMS = 60
UA = {"User-Agent": "Mozilla/5.0 (compatible; panel-ia/1.0; +https://unimauro.github.io/panel-ia)"}

RSS_FEEDS = [
    ("Google News",
     "https://news.google.com/rss/search?q=%22inteligencia%20artificial%22%20redes%20sociales&hl=es-419&gl=PE&ceid=PE:es-419",
     "es"),
    ("Google News",
     "https://news.google.com/rss/search?q=%22inteligencia%20artificial%22&hl=es-419&gl=PE&ceid=PE:es-419",
     "es"),
]

HN_API = "https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=25"


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def parse_rss(raw, lang):
    items = []
    root = ET.fromstring(raw)
    for it in root.iter("item"):
        title = clean(it.findtext("title"))
        link = clean(it.findtext("link"))
        source = clean(it.findtext("source")) or "Google News"
        pub = it.findtext("pubDate")
        try:
            dt = parsedate_to_datetime(pub).astimezone(timezone.utc)
        except Exception:
            continue
        # Google News suele poner " - Fuente" al final del título
        title = re.sub(r"\s+-\s+[^-]+$", "", title)
        if title and link:
            items.append({
                "title": title,
                "url": link,
                "source": source,
                "lang": lang,
                "published": dt.isoformat(),
            })
    return items


def fetch_hn():
    items = []
    data = json.loads(fetch(HN_API))
    for hit in data.get("hits", []):
        title = clean(hit.get("title"))
        url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
        ts = hit.get("created_at")
        if not (title and ts):
            continue
        items.append({
            "title": title,
            "url": url,
            "source": "Hacker News",
            "lang": "en",
            "published": ts,
        })
    return items


def main():
    items = []
    for name, url, lang in RSS_FEEDS:
        try:
            items.extend(parse_rss(fetch(url), lang))
        except Exception as e:
            print(f"[warn] {name} falló: {e}", file=sys.stderr)
    try:
        items.extend(fetch_hn())
    except Exception as e:
        print(f"[warn] Hacker News falló: {e}", file=sys.stderr)

    # dedupe por título normalizado
    seen, unique = set(), []
    for it in items:
        key = re.sub(r"\W+", "", it["title"].lower())[:80]
        if key and key not in seen:
            seen.add(key)
            unique.append(it)

    unique.sort(key=lambda x: x["published"], reverse=True)
    unique = unique[:MAX_ITEMS]

    if not unique:
        print("[error] ninguna fuente devolvió items; se conserva el JSON anterior", file=sys.stderr)
        sys.exit(0 if OUT.exists() else 1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "count": len(unique),
        "items": unique,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[ok] {len(unique)} noticias guardadas en {OUT}")


if __name__ == "__main__":
    main()
