#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
브로 저널 — 발행 엔진 (Static Site Generation)
=================================================
data/columns.json 한 파일을 읽어서 아래를 '자동'으로 생성/갱신합니다.

  1) column/<id>.html      : 검색·AI 로봇이 바로 읽는 SEO 정적 페이지
                             (메타태그·OpenGraph·Schema.org + 스마트 내부링크 + 자동 추천글 + CTA)
  2) column/index.html     : 칼럼 목록(정적, 크롤 가능)
  3) src/columns.js        : 홈페이지(SPA)가 읽는 데이터  (window.COLUMNS)
  4) sitemap.xml           : 전체 페이지 사이트맵 (자동 갱신)
  5) <indexnow-key>.txt    : IndexNow 인증 키 파일

예약발행:
  글마다 date(예 "2026.07.01")를 미래로 적어두면, 그 날짜가 되기 전까진 발행되지 않습니다.
  date 가 '오늘 이하'인 글만 사이트/사이트맵/검색엔진에 노출됩니다. (draft:true 면 무조건 숨김)
  → 미리 여러 편 써두고 날짜만 박아두면, 매일 자동 빌드가 '그날 글'을 알아서 공개합니다.

사진:
  글에 image 를 생략하거나 "auto" 로 두면 카테고리에 맞는 우리 사진을 자동 배정합니다.
  본문(body) 중간에도 사진이 자연스럽게 한 장 자동 삽입됩니다(meta.autoInlinePhoto).
  원하는 위치에 직접 넣고 싶으면 body 배열에 {"img":"img/gym3.jpg","caption":"설명"} 를 끼우세요.

사용법:
  python3 tools/publish.py            # 발행(파일 생성). 그 뒤 폴더를 Netlify에 드래그 배포.
  python3 tools/publish.py --ping     # 배포 완료 '후' 실행 → 네이버/빙에 새 글 즉시 알림(IndexNow)
