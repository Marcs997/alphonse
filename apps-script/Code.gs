/* ============================================================================
   Alphonse — journal des visites (Google Apps Script + Google Sheet)

   À COLLER dans script.google.com (voir le pas-à-pas du README, section Admin).
   Ce code tourne sur les serveurs de Google, PAS dans la page du jeu :
   - le mot de passe (ADMIN_SECRET) reste donc privé,
   - la lecture des visites n'est renvoyée que si on fournit ce mot de passe.
   ============================================================================ */

// ⚠️ CHANGE ce mot de passe (c'est lui que tu taperas sur la page admin) :
const ADMIN_SECRET = 'change-moi-stp';

const MAX_VISITES = 100;          // on ne garde que les 100 dernières
const FEUILLE = 'Visites';

// Chaque visiteur du jeu appelle ceci (enregistre une visite)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      data.ip || '',
      data.os || '',
      data.device || '',
      data.browser || '',
      data.lang || '',
      data.tz || '',
      data.screen || '',
      data.ua || '',
    ]);
    // On ne garde que les MAX_VISITES dernières lignes (+ l'entête)
    const last = sheet.getLastRow();
    if (last > MAX_VISITES + 1) {
      sheet.deleteRows(2, last - (MAX_VISITES + 1));
    }
    return out_({ ok: true }, e);
  } catch (err) {
    return out_({ ok: false, error: String(err) }, e);
  }
}

// La page admin appelle ceci avec ?key=MOT_DE_PASSE pour lire les visites
function doGet(e) {
  const ok = e.parameter.key === ADMIN_SECRET;
  if (!ok) return out_({ ok: false }, e);

  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues().slice(1); // enlève l'entête
  const visits = rows.map(function (r) {
    return {
      date: r[0], ip: r[1], os: r[2], device: r[3], browser: r[4],
      lang: r[5], tz: r[6], screen: r[7], ua: r[8],
    };
  }).reverse(); // plus récent en premier
  return out_({ ok: true, visits: visits }, e);
}

// Sortie JSON, ou JSONP si un ?callback= est fourni (utilisé par la page admin
// pour éviter tout souci de CORS avec Apps Script)
function out_(obj, e) {
  const txt = JSON.stringify(obj);
  const cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + txt + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(txt)
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(FEUILLE);
  if (!sheet) {
    sheet = ss.insertSheet(FEUILLE);
    sheet.appendRow(['Date', 'IP', 'OS', 'Appareil', 'Navigateur',
                     'Langue', 'Fuseau', 'Écran', 'UserAgent']);
  }
  return sheet;
}
