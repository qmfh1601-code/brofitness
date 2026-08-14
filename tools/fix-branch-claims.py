#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""라이브 칼럼에 남아 있는 '전 지점 자유 이용' 문구 일괄 정정.

2026-08-10 커밋(1d77709, 06b5161)에서 SPA·FAQ·회사소개서는 정정했지만
data/columns.json 안의 칼럼 17편은 그대로 남았다. 구독으로 다른 지점을
오가는 건 현재 되지 않고, 등록한 지점에서 이용하는 방식이다.

사용:
    python3 tools/fix-branch-claims.py --check   # 남아 있는 문장만 확인
    python3 tools/fix-branch-claims.py           # 정정 적용
    python3 tools/publish.py                     # 정적페이지 재생성
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "columns.json"

# (칼럼id, 찾을 문장, 바꿀 문장)
FIXES = [
 ("member-story-self-employed-cheongju",
  "한 구독으로 세 지점을 자유롭게 이용할 수 있다는 게 자영업자에게는 특히 실용적으로 느껴집니다.",
  "청주에 지점이 세 곳이라 가게나 집에서 가까운 곳을 고를 수 있다는 게 자영업자에게는 특히 실용적으로 느껴집니다."),
 ("summer-gym-subscription-tips",
  "청주 브로피트니스는 세 지점을 자유롭게 이용할 수 있어, 특정 시간대가 붐비면 다른 지점을 선택하는 유연함도 있습니다.",
  "청주 브로피트니스는 연중무휴 24시간 운영이라, 특정 시간대가 붐비면 시간을 옮겨 가는 유연함이 있습니다."),
 ("subscription-low-frequency-value",
  "청주 용암·금천·복대 세 지점을 하나의 구독으로 자유롭게 이용할 수 있다는 점도 방문 빈도를 유지하는 데 도움이 됩니다.",
  "청주 용암·금천·복대 세 곳 중 생활 동선에 가장 가까운 지점을 고를 수 있다는 점도 방문 빈도를 유지하는 데 도움이 됩니다."),
 ("weekend-diet-tips",
  "청주 용암·금천·복대 세 지점 중 그날 상황에 따라 가까운 지점을 자유롭게 선택하면 되니, 주말 외출 동선에 맞춰 잠깐 들르는 것도 가능합니다.",
  "청주 용암·금천·복대 중 다니시는 지점이 주말 외출 동선 위에 있다면, 나가는 길에 잠깐 들르는 것도 가능합니다."),
 ("why-gym-fails-and-how-to-start-right",
  "한 구독으로 세 지점을 자유롭게 이용할 수 있다는 것도 꾸준함을 돕는 요소입니다.",
  "등록할 지점을 생활 동선에 맞춰 고를 수 있다는 것도 꾸준함을 돕는 요소입니다."),
 ("late-night-craving-diet",
  "청주 용암·금천·복대 세 지점 중 가까운 곳을 선택해 시작할 수 있고, 하나의 구독으로 세 지점을 자유롭게 오갈 수 있습니다.",
  "청주 용암·금천·복대 세 지점 중 가까운 곳을 선택해 시작할 수 있고, 세 곳 모두 연중무휴 24시간 운영합니다."),
 ("stress-relief-workout-habits",
  "구독 하나로 세 지점을 모두 이용할 수 있어 이동이 자유롭고, 일하는 곳 근처 혹은 집 근처 지점으로 동선을 맞추면 '퇴근 후 헬스장'이 생각보다 어렵지 않다는 걸 알게 됩니다.",
  "일하는 곳 근처 혹은 집 근처 지점으로 동선을 맞추면 '퇴근 후 헬스장'이 생각보다 어렵지 않다는 걸 알게 됩니다."),
 ("yongam-gym",
  "같은 구독 하나로 용암·금천·복대 세 지점을 자유롭게 오갈 수 있다는 점도 활용해 보세요.",
  "용암·금천·복대 세 곳 중 생활 동선에 가장 잘 맞는 지점을 고르는 것부터 해 보세요."),
 ("bokdae-gym",
  "흥덕구에 살면서 상당구로 출퇴근하거나 그 반대인 분이라면, 그날 동선에 맞춰 지점을 골라 다니기 좋습니다.",
  "흥덕구에 살면서 상당구로 출퇴근하거나 그 반대인 분이라면, 집과 직장 중 어느 쪽 동선에 지점을 둘지부터 정해 보세요."),
 ("multi-branch-usage-guide",
  "월요일엔 직장 근처 복대점, 금요일 저녁엔 집 가까운 용암점, 주말엔 가족과 나가는 길에 금천점. 이런 식으로 요일·일정·날씨에 따라 지점을 자유롭게 선택할 수 있다는 건 생각보다 큰 장점입니다.",
  "월요일은 출근 전, 금요일은 퇴근 후, 주말은 낮 시간. 이런 식으로 요일과 일정에 따라 시간을 자유롭게 고를 수 있다는 건 생각보다 큰 장점입니다."),
 ("multi-branch-usage-guide",
  "한 지점에서만 운동해야 하는 일반 헬스장과 달리, 구독 한 장이 청주 세 지점 모두에 유효합니다.",
  "청주에 지점이 세 곳이라, 등록 전에 본인 동선에 가장 잘 맞는 곳을 고를 수 있습니다."),
 ("member-story-twenties-office-worker",
  "청주 용암·금천·복대 세 지점을 같은 구독으로 자유롭게 이용할 수 있다는 것이 주말과 평일 동선이 다른 상황에서 특히 편했습니다.",
  "청주 용암·금천·복대 중 평일 출퇴근 동선에 맞는 지점을 고른 것이 결과적으로 가장 잘한 선택이었습니다."),
 ("member-story-no-contract-restart",
  "같은 구독으로 세 지점을 모두 이용할 수 있다는 것을 실제로 활용하면서, 동선에 따라 선택의 폭이 넓어진다는 것을 체감했습니다.",
  "지점이 세 곳이라 등록할 때 고를 수 있었고, 동선에 맞는 곳을 고르니 다니는 부담이 확실히 줄었습니다."),
 ("summer-subscription-guide",
  "같은 구독으로 세 지점을 자유롭게 오갈 수 있으니, 그날의 동선과 일정에 따라 가장 가까운 곳을 고르면 됩니다.",
  "청주에 지점이 세 곳이니, 등록하실 때 생활 동선에서 가장 가까운 곳을 고르면 됩니다."),
 ("member-story-business-owner-40s",
  "같은 구독으로 청주 세 지점을 자유롭게 오갈 수 있다는 점이 동선이 제각각인 자영업자의 삶에 특히 잘 맞았습니다.",
  "연중무휴 24시간이라 문 여는 시간에 맞출 필요가 없다는 점이 동선이 제각각인 자영업자의 삶에 특히 잘 맞았습니다."),
 ("subscription-first-month-guide",
  "같은 구독으로 세 지점 모두 자유롭게 이용할 수 있으니, 직장 근처 지점은 퇴근 후에, 집 근처 지점은 주말에 활용하는 방식이 많이들 쓰는 패턴입니다.",
  "첫 달에는 다니실 지점을 정하는 게 먼저입니다. 직장 근처로 할지 집 근처로 할지에 따라 다니는 빈도가 크게 달라집니다."),
 ("member-story-2",
  "같은 구독으로 두 지점을 자유롭게 오갈 수 있다는 게 일상에서 실제로 큰 도움이 됐어요.",
  "집에서 가까운 지점을 고른 게 일상에서 실제로 큰 도움이 됐어요."),
 ("cheongju-24h-gym",
  "게다가 구독 하나로 세 지점을 모두 이용할 수 있어, 그날 동선에 맞춰 가까운 곳으로 가면 됩니다.",
  "게다가 청주에 지점이 세 곳이라, 등록하실 때 동선에 맞춰 가까운 곳을 고르면 됩니다."),
]

