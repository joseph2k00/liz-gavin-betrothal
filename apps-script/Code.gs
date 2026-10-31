// RSVP endpoint for the betrothal invite. Kept here for reference; it runs in Google Apps Script.
//
// Setup, from the Sheet: Extensions > Apps Script, paste this file, then run setupSheet once.
// Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
// To update later, use Manage deployments > Edit > New version, so the URL stays the same.

var RESPONSES_TAB = "Responses";
var SUMMARY_TAB = "Summary";

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
    sheet.getRange(row, 1, 1, 5).setValues([[new Date(), reply.name, reply.phone, reply.attending, reply.guests]]);
    sheet.getRange(row, 6).insertCheckboxes();
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
  if (typeof data.phone !== "string" || !/^\+?[\d\s()-]+$/.test(data.phone.trim())) {
    return { error: "A valid phone number is required" };
  }
  var phoneDigits = data.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return { error: "A valid phone number is required" };
  }
  // Stored in one format, so the same number typed differently still shows as a repeat.
  var phone = (data.phone.trim().charAt(0) === "+" ? "+" : "") + phoneDigits;

  if (data.attending !== "yes" && data.attending !== "no") {
    return { error: "Attending must be yes or no" };
  }

  var guests = 0;
  if (data.attending === "yes") {
    guests = data.guests;
    if (typeof guests !== "number" || guests % 1 !== 0 || guests < 1) {
      return { error: "Guests must be at least 1" };
    }
  }

  // The apostrophe stops a name from running as a spreadsheet formula.
  if (/^[=+\-@]/.test(name)) {
    name = "'" + name;
  }

  return { name: name, phone: phone, attending: data.attending === "yes" ? "Yes" : "No", guests: guests };
}

function respond_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

// Run once from the editor. It creates both tabs and leaves any existing replies alone.
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone("Asia/Kolkata");

  var responses = ss.getSheetByName(RESPONSES_TAB) || ss.insertSheet(RESPONSES_TAB);
  responses.getRange(1, 1, 1, 6).setValues([["Timestamp", "Name", "Phone", "Attending", "Guests", "Ignore"]]).setFontWeight("bold");
  responses.setFrozenRows(1);
  responses.getRange("A2:A").setNumberFormat("dd mmm yyyy, h:mm am/pm");
  responses.getRange("C2:C").setNumberFormat("@"); // plain text, so a leading + or 0 is kept
  responses.setColumnWidth(1, 190);
  responses.setColumnWidth(2, 240);
  responses.setColumnWidth(3, 150);

  // Highlights repeated names or numbers so the family can tick Ignore on an outdated reply.
  var repeated = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=OR(AND($B2<>"",COUNTIF($B$2:$B,$B2)>1),AND($C2<>"",COUNTIF($C$2:$C,$C2)>1))')
    .setBackground("#F6E7B8")
    .setRanges([responses.getRange("A2:F")])
    .build();
  responses.setConditionalFormatRules([repeated]);

  var summary = ss.getSheetByName(SUMMARY_TAB) || ss.insertSheet(SUMMARY_TAB);
  summary.getRange(1, 1, 5, 2).setValues([
    ["Total guests attending", '=SUMIFS(Responses!E2:E,Responses!D2:D,"Yes",Responses!F2:F,FALSE)'],
    ["Yes replies", '=COUNTIFS(Responses!D2:D,"Yes",Responses!F2:F,FALSE)'],
    ["No replies", '=COUNTIFS(Responses!D2:D,"No",Responses!F2:F,FALSE)'],
    ["Replies with a repeated name to review", '=SUMPRODUCT((Responses!B2:B<>"")*(Responses!F2:F=FALSE)*(COUNTIFS(Responses!B2:B,Responses!B2:B,Responses!F2:F,FALSE)>1))'],
    ["Replies with a repeated phone number to review", '=SUMPRODUCT((Responses!C2:C<>"")*(Responses!F2:F=FALSE)*(COUNTIFS(Responses!C2:C,Responses!C2:C,Responses!F2:F,FALSE)>1))'],
  ]);
  summary.getRange("A1:B1").setFontWeight("bold");
  summary.setColumnWidth(1, 340);
}
