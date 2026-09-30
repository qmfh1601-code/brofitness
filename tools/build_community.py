#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
브로 커뮤니티 발행 생성기
  data/community.json  ->  src/community.js        (window.COMMUNITY, 앱이 읽음)
                       ->  community/<id>.html      (정적 SEO 페이지 + DiscussionForumPosting/Comment 스키마)
                       ->  community/index.html     (목록 페이지)
                       ->  sitemap.xml              (community 블록 멱등 삽입)

칼럼 파이프라인(publish.py)과 동일한 철학. 색상/폰트는 홈페이지와 동일 팔레트.
직접 수정하는 파일은 data/community.json 뿐. 나머지는 이 스크립트가 생성한다.
"""
import json
import os
import re
import html
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "community.json")
JS_OUT = os.path.join(ROOT, "src", "community.js")
COMM_DIR = os.path.join(ROOT, "community")
SITEMAP = os.path.join(ROOT, "sitemap.xml")

BASE_URL = "https://brofitness.kr"
ORG = "브로피트니스 BRO FITNESS"
LOGO = "https://brofitness.kr/img/logo-bro.png"


def esc(s):
    return html.escape(s or "", quote=True)


def iso_date(d):
    # "2026.09.29" -> "2026-09-29"
    return (d or "").replace(".", "-")


def avatar_color(name):
    """이름 해시 기반 결정적 아바타 색 (프론트 JSX와 동일 로직 유지)."""
    h = 0
    for ch in (name or "?"):
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    hue = h % 360
    return "hsl(%d, 42%%, 46%%)" % hue


def body_text(body):
    parts = []
    for blk in body or []:
        if isinstance(blk, dict):
            if blk.get("type") == "p":
                parts.append(blk.get("text", ""))
        elif isinstance(blk, str):
            parts.append(blk)
    return "\n\n".join(parts)


def comment_count(post):
    return len(post.get("comments") or [])


# ---------------------------------------------------------------------------
# 1) src/community.js
# ---------------------------------------------------------------------------
def write_js(data):
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    js = (
        "/* 자동 생성됨 — 직접 수정 금지. 글 수정은 data/community.json + build_community.py */\n"
        "window.COMMUNITY = " + payload + ";\n"
    )
    with open(JS_OUT, "w", encoding="utf-8") as f:
        f.write(js)


# ---------------------------------------------------------------------------
# 2) community/<id>.html  (정적 SEO 페이지)
# ---------------------------------------------------------------------------
POST_TMPL = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title} | 브로 커뮤니티</title>
<meta name="description" content="{desc}" />
<link rel="canonical" href="{url}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="{org}" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{logo}" />
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
 .top{{padding:28px 0 6px;}}
 .back{{display:inline-block;margin:0 0 14px;color:var(--bro);font-weight:600;text-decoration:none;font-size:14px;}}
 .cat{{color:var(--bro);font-weight:700;font-size:13px;}}
 h1{{font-size:26px;line-height:1.32;letter-spacing:-.01em;margin:8px 0 16px;}}
 .byline{{display:flex;align-items:center;gap:10px;color:rgba(14,14,16,.55);font-size:14px;margin-bottom:6px;}}
 .av{{width:34px;height:34px;border-radius:999px;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:15px;flex:0 0 auto;}}
 .stat{{display:flex;gap:16px;color:rgba(14,14,16,.45);font-size:13px;border-top:1px solid rgba(14,14,16,.08);border-bottom:1px solid rgba(14,14,16,.08);padding:12px 0;margin:16px 0 4px;}}
 article{{padding:22px 0 8px;}} article p{{font-size:17px;color:rgba(14,14,16,.86);margin:0 0 20px;}}
 figure.cimg{{margin:26px 0;}} figure.cimg img{{width:100%;border-radius:16px;display:block;}}
 .cbox{{margin:30px 0 8px;}} .cbox h2{{font-size:18px;margin:0 0 16px;}}
 .cmt{{display:flex;gap:12px;padding:16px 0;border-top:1px solid rgba(14,14,16,.07);}}
 .cmt .body{{flex:1;}} .cmt .who{{font-weight:700;font-size:14px;}} .cmt .when{{color:rgba(14,14,16,.4);font-size:12px;margin-left:6px;}}
 .cmt p{{margin:6px 0 0;font-size:15px;color:rgba(14,14,16,.82);}}
 .cta{{position:relative;background:var(--ink);color:#fff;border-radius:20px;padding:30px 26px;text-align:center;margin:30px 0;}}
 .cta .ey{{color:var(--bro);font-weight:700;font-size:13px;letter-spacing:.12em;}}
 .cta .big{{font-size:21px;font-weight:800;margin:8px 0 6px;}} .cta .sub{{color:rgba(255,255,255,.62);font-size:15px;margin:0;}}
 .btns{{margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}}
 .btn{{display:inline-block;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;}}
 .btn.p{{background:var(--bro);color:#fff;}} .btn.s{{border:1px solid rgba(255,255,255,.45);color:#fff;}}
 .related{{background:var(--ivory);margin-top:8px;padding:36px 0;}}
 .related h2{{font-size:19px;margin:0 0 16px;}} .rgrid{{display:grid;gap:12px;}}
 .rcard{{display:block;background:#fff;border:1px solid rgba(14,14,16,.06);border-radius:14px;padding:16px 18px;text-decoration:none;}}
 .rcard .rc{{color:var(--bro);font-size:12px;font-weight:700;}} .rcard h3{{font-size:15px;margin:6px 0 0;line-height:1.4;}}
 footer.site{{border-top:1px solid rgba(14,14,16,.08);padding:24px 0;color:rgba(14,14,16,.5);font-size:14px;}}
 @media(min-width:768px){{h1{{font-size:32px;}}}}
</style>
</head>
<body>
<header class="site"><div class="wrap"><a class="logo" href="/"><img src="/img/logo-bro.png" alt="{org}" /></a></div></header>
<div class="wrap">
  <div class="top">
    <a class="back" href="/#/community">← 브로 커뮤니티</a>
    <div class="cat">#{cat}</div>
    <h1>{title}</h1>
    <div class="byline"><span class="av" style="background:{avcolor}">{avchar}</span> <span>{author}</span></div>
    <div class="stat"><span>{date}</span><span>좋아요 {likes}</span><span>댓글 {ccount}</span></div>
  </div>
  <article>
{article}
  </article>
  <div class="cbox">
    <h2>댓글 {ccount}</h2>
{comments}
  </div>
  <div class="cta">
    <p class="ey">JOIN THE CREW</p>
    <p class="big">청주에서 같이 운동해요.</p>
    <p class="sub">한 달 34,900원 · 약정 없이 무료체험으로 시작 (용암·금천·복대)</p>
    <div class="btns"><a class="btn p" href="/#/booking">무료체험 예약하기</a><a class="btn s" href="/#/community">커뮤니티 더 보기</a></div>
  </div>
</div>
<div class="related"><div class="wrap"><h2>다른 이야기</h2><div class="rgrid">{related}</div></div></div>
<footer class="site"><div class="wrap">{org} · 충북 청주시 용암 / 금천 / 복대점 · <a href="/">brofitness.kr</a></div></footer>
</body>
</html>
"""