"""
import json, os, re, html, sys, datetime
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "columns.json")


def load():
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def iso_date(d):
    return d.replace(".", "-")


def esc(s):
    return html.escape(s, quote=True)


def smart_link(text_html, links):
    """본문(escape된 HTML)에서 키워드 첫 등장 1회를 내부링크로 자동 연결 (위키식)."""
    used = set()
    for kw, url in links.items():
        if kw in used:
            continue
        ekw = esc(kw)
        if ekw in text_html:
            text_html = text_html.replace(
                ekw,
                '<a href="%s" class="ilink">%s</a>' % (esc(url), ekw),
                1,
            )
            used.add(kw)
    return text_html


# ── 예약발행: 날짜 게이트 ───────────────────────────────────────────
KST = datetime.timezone(datetime.timedelta(hours=9))


def today_kst():
    """한국시간 기준 오늘 날짜. (자동배포가 UTC 서버에서 돌아도 날짜가 안 밀리도록)"""
    return datetime.datetime.now(KST).date()


def parse_date(d):
    """'2026.06.12' / '2026-06-12' → date 객체."""
    return datetime.date.fromisoformat(str(d).strip().replace(".", "-"))


def published_posts(cfg):
    """발행일(date)이 오늘(KST) 이하이고 draft 가 아닌 글만, 최신순으로."""
    today = today_kst()
    out = []
    for p in cfg["posts"]:
        if p.get("draft"):
            continue
        try:
            if parse_date(p["date"]) > today:
                continue  # 예약: 아직 발행일이 안 됨 → 숨김
        except Exception:
            pass  # 날짜 형식이 이상하면 그냥 노출
        out.append(p)
    out.sort(key=lambda p: str(p.get("date", "")), reverse=True)
    return out


# ── 사진: 카테고리별 자동 배정 + 본문 자동 삽입 ──────────────────────
def _stable_idx(s, n):
    """문자열로부터 항상 같은 인덱스(빌드마다 사진이 바뀌지 않도록)."""
    h = 2166136261
    for ch in str(s):
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return (h % n) if n else 0


def _pool(cfg, cat):
    pools = cfg.get("photoPools", {})
    return pools.get(cat) or pools.get("_default") or []


def resolve_hero(cfg, post):
    """대표사진: 지정돼 있으면 그대로, 없거나 'auto'면 카테고리 풀에서 자동 선택."""
    img = post.get("image")
    if img and img != "auto":
        return img
    pool = _pool(cfg, post.get("cat"))
    return pool[_stable_idx(post["id"], len(pool))] if pool else "img/logo-bro.png"


def resolve_inline(cfg, post, hero):
    """본문용 사진: 대표사진과 겹치지 않게 풀에서 한 장."""
    pool = [x for x in _pool(cfg, post.get("cat")) if x != hero]
    return pool[_stable_idx(post["id"] + "::inline", len(pool))] if pool else None


def normalize_body(cfg, post, hero):
    """body 를 블록 리스트로 정규화. 문단={type:p}, 사진={type:img}.
    명시 사진이 없고 문단이 충분하면 중간에 사진 한 장을 자동 삽입한다."""
    raw = post.get("body", [])
    blocks = []
    has_img = any(isinstance(b, dict) and b.get("img") for b in raw)
    for b in raw:
        if isinstance(b, dict) and b.get("img"):
            src = b["img"]
            if src == "auto":
                src = resolve_inline(cfg, post, hero) or hero
            blocks.append({"type": "img", "src": src, "caption": b.get("caption", "")})
        else:
            blocks.append({"type": "p", "text": b if isinstance(b, str) else str(b)})
    auto = cfg.get("meta", {}).get("autoInlinePhoto", True)
    if auto and not has_img:
        para_idx = [i for i, blk in enumerate(blocks) if blk["type"] == "p"]
        if len(para_idx) >= 4:
            inline = resolve_inline(cfg, post, hero)
            if inline:
                blocks.insert(para_idx[len(para_idx) // 2],
                              {"type": "img", "src": inline, "caption": ""})
    return blocks


def resolve_posts(cfg):
    """발행 대상 글에 대표사진/본문블록을 채운 '완성본' 리스트."""
    out = []
    for p in published_posts(cfg):
        hero = resolve_hero(cfg, p)
        rp = dict(p)
        rp["image"] = hero
        rp["body"] = normalize_body(cfg, p, hero)
        out.append(rp)
    return out


def render_body_html(cfg, blocks):
    out, first_p = [], True
    for blk in blocks:
        if blk.get("type") == "img":
            cap = ('<figcaption>%s</figcaption>' % esc(blk["caption"])) if blk.get("caption") else ""
            out.append('<figure class="cimg"><img src="/%s" alt="%s" loading="lazy" />%s</figure>'
                       % (esc(blk["src"]), esc(blk.get("caption") or "브로피트니스"), cap))
        else:
            t = smart_link(esc(blk["text"]), cfg.get("smartLinks", {}))
            out.append('<p%s>%s</p>' % (' class="lead"' if first_p else "", t))
            first_p = False
    return "\n    ".join(out)


PAGE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title} | {site}</title>
<meta name="description" content="{desc}" />
<link rel="canonical" href="{url}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="{site}" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{img}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/png" href="/img/logo-bro.png" />
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<script type="application/ld+json">
{schema}
</script>
<style>
 :root{{--ink:#0E0E10;--bro:#FF6A1A;--broDark:#E2540A;--cream:#FBF8F2;--ivory:#F6F2EA;}}
 *{{box-sizing:border-box;}} body{{margin:0;font-family:'Pretendard',system-ui,sans-serif;background:var(--cream);color:var(--ink);line-height:1.75;-webkit-font-smoothing:antialiased;}}
 a{{color:inherit;}} .wrap{{max-width:740px;margin:0 auto;padding:0 20px;}}
 header.site{{border-bottom:1px solid rgba(14,14,16,.08);background:var(--cream);}}
 header.site .wrap{{display:flex;align-items:center;height:64px;}}
 .logo img{{height:40px;width:auto;display:block;}}
 .hero{{position:relative;overflow:hidden;background:#14151a;color:#fff;}}
 .hero .cover{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5;}}
 .hero .scrim{{position:absolute;inset:0;background:linear-gradient(to top,#0E0E10,rgba(14,14,16,.6),rgba(14,14,16,.25));}}
 .hero .inner{{position:relative;z-index:2;max-width:740px;margin:0 auto;padding:120px 20px 56px;}}
 .cat{{color:var(--bro);font-weight:700;font-size:14px;margin:0 0 12px;}}
 h1{{font-size:30px;line-height:1.3;letter-spacing:-.01em;margin:0 0 18px;}}
 .meta{{color:rgba(255,255,255,.6);font-size:14px;display:flex;align-items:center;gap:8px;}}
 .meta img{{height:24px;width:24px;object-fit:contain;}}
 article{{padding:44px 0 8px;}}
 article p{{font-size:17px;color:rgba(14,14,16,.84);margin:0 0 22px;}}
 article p.lead::first-letter{{float:left;font-size:3.2em;line-height:.8;padding:.04em .12em 0 0;color:var(--bro);font-weight:800;}}
 .ilink{{color:var(--broDark);font-weight:600;text-decoration:underline;text-underline-offset:3px;}}
 figure.cimg{{margin:34px 0;}}
 figure.cimg img{{width:100%;border-radius:18px;display:block;}}
 figure.cimg figcaption{{margin-top:10px;font-size:14px;color:rgba(14,14,16,.5);text-align:center;}}
 .cta{{position:relative;background:var(--ink);color:#fff;border-radius:20px;padding:34px 28px;text-align:center;margin:36px 0;}}
 .cta .ey{{color:var(--bro);font-weight:700;font-size:13px;letter-spacing:.12em;}}
 .cta .big{{font-size:22px;font-weight:800;margin:8px 0 6px;}}
 .cta .sub{{color:rgba(255,255,255,.62);font-size:15px;margin:0;}}
 .btns{{margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}}
 .btn{{display:inline-block;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:999px;}}
 .btn.p{{background:var(--bro);color:#fff;}} .btn.s{{border:1px solid rgba(255,255,255,.45);color:#fff;}}
 .related{{background:var(--ivory);margin-top:8px;padding:40px 0;}}
 .related h2{{font-size:20px;margin:0 0 18px;}} .rgrid{{display:grid;gap:14px;}}
 .rcard{{display:block;background:#fff;border:1px solid rgba(14,14,16,.06);border-radius:16px;padding:18px 20px;text-decoration:none;}}
 .rcard .rc{{color:var(--bro);font-size:12px;font-weight:700;}} .rcard h3{{font-size:16px;margin:6px 0 0;line-height:1.4;}}
 .back{{display:inline-block;margin:6px 0 8px;color:var(--bro);font-weight:600;text-decoration:none;}}
 footer.site{{border-top:1px solid rgba(14,14,16,.08);padding:26px 0;color:rgba(14,14,16,.5);font-size:14px;}}
 @media(min-width:768px){{h1{{font-size:40px;}}}}
</style>
</head>
<body>
<header class="site"><div class="wrap"><a class="logo" href="/"><img src="/img/logo-bro.png" alt="{site}" /></a></div></header>
<div class="hero">
  <img class="cover" src="{img_rel}" alt="{title}" />
  <div class="scrim"></div>
  <div class="inner">
    <a class="back" href="/#/column">← 브로 저널</a>
    <p class="cat">#{cat} · 청주 헬스장</p>
    <h1>{title}</h1>
    <div class="meta"><img src="/img/logo-bro.png" alt="" /> 브로 트레이너 · {date} · 청주 용암/금천/복대</div>
  </div>
</div>
<div class="wrap">
  <article>
    {body}
  </article>
  <div class="cta">
    <p class="ey">{cta_eyebrow}</p>
    <p class="big">{cta_title}</p>
    <p class="sub">{cta_desc}</p>
    <div class="btns"><a class="btn p" href="{cta_purl}">{cta_ptext}</a><a class="btn s" href="{cta_surl}">{cta_stext}</a></div>
  </div>
</div>
{related}
<footer class="site"><div class="wrap">{site} · 충북 청주시 용암 / 금천 / 복대점 · <a href="/">brofitness.kr</a></div></footer>
</body>
</html>
"""


