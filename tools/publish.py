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
  5) rss.xml               : 최신 20편 RSS 2.0 피드 (네이버 서치어드바이저 RSS 제출용)
  6) <indexnow-key>.txt    : IndexNow 인증 키 파일

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
  python3 tools/publish.py --ping     # 배포 완료 '후' 실행 → 네이버/빙에 전체 URL 알림(IndexNow)
  python3 tools/publish.py --ping-new # 오늘 발행일이 도래한 글만 알림. Netlify 빌드에서 자동 실행됨.
                                      # (IndexNow 는 변경된 URL만 보내는 게 원칙이라 평소엔 이쪽을 쓴다)
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


# ── 사진: 전 칼럼에 걸쳐 '완전 중복 0' 배정 + 본문 자동 삽입 ──────────
#   원칙: 사이트 전체에서 사진은 '딱 한 번씩만' 사용한다(대표사진·본문사진 통틀어 중복 0).
#         - 카테고리에 맞는 사진 우선, 없으면 전체 클린 풀(_all)에서 보강.
#         - 사진이 모자라면(자리 > 사진 수) 남는 자리는 그냥 비운다(중복하느니 안 넣음).
#         - 나중에 img/ 에 사진을 추가하고 다시 발행하면 빈 자리가 자동으로 채워진다.
def _pool(cfg, cat):
    pools = cfg.get("photoPools", {})
    return pools.get(cat) or pools.get("_default") or []


def _cands(cfg, cat):
    """카테고리 풀 우선 + 전체 클린 풀(_all)로 보강한 후보 목록(중복 제거, 순서 유지)."""
    pool = _pool(cfg, cat)
    allp = cfg.get("photoPools", {}).get("_all", [])
    seen, out = set(), []
    for x in list(pool) + list(allp):
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out


def inline_slot_count(cfg, post):
    """이 글이 본문에 필요로 하는 사진 자리 수(대표사진 제외)."""
    raw = post.get("body", [])
    has_img = any(isinstance(b, dict) and b.get("img") for b in raw)
    auto_blocks = sum(1 for b in raw
                      if isinstance(b, dict) and b.get("img") == "auto")
    meta = cfg.get("meta", {})
    if not meta.get("autoInlinePhoto", True) or has_img:
        return auto_blocks
    n_para = sum(1 for b in raw if not (isinstance(b, dict) and b.get("img")))
    every = max(2, int(meta.get("inlineEvery", 3)))
    return len(set(range(every, n_para, every)))


def normalize_body(cfg, post, hero, queue):
    """body 를 블록(문단/사진)으로 정규화.
    본문 사진은 미리 배정된 queue(서로 겹치지 않는 사진 목록)에서 하나씩 꺼내 쓴다.
    queue 가 비면 사진 없이 넘어간다(중복 방지)."""
    raw = post.get("body", [])
    q = list(queue)
    has_img = any(isinstance(b, dict) and b.get("img") for b in raw)
    base = []
    for b in raw:
        if isinstance(b, dict) and b.get("img"):
            src = b["img"]
            if src == "auto":
                if not q:
                    continue                       # 남은 유니크 사진 없음 → 건너뜀
                src = q.pop(0)
            base.append({"type": "img", "src": src, "caption": b.get("caption", "")})
        else:
            base.append({"type": "p", "text": b if isinstance(b, str) else str(b)})

    meta = cfg.get("meta", {})
    if not meta.get("autoInlinePhoto", True) or has_img:
        return base

    n_para = sum(1 for blk in base if blk["type"] == "p")
    every = max(2, int(meta.get("inlineEvery", 3)))
    slots = set(range(every, n_para, every))       # 이 문단번호(1-base) '뒤'에 사진 삽입
    if not slots:
        return base

    out, pi = [], 0
    for blk in base:
        out.append(blk)
        if blk["type"] == "p":
            pi += 1
            if pi in slots and q:
                out.append({"type": "img", "src": q.pop(0), "caption": ""})
    return out