# 제목·요약 정정 (칼럼id, 필드, 새 값)
META_FIXES = [
 ("multi-branch-usage-guide", "title",
  "청주 용암·금천·복대 중 어디로 등록할까 — 브로피트니스 지점 고르는 법"),
 ("multi-branch-usage-guide", "excerpt",
  "청주에 지점이 세 곳이라 등록 전에 어디로 다닐지 정해야 합니다. 직장 근처와 집 근처 중 어느 쪽이 나은지, 동선·시간대·혼잡도를 기준으로 지점을 고르는 방법을 정리했습니다."),
]

PAT = re.compile(r'(전 지점.{0,20}(자유|이용)|세 지점.{0,20}(자유|모두 쓸|다 쓰|모두 이용)|'
                 r'지점을?\s*(자유롭게|골라)\s*(선택|다니|이용|오)|한 구독으로.{0,15}지점|'
                 r'구독 한 (장|번)이.{0,20}지점)')


def scan(posts):
    found = []
    for p in posts:
        if p.get("draft"):
            continue
        blob = p["title"] + " " + p["excerpt"] + " " + " ".join(
            b for b in p["body"] if isinstance(b, str))
        for m in PAT.finditer(blob):
            found.append((p["id"], m.group(0)))
    return found


def main():
    d = json.loads(DATA.read_text(encoding="utf-8"))
    by = {p["id"]: p for p in d["posts"]}

    if "--check" in sys.argv:
        for pid, frag in scan(d["posts"]):
            print(f"{pid}: …{frag}…")
        print(f"\n남은 문장 {len(scan(d['posts']))}건")
        return

    applied, missed = 0, []
    for pid, old, new in FIXES:
        p = by.get(pid)
        if not p:
            missed.append((pid, "칼럼 없음"))
            continue
        hit = False
        for i, b in enumerate(p["body"]):
            if isinstance(b, str) and old in b:
                p["body"][i] = b.replace(old, new)
                hit = True
                applied += 1
                break
        if not hit:
            missed.append((pid, old[:30]))

    for pid, field, val in META_FIXES:
        if pid in by:
            by[pid][field] = val
            applied += 1

    DATA.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"정정 {applied}건 적용")
    for pid, why in missed:
        print(f"  ⚠️ 실패: {pid} ({why})")
    left = scan(d["posts"])
    print(f"남은 문장 {len(left)}건" + ("" if not left else " — " + ", ".join(f"{a}" for a, _ in left)))
    print("다음: python3 tools/publish.py")


if __name__ == "__main__":
    main()