def render_article(body):
    out = []
    for blk in body or []:
        if isinstance(blk, dict) and blk.get("type") == "img":
            src = esc(blk.get("src", ""))
            cap = esc(blk.get("caption", ""))
            out.append('    <figure class="cimg"><img src="/%s" alt="%s" loading="lazy" /></figure>' % (src, cap or "브로피트니스"))
        else:
            text = blk.get("text", "") if isinstance(blk, dict) else blk
            out.append("    <p>%s</p>" % esc(text))
    return "\n".join(out)


def render_comments(comments):
    out = []
    for c in comments or []:
        who = c.get("author", "익명")
        out.append(
            '    <div class="cmt"><span class="av" style="background:%s">%s</span>'
            '<div class="body"><span class="who">%s</span><span class="when">%s</span>'
            '<p>%s</p></div></div>'
            % (avatar_color(who), esc(who[:1]), esc(who), esc(c.get("date", "")), esc(c.get("text", "")))
        )
    return "\n".join(out) or '    <p style="color:rgba(14,14,16,.4);font-size:15px">아직 댓글이 없어요. 첫 댓글을 남겨보세요!</p>'


def build_schema(post):
    comments = []
    for c in post.get("comments") or []:
        comments.append({
            "@type": "Comment",
            "text": c.get("text", ""),
            "dateCreated": iso_date(c.get("date")),
            "author": {"@type": "Person", "name": c.get("author", "익명")},
        })
    schema = {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        "headline": post.get("title", ""),
        "articleSection": post.get("cat", ""),
        "text": body_text(post.get("body")),
        "datePublished": iso_date(post.get("date")),
        "url": "%s/community/%s.html" % (BASE_URL, post.get("id")),
        "author": {"@type": "Person", "name": post.get("author", "익명")},
        "publisher": {"@type": "Organization", "name": ORG, "logo": {"@type": "ImageObject", "url": LOGO}},
        "interactionStatistic": [
            {"@type": "InteractionCounter", "interactionType": "https://schema.org/LikeAction",
             "userInteractionCount": post.get("likes", 0)},
            {"@type": "InteractionCounter", "interactionType": "https://schema.org/CommentAction",
             "userInteractionCount": comment_count(post)},
        ],
        "commentCount": comment_count(post),
    }
    if comments:
        schema["comment"] = comments
    return json.dumps(schema, ensure_ascii=False, indent=2)


def render_related(posts, current):
    same = [p for p in posts if p["id"] != current["id"] and p.get("cat") == current.get("cat")]
    others = [p for p in posts if p["id"] != current["id"] and p.get("cat") != current.get("cat")]
    picks = (same + others)[:3]
    out = []
    for p in picks:
        out.append(
            '<a class="rcard" href="/community/%s.html"><span class="rc">#%s</span><h3>%s</h3></a>'
            % (esc(p["id"]), esc(p.get("cat", "")), esc(p.get("title", "")))
        )
    return "".join(out)


