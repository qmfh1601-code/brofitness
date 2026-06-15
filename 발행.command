#!/bin/bash
# ─────────────────────────────────────────────
#  브로 저널 — 원클릭 발행
#  글 수정: data/columns.json  →  이 파일 더블클릭  →  열린 폴더를 Netlify에 드래그
# ─────────────────────────────────────────────
cd "$(dirname "$0")"
echo "■ 브로 저널 발행 시작…"
python3 tools/publish.py || { echo "오류 발생"; read -n1; exit 1; }

DEPLOY="$HOME/Desktop/브로피트니스-홈페이지업로드"
echo ""
echo "■ 배포 폴더로 복사 중… ($DEPLOY)"
mkdir -p "$DEPLOY/src" "$DEPLOY/column" "$DEPLOY/data" "$DEPLOY/img"
cp -L index.html sitemap.xml robots.txt "$DEPLOY/" 2>/dev/null
cp -L src/content.js src/app.jsx src/columns.js "$DEPLOY/src/" 2>/dev/null
cp -RL column/. "$DEPLOY/column/" 2>/dev/null
cp -L data/columns.json "$DEPLOY/data/" 2>/dev/null
KEY=$(python3 -c "import json;print(json.load(open('data/columns.json'))['indexnow']['key'])")
cp -L "$KEY.txt" "$DEPLOY/" 2>/dev/null

open "$DEPLOY"
echo ""
echo "✅ 발행 준비 완료!"
echo "   방금 열린 '브로피트니스-홈페이지업로드' 폴더를"
echo "   Netlify 화면(app.netlify.com → brofitness.kr → 프로덕션 배포)에 통째로 드래그하세요."
echo "   배포가 끝나면 '검색엔진-알림.command' 를 더블클릭하세요. (네이버·빙에 즉시 알림)"
echo ""
echo "(이 창은 닫으셔도 됩니다)"
