/**
 * 브로피트니스 — 예약·상담 신청 → 구글 시트 기록 + 텔레그램 + 알림 메일
 * ------------------------------------------------------------------
 * [처음 설치]  ※ 새로 만드는 경우만
 *  1) 구글 드라이브에서 새 '구글 스프레드시트' 만들기 (예: "브로피트니스 신청내역")
 *  2) 상단 메뉴 [확장 프로그램] → [Apps Script]
 *  3) 기본 코드 전부 지우고 이 파일 내용을 붙여넣기 → 저장(💾)
 *  4) [배포] → [새 배포] → 유형 [웹 앱]
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: '모든 사용자'   ← 꼭 이걸로!
 *  5) [배포] 누르고 권한 승인 → 나오는 '웹 앱 URL'(…/exec)을 content.js 의 booking.endpoint 에
 *
 * [이미 돌고 있는 것을 갱신할 때]  ← 지금 상황
 *  1) 기존 스프레드시트에서 [확장 프로그램] → [Apps Script]
 *  2) 코드 전부 지우고 이 파일로 교체 → 저장
 *  3) 왼쪽 ⚙️ [프로젝트 설정] → 맨 아래 [스크립트 속성] → [속성 추가] 2개
 *       TG_TOKEN = 텔레그램 봇 토큰
 *       TG_CHAT  = 받을 방의 chat id
 *     ※ 값은 맥에서 확인:  grep -E '^TELEGRAM_(BOT_TOKEN|CHAT_ID)=' ~/stock-signal/.env
 *     ※ 코드에 직접 적지 않는다. 코드는 깃에 올라가지만 스크립트 속성은 안 올라간다.
 *  4) 상단에서 함수 `테스트알림` 선택 → ▶ 실행 → 텔레그램이 오는지 확인
 *  5) ★[배포] → [배포 관리] → 연필(편집) → 버전 '새 버전' → [배포]
 *     이걸 안 하면 코드만 바뀌고 실제로 돌아가는 웹앱은 예전 버전 그대로다.
 * ------------------------------------------------------------------
 */

// 알림 메일 받을 주소 (비우면 메일 안 감)
var NOTIFY_EMAIL = "qmfh1601@gmail.com";

/**
 * 연락처를 010-0000-0000 꼴로 맞춘다.
 *
 * 왜 필요한가: 방문자가 하이픈 없이 "01012345678" 로 넣으면 구글 시트가 숫자로 인식해
 * 맨 앞 0 을 지워 버린다. 실제로 접수분 여러 건이 "1012345678" 로 저장돼 있었다.
 * 하이픈을 넣어 두면 문자열로 인식돼 0 이 살아남고, 눈으로 읽기도 편하다.
 */
function 연락처정리(raw) {
  var d = String(raw || "").replace(/[^0-9]/g, "");
  if (d.length === 10 && d.indexOf("10") === 0) d = "0" + d; // 앞 0 이 잘린 경우 복원
  if (d.length === 11) return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  if (d.length === 10) return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
  return String(raw || ""); // 형식을 모르겠으면 손대지 않는다
}

/** 텔레그램 한 건. 토큰은 스크립트 속성에서 읽는다(코드에 적지 않는다). */
function 텔레그램(text) {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty("TG_TOKEN");
  var chat = p.getProperty("TG_CHAT");
  if (!token || !chat) return false;

  try {
    var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "post",
      payload: { chat_id: chat, text: text, disable_web_page_preview: "true" },
      muteHttpExceptions: true,
    });
    return res.getResponseCode() === 200;
  } catch (e) {
    return false; // 알림이 실패해도 접수는 이미 시트에 남았다. 여기서 예외를 던지면 안 된다.
  }
}

/** 설치 확인용 — 상단에서 이 함수를 골라 ▶ 누르면 텔레그램이 한 통 온다. */
function 테스트알림() {
  var ok = 텔레그램("🔔 브로피트니스 예약 알림 연결 테스트입니다.");
  Logger.log(ok ? "보냈습니다" : "실패 — 스크립트 속성 TG_TOKEN / TG_CHAT 을 확인하세요");
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("신청내역") || ss.getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["접수시각", "희망항목", "지점", "이름", "연락처", "희망일", "문의내용"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
    }

    var d = JSON.parse(e.postData.contents);
    var now = new Date();
    var phone = 연락처정리(d.phone);

    sheet.appendRow([
      now,
      d.program || "",
      d.branch || "",
      d.name || "",
      phone,
      d.date || "",
      d.memo || "",
    ]);

    var 요약 =
      "· 지점: " + (d.branch || "") + "\n" +
      "· 이름: " + (d.name || "") + "\n" +
      "· 연락처: " + phone + "\n" +
      "· 희망항목: " + (d.program || "") + "\n" +
      "· 희망일: " + (d.date || "") + "\n" +
      "· 문의: " + (d.memo || "-");

    // 텔레그램 먼저. 메일은 묻히기 쉬워서 이쪽이 실질적인 알림이다.
    텔레그램("🔔 홈페이지 예약·상담 신청\n\n" + 요약 + "\n\n접수: " + now.toLocaleString("ko-KR"));

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(
        NOTIFY_EMAIL,
        "[브로피트니스] 새 신청 - " + (d.name || ""),
        "새 예약·상담 신청이 접수되었습니다.\n\n" + 요약 + "\n\n접수시각: " + now.toLocaleString("ko-KR")
      );
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    // 접수를 받다 터진 것이므로 조용히 넘기지 않는다. 방문자 화면은 어차피 성공으로 뜬다.
    텔레그램("🚨 홈페이지 예약 접수 중 오류\n\n" + String(err));
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// 브라우저에서 URL 을 그냥 열었을 때 동작 확인용. 맥의 헬스체크도 이걸 찌른다.
function doGet() {
  return ContentService.createTextOutput("BRO booking endpoint OK");
}