def excerpt_of(post):
    t = body_text(post.get("body")).replace("\n", " ").strip()
    return (t[:110] + "…") if len(t) > 110 else t


def write_posts(data):
    os.makedirs(COMM_DIR, exist_ok=True)
    posts = data.get("posts", [])
    for post in posts:
        author = post.get("author", "익명")
        htmlout = POST_TMPL.format(
            title=esc(post.get("title", "")),
            desc=esc(excerpt_of(post)),
            url="%s/community/%s.html" % (BASE_URL, post.get("id")),
            org=esc(ORG),
            logo=LOGO,
            schema=build_schema(post),
            cat=esc(post.get("cat", "")),
            author=esc(author),
            avcolor=avatar_color(author),
            avchar=esc(author[:1]),
            date=esc(post.get("date", "")),
            likes=post.get("likes", 0),
            ccount=comment_count(post),
            article=render_article(post.get("body")),
            comments=render_comments(post.get("comments")),
            related=render_related(posts, post),
        )
        with open(os.path.join(COMM_DIR, post["id"] + ".html"), "w", encoding="utf-8") as f:
            f.write(htmlout)


# ---------------------------------------------------------------------------
# 3) community/index.html
# ---------------------------------------------------------------------------
def write_index(data):
    meta = data.get("meta", {})
    rows = []
    for p in data.get("posts", []):
        rows.append(
            '<a class="item" href="/community/%s.html"><span class="c">#%s</span>'
            '<h2>%s</h2><p class="m">%s · 댓글 %d · 좋아요 %d</p></a>'
            % (esc(p["id"]), esc(p.get("cat", "")), esc(p.get("title", "")),
               esc(p.get("author", "")), comment_count(p), p.get("likes", 0))
        )
    doc = (
        '<!DOCTYPE html>\n<html lang="ko"><head><meta charset="UTF-8"/>'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'
        '<title>브로 커뮤니티 | %s</title>'
        '<meta name="description" content="%s"/>'
        '<link rel="canonical" href="%s/community/"/>'
        '<link rel="icon" type="image/png" href="/img/logo-bro.png"/>'
        '<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"/>'
        '<style>body{margin:0;font-family:\'Pretendard\',system-ui,sans-serif;background:#FBF8F2;color:#0E0E10;line-height:1.7}'
        '.wrap{max-width:760px;margin:0 auto;padding:56px 20px}h1{font-size:32px;margin:0 0 6px}.s{color:#888;margin:0 0 28px}'
        'a.item{display:block;padding:18px 0;border-top:1px solid #eee;text-decoration:none}a.item .c{color:#FF6A1A;font-size:13px;font-weight:700}'
        'a.item h2{font-size:17px;margin:6px 0 4px;line-height:1.4}a.item p.m{margin:0;color:#888;font-size:13px}</style></head>'
        '<body><div class="wrap"><a href="/" style="color:#FF6A1A;font-weight:600;text-decoration:none">← 브로피트니스</a>'
        '<h1>%s</h1><p class="s">%s</p>%s</div></body></html>\n'
        % (esc(ORG), esc(meta.get("subtitle", "")), BASE_URL,
           esc(meta.get("title", "브로 커뮤니티")), esc(meta.get("subtitle", "")), "".join(rows))
    )
    with open(os.path.join(COMM_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(doc)


# ---------------------------------------------------------------------------
# 4) sitemap.xml  (community 블록 멱등 삽입)
# ---------------------------------------------------------------------------
START = "  <!-- community:start -->"
END = "  <!-- community:end -->"


def update_sitemap(data):
    if not os.path.exists(SITEMAP):
        return False
    with open(SITEMAP, encoding="utf-8") as f:
        xml = f.read()

    # 최신 수정일: 글 중 가장 최근 date
    dates = [iso_date(p.get("date")) for p in data.get("posts", []) if p.get("date")]
    lastmod = max(dates) if dates else "2026-01-01"

    lines = [START, '  <url><loc>%s/community/</loc><lastmod>%s</lastmod></url>' % (BASE_URL, lastmod)]
    for p in data.get("posts", []):
        lines.append(
            '  <url><loc>%s/community/%s.html</loc><lastmod>%s</lastmod></url>'
            % (BASE_URL, p["id"], iso_date(p.get("date")))
        )
    lines.append(END)
    block = "\n".join(lines)

    # 기존 블록 제거 후 재삽입
    pattern = re.compile(re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.DOTALL)
    xml = pattern.sub("", xml)
    xml = xml.replace("</urlset>", block + "\n</urlset>")

    with open(SITEMAP, "w", encoding="utf-8") as f:
        f.write(xml)
    return True


def main():
    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)

    write_js(data)
    write_posts(data)
    write_index(data)
    sm = update_sitemap(data)

    n = len(data.get("posts", []))
    ntotal_comments = sum(comment_count(p) for p in data.get("posts", []))
    print("[build_community] posts=%d, comments=%d" % (n, ntotal_comments))
    print("  -> src/community.js")
    print("  -> community/*.html (%d posts + index.html)" % n)
    print("  -> sitemap.xml %s" % ("updated" if sm else "SKIPPED (없음)"))


if __name__ == "__main__":
    sys.exit(main())