def render_related(cfg, post, posts):
    same = [p for p in posts if p["id"] != post["id"] and p["cat"] == post["cat"]]
    rest = [p for p in posts if p["id"] != post["id"] and p["cat"] != post["cat"]]
    picks = (same + rest)[:3]
    if not picks:
        return ""
    cards = ""
    for p in picks:
        cards += ('<a class="rcard" href="/column/%s.html"><span class="rc">#%s</span>'
                  '<h3>%s</h3></a>') % (esc(p["id"]), esc(p["cat"]), esc(p["title"]))
    return ('<div class="related"><div class="wrap"><h2>이어서 읽어보세요</h2>'
            '<div class="rgrid">%s</div></div></div>') % cards


def render_post(cfg, post, posts):
    meta = cfg["meta"]
    base = meta["baseUrl"]
    url = "%s/column/%s.html" % (base, post["id"])
    img_abs = "%s/%s" % (base, post["image"])
    # 본문: 블록(문단/사진) → 첫 문단 드롭캡 + 스마트 내부링크 + figure
    body_html = render_body_html(cfg, post["body"])
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post["title"],
        "description": post["excerpt"],
        "image": img_abs,
        "datePublished": iso_date(post["date"]),
        "dateModified": iso_date(post["date"]),
        "author": {"@type": "Organization", "name": meta["siteName"]},
        "publisher": {"@type": "Organization", "name": meta["siteName"],
                       "logo": {"@type": "ImageObject", "url": base + "/img/logo-bro.png"}},
        "mainEntityOfPage": url,
        "articleSection": post["cat"],
    }
    cta = cfg["cta"]
    return PAGE.format(
        title=esc(post["title"]), site=esc(meta["siteName"]), desc=esc(post["excerpt"]),
        url=esc(url), img=esc(img_abs), img_rel="/" + esc(post["image"]),
        schema=json.dumps(schema, ensure_ascii=False, indent=2),
        cat=esc(post["cat"]), date=esc(post["date"]), body=body_html,
        cta_eyebrow=esc(cta["eyebrow"]), cta_title=esc(cta["title"]), cta_desc=esc(cta["desc"]),
        cta_purl=esc(cta["primaryUrl"]), cta_ptext=esc(cta["primaryText"]),
        cta_surl=esc(cta["secondaryUrl"]), cta_stext=esc(cta["secondaryText"]),
        related=render_related(cfg, post, posts),
    )