def resolve_posts(cfg):
    """발행 대상 글에 대표사진/본문블록을 채운 '완성본' 리스트.
    사이트 전체에서 사진이 '한 번씩만' 쓰이도록 한 배정기로 이어서 처리한다."""
    posts = published_posts(cfg)
    used = set()                                    # 사이트 전체에서 이미 쓴 사진
    # 명시 대표사진은 먼저 예약(자동배정이 가로채지 못하게)
    reserved = set(p["image"] for p in posts
                   if p.get("image") and p["image"] != "auto")

    # 1) 대표사진: 명시본 존중, 나머지는 카테고리에 맞는 '아직 안 쓴' 사진
    hero = {}
    for p in posts:
        img = p.get("image")
        if img and img != "auto":
            hero[p["id"]] = img
            used.add(img)
        else:
            pick = next((c for c in _cands(cfg, p.get("cat"))
                         if c not in used and c not in reserved), None) \
                or next((c for c in _cands(cfg, p.get("cat")) if c not in used), None) \
                or "img/logo-bro.png"
            hero[p["id"]] = pick
            used.add(pick)

    # 2) 본문사진: 라운드로빈으로 공평하게, 매번 '아직 안 쓴' 사진만(중복 0)
    need = {p["id"]: inline_slot_count(cfg, p) for p in posts}
    queues = {p["id"]: [] for p in posts}
    for _ in range(max(need.values()) if need else 0):
        for p in posts:
            pid = p["id"]
            if len(queues[pid]) >= need[pid]:
                continue
            pick = next((c for c in _cands(cfg, p.get("cat")) if c not in used), None)
            if pick:
                used.add(pick)
                queues[pid].append(pick)

    out = []
    for p in posts:
        rp = dict(p)
        rp["image"] = hero[p["id"]]
        rp["body"] = normalize_body(cfg, p, hero[p["id"]], queues[p["id"]])
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
<link rel="alternate" type="application/rss+xml" title="브로 저널" href="/rss.xml" />
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
    # post["related"]로 관련글을 직접 지정할 수 있다. 자동 선정은 같은 카테고리의
    # 앞쪽 글만 반복해서 골라 동네 랜딩끼리 서로 연결되지 않는다(피링크 1개).
    # 아직 발행일이 안 된 id는 posts에 없으므로 자연히 걸러진다.
    by_id = {p["id"]: p for p in posts}
    seen = {post["id"]}
    picks = []
    for rid in post.get("related", []):
        if rid in by_id and rid not in seen:
            picks.append(by_id[rid])
            seen.add(rid)
    same = [p for p in posts if p["id"] not in seen and p["cat"] == post["cat"]]
    rest = [p for p in posts if p["id"] not in seen and p["cat"] != post["cat"]]
    for p in same + rest:
        if len(picks) >= 3:
            break
        picks.append(p)
    if not picks:
        return ""
    cards = ""
    for p in picks:
        cards += ('<a class="rcard" href="/column/%s.html"><span class="rc">#%s</span>'
                  '<h3>%s</h3></a>') % (esc(p["id"]), esc(p["cat"]), esc(p["title"]))
    return ('<div class="related"><div class="wrap"><h2>이어서 읽어보세요</h2>'
            '<div class="rgrid">%s</div></div></div>') % cards


RSS_WDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
RSS_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def rfc822(d):
    """RSS pubDate 형식. 글에는 시각 정보가 없으므로 09:00 KST로 고정한다.
    요일·월 이름은 로케일과 무관하게 영문이어야 하므로 직접 만든다."""
    return "%s, %02d %s %d 09:00:00 +0900" % (
        RSS_WDAY[d.weekday()], d.day, RSS_MON[d.month - 1], d.year)


def rss_content(cfg, post, base):
    """RSS 본문. 네이버는 '이미지 링크가 포함된 본문 전체'를 권장하고,
    피드 안의 모든 URL이 소유확인된 도메인과 같기를 요구한다 → 절대경로로 바꾼다."""
    html = ('<figure><img src="/%s" alt="%s" /></figure>\n    %s'
            % (esc(post["image"]), esc(post["title"]),
               render_body_html(cfg, post["body"])))
    html = html.replace('src="/', 'src="%s/' % base).replace('href="/', 'href="%s/' % base)
    return "<![CDATA[%s]]>" % html.replace("]]>", "]]]]><![CDATA[>")


