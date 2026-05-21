/* admin.js — page d'administration (listing des visites).
   Le mot de passe est vérifié CÔTÉ GOOGLE : on l'envoie en paramètre, et le
   script ne renvoie les données que s'il est correct. On utilise JSONP pour
   éviter tout souci de CORS avec Apps Script. */

(function () {
  "use strict";
  var URL_EXEC = window.ALPH_SCRIPT_URL || "";
  var $ = function (id) { return document.getElementById(id); };

  if (URL_EXEC.indexOf("http") !== 0) {
    $("msg").textContent = "⚠️ Le script n'est pas encore configuré (ALPH_SCRIPT_URL).";
  }

  $("login").addEventListener("submit", function (e) {
    e.preventDefault();
    var key = $("pwd").value;
    if (!key) return;
    $("msg").textContent = "Chargement…";
    jsonp(URL_EXEC, { key: key })
      .then(function (data) {
        if (!data || !data.ok) {
          $("msg").textContent = "Mot de passe incorrect.";
          return;
        }
        sessionStorage.setItem("alph_admin_key", key); // pratique pour rafraîchir
        render(data.visits || []);
      })
      .catch(function () {
        $("msg").textContent = "Erreur réseau (vérifie l'URL du script et le déploiement).";
      });
  });

  // Rafraîchir si on a déjà le mot de passe en session
  var saved = sessionStorage.getItem("alph_admin_key");
  if (saved) { $("pwd").value = saved; }

  function render(visits) {
    $("msg").textContent = "";
    $("gate").style.display = "none";
    $("panel").style.display = "block";
    $("count").textContent = visits.length + " visite(s) — 100 max conservées";

    var tb = $("rows");
    tb.innerHTML = "";
    visits.forEach(function (v) {
      var tr = document.createElement("tr");
      tr.appendChild(td(formatDate(v.date)));
      tr.appendChild(td(v.ip || "—"));
      tr.appendChild(td(v.os || "—"));
      tr.appendChild(td(v.device || "—"));
      tr.appendChild(td(v.browser || "—"));
      var more = td((v.screen || "") + (v.tz ? " · " + v.tz : "") + (v.lang ? " · " + v.lang : ""));
      more.className = "muted";
      more.title = v.ua || "";
      tr.appendChild(more);
      tb.appendChild(tr);
    });
  }

  function td(text) { var c = document.createElement("td"); c.textContent = text; return c; }

  function formatDate(d) {
    if (!d) return "—";
    var date = new Date(d);
    if (isNaN(date)) return String(d);
    return date.toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  // JSONP : charge le script renvoyé par Apps Script (callback(...))
  function jsonp(url, params) {
    return new Promise(function (resolve, reject) {
      var cb = "cb_" + Math.random().toString(36).slice(2);
      params.callback = cb;
      var qs = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      }).join("&");
      var s = document.createElement("script");
      var done = false;
      window[cb] = function (data) { done = true; cleanup(); resolve(data); };
      function cleanup() { try { delete window[cb]; } catch (e) {} s.remove(); }
      s.onerror = function () { if (!done) { cleanup(); reject(new Error("network")); } };
      s.src = url + "?" + qs;
      document.body.appendChild(s);
      setTimeout(function () { if (!done) { cleanup(); reject(new Error("timeout")); } }, 12000);
    });
  }
})();