INDEX = """<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{title} | {site}</title><meta name="description" content="{sub}"/>
<link rel="canonical" href="{base}/column/"/><link rel="icon" type="image/png" href="/img/logo-bro.png"/>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"/>
<style>body{{margin:0;font-family:'Pretendard',system-ui,sans-serif;background:#FBF8F2;color:#0E0E10;line-height:1.7}}
.wrap{{max-width:760px;margin:0 auto;padding:60px 20px}}h1{{font-size:34px;margin:0 0 6px}}.s{{color:#888;margin:0 0 30px}}
a.item{{display:block;padding:18px 0;border-top:1px solid #eee;text-decoration:none}}a.item .c{{color:#FF6A1A;font-size:13px;font-weight:700}}
a.item h2{{font-size:18px;margin:6px 0 4px}}a.item p{{margin:0;color:#666;font-size:14px}}</style></head>
<body><div class="wrap"><a href="/" style="color:#FF6A1A;font-weight:600;text-decoration:none">← 브로피트니스</a>
<h1>{title}</h1><p class="s">{sub}</p>{items}</div></body></html>
"""


def render_index(cfg, posts):
    meta = cfg["meta"]
    items = ""
    for p in posts:
        items += ('<a class="item" href="/column/%s.html"><span class="c">#%s</span>'
                  '<h2>%s</h2><p>%s</p></a>') % (esc(p["id"]), esc(p["cat"]), esc(p["title"]), esc(p["excerpt"]))
    return INDEX.format(title=esc(meta["title"]), site=esc(meta["siteName"]),
                        sub=esc(meta["subtitle"]), base=esc(meta["baseUrl"]), items=items)


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("  생성:", os.path.relpath(path, ROOT))