def render_rss(cfg, posts, limit=20):
    meta = cfg["meta"]
    base = meta["baseUrl"]
    items = ""
    for p in posts[:limit]:
        try:
            pub = rfc822(parse_date(p["date"]))
        except Exception:
            continue
        url = "%s/column/%s.html" % (base, p["id"])
        items += ("  <item>\n"
                  "    <title>%s</title>\n"
                  "    <link>%s</link>\n"
                  "    <guid isPermaLink=\"true\">%s</guid>\n"
                  "    <category>%s</category>\n"
                  "    <pubDate>%s</pubDate>\n"
                  "    <description>%s</description>\n"
                  "    <content:encoded>%s</content:encoded>\n"
                  "  </item>\n") % (esc(p["title"]), esc(url), esc(url),
                                    esc(p["cat"]), pub, esc(p["excerpt"]),
                                    rss_content(cfg, p, base))
    build_date = rfc822(today_kst())
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"'
            ' xmlns:content="http://purl.org/rss/1.0/modules/content/">\n'
            '<channel>\n'
            '  <title>%s | %s</title>\n'
            '  <link>%s/column/</link>\n'
            '  <atom:link href="%s/rss.xml" rel="self" type="application/rss+xml" />\n'
            '  <description>%s</description>\n'
            '  <language>ko</language>\n'
            '  <lastBuildDate>%s</lastBuildDate>\n'
            '%s</channel>\n</rss>\n') % (
        esc(meta["title"]), esc(meta["siteName"]), esc(base), esc(base),
        esc(meta["subtitle"]), build_date, items)


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
<link rel="canonical" href="{base}/column/"/><link rel="alternate" type="application/rss+xml" title="브로 저널" href="/rss.xml"/><link rel="icon" type="image/png" href="/img/logo-bro.png"/>
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


# ------------------------------------------------------------------ 정적 지점·요금 페이지
# index.html(SPA)은 해시 라우팅(/#/branch/yongam, /#/pricing)이라 검색엔진이 지점·요금을
# 개별 URL로 인식하지 못한다. 홈의 크롤 가능 텍스트도 사실상 0이라, 지역·상업 키워드로
# 노출될 페이지가 칼럼밖에 없었다. 같은 정보를 담은 정적 페이지를 만들어 색인 대상에 올린다.
SITE_JSON = os.path.join(ROOT, "data", "site.json")


def load_site():
    if not os.path.exists(SITE_JSON):
        return None
    with open(SITE_JSON, encoding="utf-8") as f:
        return json.load(f)


STATIC_CSS = """<style>
 :root{--ink:#0E0E10;--bro:#FF6A1A;--broDark:#E2540A;--cream:#FBF8F2;--ivory:#F6F2EA;}
 *{box-sizing:border-box;} body{margin:0;font-family:'Pretendard',system-ui,sans-serif;background:var(--cream);color:var(--ink);line-height:1.75;-webkit-font-smoothing:antialiased;}
 a{color:inherit;} .wrap{max-width:820px;margin:0 auto;padding:0 20px;}
 header.site{border-bottom:1px solid rgba(14,14,16,.08);background:var(--cream);}
 header.site .wrap{display:flex;align-items:center;height:64px;gap:16px;}
 header.site .logo img{height:40px;width:auto;display:block;}
 header.site nav{margin-left:auto;display:flex;gap:14px;font-size:14px;font-weight:600;}
 header.site nav a{text-decoration:none;color:rgba(14,14,16,.62);}
 .hero{position:relative;overflow:hidden;background:#14151a;color:#fff;}
 .hero .cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.45;}
 .hero .scrim{position:absolute;inset:0;background:linear-gradient(to top,#0E0E10,rgba(14,14,16,.6),rgba(14,14,16,.25));}
 .hero .inner{position:relative;z-index:2;max-width:820px;margin:0 auto;padding:104px 20px 48px;}
 .eyebrow{color:var(--bro);font-weight:700;font-size:14px;margin:0 0 10px;letter-spacing:.06em;}
 h1{font-size:30px;line-height:1.3;margin:0 0 14px;}
 .hero .sub{color:rgba(255,255,255,.72);font-size:16px;margin:0;}
 main{padding:36px 0 8px;}
 main p{font-size:17px;color:rgba(14,14,16,.84);margin:0 0 20px;}
 h2{font-size:22px;margin:38px 0 14px;}
 h3{font-size:18px;margin:26px 0 8px;}
 table.info{width:100%;border-collapse:collapse;margin:0 0 26px;font-size:16px;}
 table.info th{text-align:left;width:32%;padding:12px 10px;background:var(--ivory);border:1px solid rgba(14,14,16,.08);font-weight:700;}
 table.info td{padding:12px 10px;border:1px solid rgba(14,14,16,.08);}
 ul.list{padding-left:20px;margin:0 0 24px;} ul.list li{margin:0 0 8px;font-size:16px;}
 .gal{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0 0 30px;}
 .gal img{width:100%;border-radius:14px;display:block;aspect-ratio:4/3;object-fit:cover;}
 .cta{background:var(--ink);color:#fff;border-radius:20px;padding:32px 26px;text-align:center;margin:34px 0;}
 .cta .ey{color:var(--bro);font-weight:700;font-size:13px;letter-spacing:.12em;margin:0;}
 .cta .big{font-size:22px;font-weight:800;margin:8px 0 6px;}
 .cta .desc{color:rgba(255,255,255,.62);font-size:15px;margin:0;}
 .btns{margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
 .btn{display:inline-block;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px;}
 .btn.p{background:var(--bro);color:#fff;} .btn.s{border:1px solid rgba(255,255,255,.45);color:#fff;}
 .cards{display:grid;gap:12px;margin:0 0 30px;}
 .card{display:block;background:#fff;border:1px solid rgba(14,14,16,.07);border-radius:16px;padding:16px 18px;text-decoration:none;}
 .card b{display:block;font-size:16px;margin-bottom:4px;}
 .card span{font-size:14px;color:rgba(14,14,16,.55);}
 .crumb{font-size:13px;color:rgba(14,14,16,.5);padding:14px 0 0;margin:0;}
 footer.site{border-top:1px solid rgba(14,14,16,.08);padding:26px 0;color:rgba(14,14,16,.5);font-size:14px;margin-top:20px;}
 @media(min-width:768px){h1{font-size:38px;}}
</style>"""

