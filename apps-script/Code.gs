// RSVP endpoint for the betrothal invite. Kept here for reference; it runs in Google Apps Script.
//
// Setup, from the Sheet: Extensions > Apps Script, paste this file, then run setupSheet once.
// Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
// To update later, use Manage deployments > Edit > New version, so the URL stays the same.

var RESPONSES_TAB = "Responses";
var SUMMARY_TAB = "Summary";
var MAX_GUESTS = 6;

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    return respond_({ ok: false, error: "Invalid request" });
  }

  // Bots that fill the hidden field get a normal reply, so they don't retry.
  if (data.website) {
    return respond_({ ok: true });
  }

  var reply = validate_(data);
  if (reply.error) {
    return respond_({ ok: false, error: reply.error });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESPONSES_TAB);
    var row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 4).setValues([[new Date(), reply.name, reply.attending, reply.guests]]);
    sheet.getRange(row, 5).insertCheckboxes();
  } catch (error) {
    return respond_({ ok: false, error: "Could not save the response" });
  } finally {
    lock.releaseLock();
  }

  return respond_({ ok: true });
}

function validate_(data) {
  if (typeof data.name !== "string") {
    return { error: "Name is required" };
  }
  var name = data.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) {
    return { error: "Name must be 2 to 80 characters" };
  }
  if (data.attending !== "yes" && data.attending !== "no") {
    return { error: "Attending must be yes or no" };
  }

  var guests = 0;
  if (data.attending === "yes") {
    guests = data.guests;
    if (typeof guests !== "number" || guests % 1 !== 0 || guests < 1 || guests > MAX_GUESTS) {
      return { error: "Guests must be 1 to " + MAX_GUESTS };
    }
  }

  // The apostrophe stops a name from running as a spreadsheet formula.
  if (/^[=+\-@]/.test(name)) {
    name = "'" + name;
  }

  return { name: name, attending: data.attending === "yes" ? "Yes" : "No", guests: guests };
}

function respond_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

// Run once from the editor. It creates both tabs and leaves any existing replies alone.
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone("Asia/Kolkata");

  var responses = ss.getSheetByName(RESPONSES_TAB) || ss.insertSheet(RESPONSES_TAB);
  responses.getRange(1, 1, 1, 5).setValues([["Timestamp", "Name", "Attending", "Guests", "Ignore"]]).setFontWeight("bold");
  responses.setFrozenRows(1);
  responses.getRange("A2:A").setNumberFormat("dd mmm yyyy, h:mm am/pm");
  responses.setColumnWidth(1, 190);
  responses.setColumnWidth(2, 240);

  // Highlights repeated names so the family can tick Ignore on an outdated reply.
  var repeated = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($B2<>"",COUNTIF($B$2:$B,$B2)>1)')
    .setBackground("#F6E7B8")
    .setRanges([responses.getRange("A2:E")])
    .build();
  responses.setConditionalFormatRules([repeated]);

  var summary = ss.getSheetByName(SUMMARY_TAB) || ss.insertSheet(SUMMARY_TAB);
  summary.getRange(1, 1, 4, 2).setValues([
    ["Total guests attending", '=SUMIFS(Responses!D2:D,Responses!C2:C,"Yes",Responses!E2:E,FALSE)'],
    ["Yes replies", '=COUNTIFS(Responses!C2:C,"Yes",Responses!E2:E,FALSE)'],
    ["No replies", '=COUNTIFS(Responses!C2:C,"No",Responses!E2:E,FALSE)'],
    ["Replies with a repeated name to review", '=SUMPRODUCT((Responses!B2:B<>"")*(Responses!E2:E=FALSE)*(COUNTIFS(Responses!B2:B,Responses!B2:B,Responses!E2:E,FALSE)>1))'],
  ]);
  summary.getRange("A1:B1").setFontWeight("bold");
  summary.setColumnWidth(1, 300);
}
