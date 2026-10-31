(function () {
  "use strict";

  const INVITE = window.INVITE;
  const STORAGE_KEY = "liz-gavin-rsvp";
  const MAX_GUESTS = 6;
  const SEND_TIMEOUT_MS = 15000;
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const COUPLE = `${INVITE.brideSide.child} & ${INVITE.groomSide.child}`;

  // Helpers

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === true) node.setAttribute(key, "");
      else if (value !== false && value != null) node.setAttribute(key, value);
    });
    node.append(...children);
    return node;
  }

  function isTBD(value) {
    return typeof value !== "string" || value.trim().startsWith("[TBD");
  }

  // A missing detail renders as a visibly marked placeholder.
  function field(value) {
    return isTBD(value) ? el("span", { class: "tbd" }, String(value)) : value;
  }

  function isDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function isTime(value) {
    return /^\d{2}:\d{2}$/.test(value);
  }

  function formatDate(value, options) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });
  }

  function longDate(value) {
    const weekday = formatDate(value, { weekday: "long" });
    return `${weekday}, ${shortDate(value)}`;
  }

  function shortDate(value) {
    return formatDate(value, { day: "numeric", month: "long", year: "numeric" });
  }

  function formatTime(value) {
    const [hours, minutes] = value.split(":").map(Number);
    const suffix = hours < 12 ? "AM" : "PM";
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
  }

  function readSavedReply() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function saveReply(reply) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reply));
    } catch (error) {
      // The reply is already in the Sheet; only the reminder on this device is lost.
    }
  }

  // Calendar

  function eventTimesUtc(event) {
    const [year, month, day] = INVITE.date.split("-").map(Number);
    const toMs = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return Date.UTC(year, month - 1, day, hours, minutes) - IST_OFFSET_MS;
    };
    const start = toMs(event.start);
    let end = toMs(event.end);
    if (end <= start) end += 24 * 60 * 60 * 1000; // ends after midnight
    return { start: utcStamp(start), end: utcStamp(end) };
  }

  function utcStamp(ms) {
    return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function calendarTitle(event) {
    return `${event.title}: ${COUPLE}`;
  }

  function calendarLocation(event) {
    return `${event.venue}, ${event.address}`;
  }

  function googleCalendarUrl(event) {
    const times = eventTimesUtc(event);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: calendarTitle(event),
      dates: `${times.start}/${times.end}`,
      ctz: "Asia/Kolkata",
      location: calendarLocation(event),
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  function icsEscape(value) {
    return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  function icsFold(line) {
    const parts = [];
    for (let i = 0; i < line.length; i += 60) {
      parts.push((i ? " " : "") + line.slice(i, i + 60));
    }
    return parts.join("\r\n");
  }

  function buildIcs(event) {
    const times = eventTimesUtc(event);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Liz and Gavin//Betrothal Invite//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${event.id}-${INVITE.date}@liz-gavin-betrothal`,
      `DTSTAMP:${utcStamp(Date.now())}`,
      `DTSTART:${times.start}`,
      `DTEND:${times.end}`,
      `SUMMARY:${icsEscape(calendarTitle(event))}`,
      `LOCATION:${icsEscape(calendarLocation(event))}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    return lines.map(icsFold).join("\r\n") + "\r\n";
  }

  function downloadIcs(event) {
    const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: `${event.id}.ics` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // Invitation

  function renderFamily(side) {
    return el("div", { class: "family" },
      el("p", { class: "parents" }, field(side.parents)),
      el("p", { class: "home" }, field(side.home)),
      el("p", { class: "parents-of" }, "parents of"),
      el("h1", { class: "child" }, side.child)
    );
  }

  function venueLine(event) {
    return el("p", { class: "venue-line" }, field(event.venue), ", ", field(event.town));
  }

  function renderInvitation() {
    const [betrothal, reception] = INVITE.events;
    return el("header", {},
      el("p", { class: "blessing" }, INVITE.blessing),
      el("div", { class: "families" },
        renderFamily(INVITE.brideSide),
        el("p", { class: "joiner" }, "and"),
        renderFamily(INVITE.groomSide)
      ),
      el("div", { class: "request" },
        el("div", { class: "request-group" },
          el("p", {}, "request the pleasure of your esteemed presence"),
          el("p", {}, "at the betrothal of their children"),
          el("p", {}, `during the ${INVITE.liturgyTerm} at`),
          venueLine(betrothal)
        ),
        el("div", { class: "request-group" },
          el("p", {}, "and at the reception thereafter at"),
          venueLine(reception)
        )
      )
    );
  }

  // Events

  function eventTime(event) {
    if (isTBD(event.start)) return field(event.start);
    return formatTime(event.start);
  }

  function renderCalendar(event) {
    const icsButton = el("button", { type: "button", class: "action" }, "Apple / Other");
    icsButton.addEventListener("click", () => downloadIcs(event));
    return el("details", { class: "calendar" },
      el("summary", {}, "Add to Calendar"),
      el("div", { class: "calendar-options" },
        el("a", { class: "action", href: googleCalendarUrl(event), target: "_blank", rel: "noopener" }, "Google Calendar"),
        icsButton
      )
    );
  }

  function renderEvent(event) {
    const actions = el("div", { class: "event-actions" });
    if (!isTBD(event.mapsUrl)) {
      actions.append(el("a", { class: "action", href: event.mapsUrl, target: "_blank", rel: "noopener" }, "Directions"));
    }
    if (isDate(INVITE.date) && isTime(event.start) && isTime(event.end) && !isTBD(event.venue) && !isTBD(event.address)) {
      actions.append(renderCalendar(event));
    }
    return el("section", { class: "event" },
      el("h2", { class: "event-title" }, event.title),
      el("p", { class: "event-time" }, eventTime(event)),
      el("p", { class: "event-venue" }, field(event.venue)),
      el("p", { class: "event-address" }, field(event.address)),
      actions
    );
  }

  function renderDetails() {
    return el("div", {},
      el("img", { class: "divider", src: "assets/olive-branch.svg", alt: "", width: "168", height: "48" }),
      el("p", { class: "date" }, isDate(INVITE.date) ? longDate(INVITE.date) : field(INVITE.date)),
      ...INVITE.events.map(renderEvent)
    );
  }

  // RSVP

  async function sendReply(payload) {
    const endpoint = INVITE.rsvpEndpoint;
    if (isTBD(endpoint)) {
      const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
      if (!isLocal) throw new Error("RSVP endpoint is not set");
      console.warn("RSVP stubbed: no endpoint set, so this reply was not saved.", payload);
      await new Promise((resolve) => setTimeout(resolve, 600));
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      // text/plain avoids a CORS preflight, which Apps Script can't answer.
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        credentials: "omit",
        signal: controller.signal,
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "RSVP was rejected");
    } finally {
      clearTimeout(timer);
    }
  }

  function renderRsvp() {
    const section = el("section", { class: "rsvp", "aria-labelledby": "rsvp-title" });
    const heading = el("h2", { id: "rsvp-title" }, "Kindly let us know if you can join us");
    const replyBy = el("p", { class: "reply-by" },
      "Kindly respond by ",
      isDate(INVITE.replyBy) ? shortDate(INVITE.replyBy) : field(INVITE.replyBy)
    );

    function showConfirmation(reply, moveFocus) {
      const message = reply.attending === "yes"
        ? `Thank you, ${reply.name}. We look forward to celebrating with you.`
        : `Thank you for letting us know, ${reply.name}. You will be in our prayers.`;
      const title = el("h3", { tabindex: "-1" }, message);
      const again = el("button", { type: "button", class: "action" }, "Send a new response");
      again.addEventListener("click", () => showForm(reply.name));
      section.replaceChildren(heading, el("div", { class: "confirmation" },
        title,
        el("p", { class: "hint" }, "Need to change your reply? Simply send a new one using the same name."),
        again
      ));
      if (moveFocus) title.focus();
    }

    function showForm(prefillName) {
      let guests = 1;

      const nameInput = el("input", {
        type: "text", id: "rsvp-name", name: "name", autocomplete: "name",
        maxlength: "80", "aria-describedby": "rsvp-name-error",
      });
      nameInput.value = prefillName || "";
      const nameError = el("p", { class: "error", id: "rsvp-name-error", hidden: true });

      const yes = el("input", { type: "radio", name: "attending", value: "yes" });
      const no = el("input", { type: "radio", name: "attending", value: "no" });
      const attendingError = el("p", { class: "error", hidden: true });

      const minus = el("button", { type: "button", "aria-label": "One fewer guest" }, "\u2212");
      const plus = el("button", { type: "button", "aria-label": "One more guest" }, "+");
      const count = el("output", { "aria-live": "polite" });
      const guestsField = el("div", { class: "field", role: "group", "aria-labelledby": "rsvp-guests-label", hidden: true },
        el("p", { class: "parents", id: "rsvp-guests-label" }, "Including yourself, how many will be attending?"),
        el("div", { class: "stepper", style: "margin-top:8px" }, minus, count, plus),
        el("p", { class: "hint" }, `If you are more than ${MAX_GUESTS}, please send a second response.`)
      );

      function updateGuests() {
        count.textContent = String(guests);
        minus.disabled = guests <= 1;
        plus.disabled = guests >= MAX_GUESTS;
      }
      minus.addEventListener("click", () => { guests -= 1; updateGuests(); });
      plus.addEventListener("click", () => { guests += 1; updateGuests(); });
      updateGuests();

      const website = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off" });
      const submit = el("button", { type: "submit", class: "submit" }, "Send my response");
      const sendError = el("p", { class: "error send-error", role: "alert", hidden: true });

      const form = el("form", { novalidate: true },
        el("div", { class: "field" },
          el("label", { for: "rsvp-name" }, "Your name"),
          nameInput,
          nameError
        ),
        el("fieldset", { class: "field" },
          el("legend", {}, "Will you be able to join us for the betrothal and reception?"),
          el("label", { class: "choice" }, yes, "Joyfully, yes"),
          el("label", { class: "choice" }, no, "Regretfully, no"),
          attendingError
        ),
        guestsField,
        el("div", { class: "website", "aria-hidden": "true" },
          el("label", {}, "Website", website)
        ),
        submit,
        sendError
      );

      function syncAttending() {
        guestsField.hidden = !yes.checked;
        attendingError.hidden = true;
      }
      yes.addEventListener("change", syncAttending);
      no.addEventListener("change", syncAttending);
      nameInput.addEventListener("input", () => { nameError.hidden = true; });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        sendError.hidden = true;

        const name = nameInput.value.trim().replace(/\s+/g, " ");
        const nameValid = name.length >= 2 && name.length <= 80;
        const attending = yes.checked ? "yes" : no.checked ? "no" : "";

        nameError.hidden = nameValid;
        nameError.textContent = nameValid ? "" : "Please enter your name.";
        attendingError.hidden = Boolean(attending);
        attendingError.textContent = attending ? "" : "Please choose one of the options.";

        if (!nameValid) { nameInput.focus(); return; }
        if (!attending) { yes.focus(); return; }

        submit.disabled = true;
        submit.textContent = "Sending...";
        try {
          await sendReply({
            name,
            attending,
            guests: attending === "yes" ? guests : 0,
            website: website.value,
          });
          const reply = { name, attending };
          saveReply(reply);
          showConfirmation(reply, true);
        } catch (error) {
          console.error(error);
          sendError.textContent = "Sorry, we could not send your response. Please check your connection and try again.";
          sendError.hidden = false;
          submit.disabled = false;
          submit.textContent = "Send my response";
        }
      });

      section.replaceChildren(heading, replyBy, form);
    }

    const saved = readSavedReply();
    if (saved && saved.name && saved.attending) showConfirmation(saved, false);
    else showForm("");

    return section;
  }

  document.getElementById("invite").replaceChildren(
    renderInvitation(),
    renderDetails(),
    renderRsvp(),
    el("p", { class: "closing" }, INVITE.closing)
  );
})();