STATIC_NAV = ('<header class="site"><div class="wrap">'
              '<a class="logo" href="/"><img src="/img/logo-bro.png" alt="브로피트니스 BRO FITNESS" /></a>'
              '<nav><a href="/pricing.html">요금</a>'
              '<a href="/branch/yongam.html">용암점</a>'
              '<a href="/branch/geumcheon.html">금천점</a>'
              '<a href="/branch/bokdae.html">복대점</a>'
              '<a href="/column/">저널</a></nav>'
              '</div></header>')

STATIC_FOOT = ('<footer class="site"><div class="wrap">'
               '브로피트니스 BRO FITNESS · 청주 '
               '<a href="/branch/yongam.html">용암점</a> / '
               '<a href="/branch/geumcheon.html">금천점</a> / '
               '<a href="/branch/bokdae.html">복대점</a> · '
               '<a href="/pricing.html">요금 안내</a> · '
               '<a href="/column/">브로 저널</a> · '
               '<a href="/">brofitness.kr</a>'
               '</div></footer>')


def static_page(title, desc, url, img_abs, schema, hero, body_html):
    """정적 페이지 공통 셸(head + 히어로 + 본문)."""
    return "\n".join([
        '<!DOCTYPE html>', '<html lang="ko">', '<head>',
        '<meta charset="UTF-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        '<title>%s</title>' % esc(title),
        '<meta name="description" content="%s" />' % esc(desc),
        '<link rel="canonical" href="%s" />' % esc(url),
        '<meta name="robots" content="index, follow, max-image-preview:large" />',
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="브로피트니스 BRO FITNESS" />',
        '<meta property="og:title" content="%s" />' % esc(title),
        '<meta property="og:description" content="%s" />' % esc(desc),
        '<meta property="og:url" content="%s" />' % esc(url),
        '<meta property="og:image" content="%s" />' % esc(img_abs),
        '<meta name="twitter:card" content="summary_large_image" />',
        '<link rel="alternate" type="application/rss+xml" title="브로 저널" href="/rss.xml" />',
        '<link rel="icon" type="image/png" href="/img/logo-bro.png" />',
        '<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />',
        '<script type="application/ld+json">',
        json.dumps(schema, ensure_ascii=False, indent=2),
        '</script>', STATIC_CSS, '</head>', '<body>', STATIC_NAV, hero,
        '<div class="wrap"><main>', body_html, '</main></div>', STATIC_FOOT,
        '</body>', '</html>', ''])


def breadcrumb(base, trail):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": base + path}
        for i, (name, path) in enumerate(trail)]}


