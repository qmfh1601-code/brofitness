/**
 * 브로피트니스 — 예약·상담 신청 → 구글 시트 자동기록 + 알림 메일
 * ------------------------------------------------------------------
 * [설치 방법]  ※ 처음 1회만
 *  1) 구글 드라이브에서 새 '구글 스프레드시트' 하나 만들기 (예: "브로피트니스 신청내역")
 *  2) 상단 메뉴 [확장 프로그램] → [Apps Script] 클릭
 *  3) 기본 코드 전부 지우고 이 파일 내용을 그대로 붙여넣기 → 저장(💾)
 *  4) 상단 [배포] → [새 배포] → 톱니바퀴(유형) [웹 앱] 선택
 *       - 설명: 아무거나
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: '모든 사용자'   ← 꼭 이걸로!
 *  5) [배포] 누르고 권한 승인(본인 구글 계정)
 *  6) 나오는 '웹 앱 URL'(https://script.google.com/macros/s/..../exec) 복사
 *  7) 그 URL을 클로드(나)에게 주면 사이트에 연결해줌
 * ------------------------------------------------------------------
 * 코드를 수정하면 [배포] → [배포 관리] → 연필(편집) → '새 버전'으로 다시 배포해야 반영됨.
 */

// 신청 알림을 받을 이메일 (비우면 메일 알림 안 감)
var NOTIFY_EMAIL = "qmfh1601@gmail.com";

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("신청내역") || ss.getSheets()[0];

    // 첫 줄에 헤더가 없으면 한 번 만들어줌
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["접수시각", "희망항목", "지점", "이름", "연락처", "희망일", "문의내용"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
    }

    var d = JSON.parse(e.postData.contents);
    var now = new Date();

    sheet.appendRow([
      now,
      d.program || "",
      d.branch || "",
      d.name || "",
      d.phone || "",
      d.date || "",
      d.memo || "",
    ]);

    // 알림 메일 (선택)
    if (NOTIFY_EMAIL) {
      var body =
        "새 예약·상담 신청이 접수되었습니다.\n\n" +
        "· 희망항목: " + (d.program || "") + "\n" +
        "· 지점: " + (d.branch || "") + "\n" +
        "· 이름: " + (d.name || "") + "\n" +
        "· 연락처: " + (d.phone || "") + "\n" +
        "· 희망일: " + (d.date || "") + "\n" +
        "· 문의내용: " + (d.memo || "") + "\n\n" +
        "접수시각: " + now.toLocaleString("ko-KR");
      MailApp.sendEmail(NOTIFY_EMAIL, "[브로피트니스] 새 신청 - " + (d.name || ""), body);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// 브라우저에서 URL을 그냥 열었을 때 동작 확인용
function doGet() {
  return ContentService.createTextOutput("BRO booking endpoint OK");
}