def build(cfg):
    meta = cfg["meta"]; base = meta["baseUrl"]
    posts = resolve_posts(cfg)          # 발행일이 된 글만 + 사진 자동 배정
    live_ids = {p["id"] for p in posts}
    scheduled = [p for p in cfg["posts"]
                 if not p.get("draft") and p["id"] not in live_ids]
    print("● 정적 칼럼 페이지 생성 …")
    for p in posts:
        write(os.path.join(ROOT, "column", p["id"] + ".html"), render_post(cfg, p, posts))
    write(os.path.join(ROOT, "column", "index.html"), render_index(cfg, posts))

    print("● SPA 데이터(src/columns.js) 생성 …")
    spa = {"eyebrow": meta["eyebrow"], "title": meta["title"], "subtitle": meta["subtitle"],
           "categories": cfg["categories"], "posts": posts}
    write(os.path.join(ROOT, "src", "columns.js"),
          "/* 자동 생성됨 — 직접 수정 금지. 글 수정은 data/columns.json + publish.py */\n"
          "window.COLUMNS = " + json.dumps(spa, ensure_ascii=False) + ";\n")

    print("● 사이트맵(sitemap.xml) 생성 …")
    today = today_kst().isoformat()
    urls = ['%s/' % base, '%s/column/' % base]
    urls += ['%s/column/%s.html' % (base, p["id"]) for p in posts]
    body = "".join(
        '  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (esc(u), today) for u in urls)
    write(os.path.join(ROOT, "sitemap.xml"),
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % body)

    print("● IndexNow 키 파일 생성 …")
    key = cfg["indexnow"]["key"]
    write(os.path.join(ROOT, key + ".txt"), key + "\n")
    print("\n✅ 발행 완료! 공개 %d개 칼럼." % len(posts))
    if scheduled:
        print("   ⏳ 예약 대기 %d개(발행일 도래 전):" % len(scheduled))
        for p in sorted(scheduled, key=lambda x: str(x.get("date", ""))):
            print("        %s  %s" % (p.get("date", "?"), p.get("title", p["id"])))
    print("   다음 단계: '브로피트니스-홈페이지업로드' 폴더를 Netlify에 드래그 → 배포")
    print("   배포 끝난 뒤:  python3 tools/publish.py --ping   (네이버·빙에 즉시 알림)")


def ping(cfg):
    meta = cfg["meta"]; base = meta["baseUrl"]; key = cfg["indexnow"]["key"]
    host = base.split("//")[-1]
    url_list = ['%s/' % base] + ['%s/column/%s.html' % (base, p["id"]) for p in published_posts(cfg)]
    payload = json.dumps({
        "host": host, "key": key, "keyLocation": "%s/%s.txt" % (base, key),
        "urlList": url_list,
    }).encode("utf-8")
    for ep in cfg["indexnow"]["endpoints"]:
        try:
            req = urllib.request.Request(ep, data=payload,
                                         headers={"Content-Type": "application/json; charset=utf-8"})
            with urllib.request.urlopen(req, timeout=15) as r:
                print("  IndexNow 핑 → %s : HTTP %s (%d개 URL)" % (ep, r.status, len(url_list)))
        except Exception as e:
            print("  IndexNow 핑 실패(%s): %s" % (ep, e))
    print("  ※ 빙·네이버는 IndexNow 지원. 구글은 미지원(사이트맵/서치콘솔로 처리).")


if __name__ == "__main__":
    cfg = load()
    if "--ping" in sys.argv:
        print("● IndexNow 핑 전송 (배포 후 실행해야 함) …")
        ping(cfg)
    else:
        build(cfg)