def gym_schema(base, b):
    """지점 하나의 ExerciseGym 구조화데이터. url 은 색인되는 정적 페이지를 가리킨다."""
    return {
        "@type": "ExerciseGym",
        "@id": "%s/branch/%s.html#gym" % (base, b["id"]),
        "name": "브로피트니스 %s" % b["name"],
        "url": "%s/branch/%s.html" % (base, b["id"]),
        "image": "%s/%s" % (base, b["image"]),
        "telephone": b["tel"],
        "priceRange": "월 %s원" % b["price"],
        "currenciesAccepted": "KRW",
        "parentOrganization": {"@id": base + "/#org"},
        "address": {"@type": "PostalAddress", "streetAddress": b["street"],
                    "addressLocality": "청주시", "addressRegion": "충청북도",
                    "addressCountry": "KR"},
        "areaServed": [{"@type": "Place", "name": n} for n in (b.get("nearby") or [])],
        "openingHoursSpecification": [{
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday",
                          "Friday", "Saturday", "Sunday"],
            "opens": "00:00", "closes": "23:59"}],
        "sameAs": [b["naver"], b["instagram"]],
    }


def branch_related(posts, b):
    """지점과 지역이 맞는 칼럼을 골라 내부링크로 건다(칼럼 → 지점 반대 방향 연결)."""
    want = ["%s-gym" % b["id"], "cheongju-24h-gym", "cheongju-no-contract", "cheongju-pt-guide"]
    by_id = {p["id"]: p for p in posts}
    return [by_id[i] for i in want if i in by_id]


def render_branch(cfg, site, b, posts):
    base = cfg["meta"]["baseUrl"]
    url = "%s/branch/%s.html" % (base, b["id"])
    common = site["common"]
    # 제목 앞머리는 구 이름(상당구)보다 검색량이 큰 동 이름(용암동)을 쓴다.
    nearby = b.get("nearby") or []
    area = nearby[0] if nearby else b["name"]
    title = "청주 %s 헬스장 브로피트니스 %s | 24시간 무약정" % (area, b["name"])
    desc = b["summary"]
    hero = ('<div class="hero"><img class="cover" src="/%s" alt="브로피트니스 %s 내부" />'
            '<div class="scrim"></div><div class="inner">'
            '<p class="eyebrow">BRO FITNESS · %s</p><h1>브로피트니스 %s</h1>'
            '<p class="sub">%s</p></div></div>'
            % (esc(b["image"]), esc(b["name"]), esc(b.get("label") or b["name"]), esc(b["name"]), esc(desc)))
    parts = ['<p class="crumb"><a href="/">홈</a> › <a href="/pricing.html">요금·지점</a> › 브로피트니스 %s</p>' % esc(b["name"])]
    parts += ["<p>%s</p>" % esc(t) for t in b["intro"]]
    parts.append("<h2>브로피트니스 %s 이용 안내</h2>" % esc(b["name"]))
    parts.append(
        '<table class="info">'
        '<tr><th>주소</th><td>%s</td></tr>'
        '<tr><th>전화</th><td><a href="tel:%s">%s</a></td></tr>'
        '<tr><th>운영시간</th><td>%s</td></tr>'
        '<tr><th>월 구독료</th><td>%s원 (약정·위약금 없음)</td></tr>'
        '<tr><th>카카오 상담</th><td><a href="%s" rel="nofollow noopener" target="_blank">%s 카카오톡 채널</a></td></tr>'
        '<tr><th>지도</th><td><a href="%s" rel="nofollow noopener" target="_blank">네이버 지도에서 보기</a></td></tr>'
        '</table>' % (esc(b["addr"]), esc(b["phone"].replace("-", "")), esc(b["phone"]),
                      esc(common["hours"]), esc(b["price"]), esc(b["kakao"]),
                      esc(b["name"]), esc(b["naver"])))
    parts.append("<h2>구독에 포함된 것</h2>")
    parts.append('<ul class="list">%s</ul>'
                 % "".join("<li>%s</li>" % esc(x) for x in common["includes"]))
    parts.append("<h2>등록 조건</h2>")
    parts.append('<ul class="list">%s</ul>'
                 % "".join("<li>%s</li>" % esc(x) for x in common["policy"]))
    parts.append("<h2>%s 시설</h2>" % esc(b["name"]))
    parts.append('<div class="gal">%s</div>'
                 % "".join('<img src="/%s" alt="브로피트니스 %s 시설 사진" loading="lazy" />'
                           % (esc(g), esc(b["name"])) for g in b.get("gallery") or []))
    parts.append(
        '<div class="cta"><p class="ey">START TODAY</p>'
        '<p class="big">%s, 이번 달부터 시작하세요.</p>'
        '<p class="desc">월 %s원 · 약정 없음 · 연중무휴 24시간</p>'
        '<div class="btns"><a class="btn p" href="%s" rel="nofollow noopener" target="_blank">카카오톡으로 문의</a>'
        '<a class="btn s" href="/#/booking">무료체험 예약</a></div></div>'
        % (esc(b["name"]), esc(b["price"]), esc(b["kakao"])))
    others = [x for x in site["branches"] if x["id"] != b["id"]]
    parts.append("<h2>다른 지점</h2>")
    parts.append('<div class="cards">%s</div>' % "".join(
        '<a class="card" href="/branch/%s.html"><b>브로피트니스 %s</b><span>%s · 월 %s원</span></a>'
        % (esc(x["id"]), esc(x["name"]), esc(x["addr"]), esc(x["price"])) for x in others))
    rel = branch_related(posts, b)
    if rel:
        parts.append("<h2>읽어볼 만한 글</h2>")
        parts.append('<div class="cards">%s</div>' % "".join(
            '<a class="card" href="/column/%s.html"><b>%s</b><span>브로 저널</span></a>'
            % (esc(p["id"]), esc(p["title"])) for p in rel))
    schema = {"@context": "https://schema.org", "@graph": [
        gym_schema(base, b),
        breadcrumb(base, [("홈", "/"), ("요금·지점", "/pricing.html"),
                          ("브로피트니스 %s" % b["name"], "/branch/%s.html" % b["id"])]),
    ]}
    return static_page(title, desc, url, "%s/%s" % (base, b["image"]),
                       schema, hero, "\n".join(parts))


