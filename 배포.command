#!/bin/bash
# ─────────────────────────────────────────────
#  브로피트니스 — 원클릭 배포 (GitHub → Netlify 자동)
#  내용 수정 후 이 파일을 더블클릭하면:
#   1) 칼럼/사이트맵 재생성  2) GitHub에 올림  3) Netlify가 1~2분 내 자동 반영
#  ※ 최초 1회 'GitHub 연결'을 마친 뒤부터 작동합니다. (자동배포-셋업가이드.md 참고)
# ─────────────────────────────────────────────
cd "$(dirname "$0")"
echo "■ 1/3  칼럼 발행 엔진 실행…"
python3 tools/publish.py || { echo "발행 오류"; read -n1; exit 1; }

echo ""
echo "■ 2/3  GitHub에 올리는 중…"
git add -A
if git diff --cached --quiet; then
  echo "   (바뀐 내용 없음 — 올릴 게 없습니다)"
else
  git commit -m "콘텐츠 업데이트 $(date '+%Y-%m-%d %H:%M')"
fi
git push || { echo "git push 실패 — GitHub 연결을 확인하세요(셋업가이드 참고)."; read -n1; exit 1; }

echo ""
echo "■ 3/3  완료! Netlify가 자동으로 다시 배포합니다(1~2분)."
echo "   라이브: https://brofitness.kr"
echo "(이 창은 닫으셔도 됩니다)"
read -n1
