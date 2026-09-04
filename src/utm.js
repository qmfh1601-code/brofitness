/* 광고 유입 채널(UTM) 캡처 — 랜딩 시점 파라미터를 쿠키에 저장해두고
   예약·상담 폼 제출 시 함께 실어 보낸다. (최신 유입이 이전 값을 덮어씀) */
(function () {
  var KEYS = ["utm_source", "utm_medium", "utm_campaign"];
  var params = new URLSearchParams(window.location.search);
  var hasUTM = KEYS.some(function (k) { return params.get(k); });

  if (hasUTM) {
    var data = {};
    KEYS.forEach(function (k) { data[k] = params.get(k) || ""; });
    document.cookie =
      "bro_utm=" + encodeURIComponent(JSON.stringify(data)) +
      ";path=/;max-age=" + 60 * 60 * 24 * 90; // 90일: 방문~전환 사이 기간을 충분히 커버
  }

  window.getBroUTM = function () {
    var m = document.cookie.match(/(?:^|; )bro_utm=([^;]*)/);
    var empty = { utm_source: "", utm_medium: "", utm_campaign: "" };
    if (!m) return empty;
    try {
      var d = JSON.parse(decodeURIComponent(m[1]));
      return {
        utm_source: d.utm_source || "",
        utm_medium: d.utm_medium || "",
        utm_campaign: d.utm_campaign || "",
      };
    } catch (e) {
      return empty;
    }
  };
})();