PRICING_FAQ = [
    ("약정 기간이 정말 없나요?",
     "없습니다. 한 달 단위 구독이라 다음 달에 이어갈지 말지를 매달 정하시면 됩니다. 중간에 멈춰도 위약금이 붙지 않습니다."),
    ("한 달만 다녀도 되나요?",
     "됩니다. 한 달만 이용하고 구독을 취소하셔도 추가로 내실 비용이 없습니다."),
    ("몇 시까지 운영하나요?",
     "용암·금천·복대 전 지점 모두 연중무휴 24시간 운영입니다. 새벽이나 심야, 주말과 공휴일에도 이용하실 수 있습니다."),
    ("운동복이나 수건을 챙겨가야 하나요?",
     "운동복 대여와 락커, 샤워실이 구독 요금에 포함되어 있어 몸만 오시면 됩니다."),
    ("지점마다 요금이 다른가요?",
     "용암점과 금천점은 월 34,900원, 복대점은 월 38,900원입니다. 지점별 시설 규모에 따라 차이가 있습니다."),
]


def render_pricing(cfg, site, posts):
    base = cfg["meta"]["baseUrl"]
    url = "%s/pricing.html" % base
    pr = site["pricing"]
    common = site["common"]
    title = "청주 헬스장 요금 | 월 34,900원부터 무약정 구독 — 브로피트니스"
    desc = pr["desc"]
    hero = ('<div class="hero"><img class="cover" src="/%s" alt="브로피트니스 회원 운동 모습" />'
            '<div class="scrim"></div><div class="inner">'
            '<p class="eyebrow">MEMBERSHIP</p><h1>%s</h1>'
            '<p class="sub">청주 용암 · 금천 · 복대 전 지점, 연중무휴 24시간</p></div></div>'
            % (esc(pr["image"]), esc(pr["title"])))
    parts = ['<p class="crumb"><a href="/">홈</a> › 요금 안내</p>']
    parts += ["<p>%s</p>" % esc(t) for t in pr["intro"]]
    parts.append("<h2>지점별 월 구독료</h2>")
    parts.append('<table class="info"><tr><th>지점</th><th>주소</th><th>월 구독료</th></tr>%s</table>'
                 % "".join('<tr><td><a href="/branch/%s.html">브로피트니스 %s</a></td>'
                           '<td>%s</td><td>%s원</td></tr>'
                           % (esc(b["id"]), esc(b["name"]), esc(b["addr"]), esc(b["price"]))
                           for b in site["branches"]))
    parts.append("<h2>요금에 포함된 것</h2>")
    parts.append('<ul class="list">%s</ul>'
                 % "".join("<li>%s</li>" % esc(x) for x in common["includes"]))
    parts.append("<h2>알아두실 점</h2>")
    parts.append('<ul class="list">%s</ul>'
                 % "".join("<li>%s</li>" % esc(x) for x in pr["notes"]))
    parts.append("<h2>자주 묻는 질문</h2>")
    for q, a in PRICING_FAQ:
        parts.append("<h3>%s</h3><p>%s</p>" % (esc(q), esc(a)))
    parts.append(
        '<div class="cta"><p class="ey">START TODAY</p>'
        '<p class="big">이번 달부터, 34,900원.</p>'
        '<p class="desc">용암·금천점 월 34,900원 · 복대점 월 38,900원</p>'
        '<p class="desc">약정 없이 한 달만 다녀 보셔도 됩니다.</p>'
        '<div class="btns"><a class="btn p" href="/#/booking">무료체험 예약하기</a>'
        '<a class="btn s" href="/column/">브로 저널 보기</a></div></div>')
    parts.append("<h2>지점 안내</h2>")
    parts.append('<div class="cards">%s</div>' % "".join(
        '<a class="card" href="/branch/%s.html"><b>브로피트니스 %s</b><span>%s · %s</span></a>'
        % (esc(b["id"]), esc(b["name"]), esc(b["addr"]), esc(common["hours"]))
        for b in site["branches"]))
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in PRICING_FAQ]},
        breadcrumb(base, [("홈", "/"), ("요금 안내", "/pricing.html")]),
    ] + [gym_schema(base, b) for b in site["branches"]]}
    return static_page(title, desc, url, "%s/%s" % (base, pr["image"]),
                       schema, hero, "\n".join(parts))


