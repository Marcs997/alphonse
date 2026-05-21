/* track.js — enregistre discrètement une visite (date, IP, OS, appareil).
   Inclus uniquement dans le jeu (index.html), jamais dans la page admin.
   Tout est protégé : si quoi que ce soit échoue, le jeu n'est pas impacté.
   On enregistre au plus une fois par session du navigateur. */

(function () {
  "use strict";
  try {
    var URL_EXEC = window.ALPH_SCRIPT_URL || "";
    if (URL_EXEC.indexOf("http") !== 0) return;        // pas encore configuré
    if (sessionStorage.getItem("alph_logged")) return; // déjà compté cette session
    sessionStorage.setItem("alph_logged", "1");

    var ua = navigator.userAgent || "";
    var info = parseUA(ua);

    function send(ip) {
      var payload = {
        ip: ip || "",
        ua: ua,
        os: info.os,
        device: info.device,
        browser: info.browser,
        lang: navigator.language || "",
        tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || "",
        screen: (screen.width + "x" + screen.height),
      };
      // POST "simple" + no-cors : pas de préliminaire CORS, on n'attend pas de réponse
      fetch(URL_EXEC, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      }).catch(function () {});
    }

    // L'IP n'est pas accessible en JS : on la demande à une petite API publique
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) { send(d && d.ip); })
      .catch(function () { send(""); });   // si ipify échoue, on logge sans IP
  } catch (e) { /* on ignore : jamais bloquer le jeu */ }

  // Petite reconnaissance OS / appareil / navigateur à partir du User-Agent
  function parseUA(ua) {
    var os = "Inconnu", device = "Ordinateur", browser = "Inconnu";
    if (/Windows NT/i.test(ua)) os = "Windows";
    else if (/Android/i.test(ua)) { os = "Android"; device = "Smartphone"; }
    else if (/iPhone/i.test(ua)) { os = "iOS"; device = "iPhone"; }
    else if (/iPad/i.test(ua)) { os = "iPadOS"; device = "iPad"; }
    else if (/Mac OS X/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua)) os = "Linux";

    if (/Tablet|iPad/i.test(ua)) device = "Tablette";
    else if (/Mobi|Android|iPhone/i.test(ua) && device === "Ordinateur") device = "Smartphone";

    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
    else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";
    else if (/Chrome\//i.test(ua)) browser = "Chrome";
    else if (/Safari\//i.test(ua)) browser = "Safari";

    return { os: os, device: device, browser: browser };
  }
})();
