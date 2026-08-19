#!/bin/sh
# Windows 데모 패키지 만들기: web/ 를 windows/web 에 복사하고 zip 으로 묶는다.
set -e
cd "$(dirname "$0")"
rm -rf windows/web && cp -R web windows/web && rm -f windows/web/data/inbox.json
rm -f local-slm-win-demo.zip
rm -rf windows/eval && cp -R eval windows/eval && zip -r -q -X local-slm-win-demo.zip windows -x "*.DS_Store" "*/cache.json" "*/llama-server*.log"
ls -lh local-slm-win-demo.zip