def static_urls(cfg, site):
    if not site:
        return []
    base = cfg["meta"]["baseUrl"]
    return ["%s/pricing.html" % base] + \
           ["%s/branch/%s.html" % (base, b["id"]) for b in site["branches"]]


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

    site = load_site()
    if site:
        print("● 정적 지점·요금 페이지 생성 …")
        for b in site["branches"]:
            write(os.path.join(ROOT, "branch", b["id"] + ".html"),
                  render_branch(cfg, site, b, posts))
        write(os.path.join(ROOT, "pricing.html"), render_pricing(cfg, site, posts))
    else:
        print("● data/site.json 없음 — 지점·요금 정적 페이지 생략")

    print("● 사이트맵(sitemap.xml) 생성 …")
    today = today_kst().isoformat()
    urls = ['%s/' % base, '%s/column/' % base]
    urls += static_urls(cfg, site)
    urls += ['%s/column/%s.html' % (base, p["id"]) for p in posts]
    body = "".join(
        '  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (esc(u), today) for u in urls)
    write(os.path.join(ROOT, "sitemap.xml"),
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % body)

    print("● RSS 피드(rss.xml) 생성 …")
    write(os.path.join(ROOT, "rss.xml"), render_rss(cfg, posts))

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


def newly_published_urls(cfg):
    """오늘(KST) 발행일이 도래한 글의 URL. 예약분이 자동 공개되는 날 그 글만 알리기 위함."""
    base = cfg["meta"]["baseUrl"]
    today = today_kst()
    out = []
    for p in cfg["posts"]:
        if p.get("draft"):
            continue
        try:
            if parse_date(p["date"]) != today:
                continue
        except Exception:
            continue
        out.append("%s/column/%s.html" % (base, p["id"]))
    return out


def ping(cfg, url_list=None):
    meta = cfg["meta"]; base = meta["baseUrl"]; key = cfg["indexnow"]["key"]
    host = base.split("//")[-1]
    if url_list is None:
        url_list = ['%s/' % base] + static_urls(cfg, load_site()) + \
                   ['%s/column/%s.html' % (base, p["id"]) for p in published_posts(cfg)]
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
    elif "--ping-new" in sys.argv:
        # Netlify 빌드에서 호출된다. 어떤 이유로든 핑이 실패해도 배포는 성공해야 하므로
        # 여기서 모든 예외를 잡고 정상 종료한다.
        try:
            urls = newly_published_urls(cfg)
            if not urls:
                print("● IndexNow: 오늘 새로 공개된 글 없음 — 핑 생략")
            else:
                print("● IndexNow 핑 (오늘 새로 공개된 %d건) …" % len(urls))
                ping(cfg, urls)
        except Exception as e:
            print("● IndexNow 핑 건너뜀(오류: %s) — 배포는 계속됩니다." % e)
    else:
        build(cfg)
