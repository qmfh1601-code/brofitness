#!/bin/bash
cd "$(dirname "$0")"
echo "브로피트니스 × 시스필라 홈페이지 서버 시작..."
echo "브라우저에서 http://localhost:8799 접속하세요. (끄려면 이 창에서 Ctrl+C)"
sleep 1
open "http://localhost:8799"
python3 -m http.server 8799
