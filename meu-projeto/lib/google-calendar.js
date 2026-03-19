/**
 * Google Calendar API Client — Singleton (pattern de drive-access.js)
 * Usa Service Account para criar/listar eventos no calendário do Eric.
 */

const path = require('path');
const { google } = require('googleapis');

const TIMEZONE = 'America/Sao_Paulo';

let _calendarApi = null;

async function getCalendarApi() {
  if (_calendarApi) return _calendarApi;

  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
    || path.resolve(__dirname, '..', 'google-service-account.json');

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  _calendarApi = google.calendar({ version: 'v3', auth });
  return _calendarApi;
}

/**
 * Verifica se o service account está configurado
 */
function isConfigured() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
    || path.resolve(__dirname, '..', 'google-service-account.json');
  try {
    require('fs').accessSync(keyFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cria um evento no Google Calendar
 * @param {Object} params
 * @param {string} params.title - Título do evento
 * @param {string} params.startTime - ISO datetime (ex: 2026-03-07T14:00:00)
 * @param {number} [params.durationMinutes=60] - Duração em minutos
 * @param {string} [params.description] - Descrição
 * @param {string[]} [params.attendees] - Emails dos participantes
 * @returns {Promise<{success: boolean, event?: Object, htmlLink?: string, error?: string}>}
 */
async function createEvent({ title, startTime, durationMinutes = 60, description, attendees, colorId = '10', recurrence }) {
  try {
    const calendar = await getCalendarApi();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    // Format as local time string (no UTC conversion) — timeZone field handles offset
    const formatLocal = (d) => {
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const event = {
      summary: title,
      start: { dateTime: formatLocal(start), timeZone: TIMEZONE },
      end: { dateTime: formatLocal(end), timeZone: TIMEZONE },
      colorId, // 10 = Basil (verde)
    };

    if (description) event.description = description;
    if (attendees && attendees.length > 0) {
      event.attendees = attendees.map(email => ({ email }));
    }
    if (recurrence) {
      event.recurrence = Array.isArray(recurrence) ? recurrence : [recurrence];
    }

    // Tentar criar Google Meet automaticamente (falha silenciosamente com Service Accounts)
    let res;
    let meetLink;
    try {
      event.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };

      res = await calendar.events.insert({
        calendarId,
        resource: event,
        conferenceDataVersion: 1,
      });

      meetLink = res.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
    } catch (meetErr) {
      // Service Accounts não podem criar Meet links — criar evento sem conferência
      console.warn('Google Meet unavailable (Service Account limitation), creating event without Meet link');
      delete event.conferenceData;

      res = await calendar.events.insert({
        calendarId,
        resource: event,
      });

      meetLink = null;
    }

    return {
      success: true,
      event: res.data,
      htmlLink: res.data.htmlLink,
      meetLink,
    };
  } catch (err) {
    console.error('Error creating calendar event:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Lista próximos eventos (para checar conflitos)
 * @param {number} [hours=24] - Janela de horas à frente
 * @returns {Promise<Array>}
 */
async function listUpcoming(hours = 24) {
  try {
    const calendar = await getCalendarApi();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const now = new Date();
    const later = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const maxResults = hours > 48 ? 50 : 20;
    const res = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: later.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults,
    });

    return res.data.items || [];
  } catch (err) {
    console.error('Error listing calendar events:', err.message);
    return [];
  }
}

/**
 * Lista eventos num intervalo específico (para checar conflitos)
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Array>} Eventos com id, summary, start, end
 */
async function getEventsInRange(startDate, endDate) {
  try {
    const calendar = await getCalendarApi();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const res = await calendar.events.list({
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10,
    });

    return res.data.items || [];
  } catch (err) {
    console.error('Error listing events in range:', err.message);
    return [];
  }
}

/**
 * Deleta um evento pelo ID
 * @param {string} eventId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteEvent(eventId) {
  try {
    const calendar = await getCalendarApi();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    await calendar.events.delete({ calendarId, eventId });
    return { success: true };
  } catch (err) {
    console.error('Error deleting calendar event:', err.message);
    return { success: false, error: err.message };
  }
}

// Horário comercial do Eric (12h-20h BRT)
const WORK_HOURS = { start: 12, end: 20 };
const SLOT_DURATION_MINUTES = 30;

/**
 * Consulta FreeBusy do Google Calendar
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Array<{start: Date, end: Date}>>} Períodos ocupados
 */
async function getFreeBusy(startDate, endDate) {
  try {
    const calendar = await getCalendarApi();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: TIMEZONE,
        items: [{ id: calendarId }],
      },
    });

    const busy = res.data.calendars?.[calendarId]?.busy || [];
    return busy.map(b => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch (err) {
    console.error('Error querying free/busy:', err.message);
    return [];
  }
}

/**
 * Gera slots disponíveis de 30min dentro do horário comercial
 * @param {number} [daysAhead=7] - Quantos dias à frente consultar
 * @returns {Promise<Array<{date: string, time: string, startTime: string, endTime: string}>>}
 */
async function getAvailableSlots(daysAhead = 7) {
  const now = new Date();
  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + daysAhead);

  const busy = await getFreeBusy(startDate, endDate);

  const slots = [];

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);

    // Pular finais de semana
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;

    for (let h = WORK_HOURS.start; h < WORK_HOURS.end; h++) {
      for (let m = 0; m < 60; m += SLOT_DURATION_MINUTES) {
        const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0);
        const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

        // Pular slots que já passaram
        if (slotStart <= now) continue;

        // Checar conflito com eventos existentes
        const hasConflict = busy.some(b => slotStart < b.end && slotEnd > b.start);
        if (hasConflict) continue;

        const dateStr = slotStart.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const iso = slotStart.toISOString();
        const isoEnd = slotEnd.toISOString();

        slots.push({ date: dateStr, time: timeStr, startTime: iso, endTime: isoEnd });
      }
    }
  }

  return slots;
}

/**
 * Retorna os próximos N slots disponíveis formatados como opções
 * @param {number} [count=6]
 * @returns {Promise<Array<{label: string, startTime: string}>>}
 */
async function suggestNextSlots(count = 6) {
  const allSlots = await getAvailableSlots(14);
  return allSlots.slice(0, count).map(s => ({
    label: `${s.date} às ${s.time}`,
    startTime: s.startTime,
  }));
}

/**
 * Retorna slots disponíveis para uma data específica
 * @param {Date} targetDate
 * @returns {Promise<Array<{time: string, startTime: string}>>}
 */
async function getSlotsForDate(targetDate) {
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), WORK_HOURS.start, 0, 0);
  const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), WORK_HOURS.end, 0, 0);

  const busy = await getFreeBusy(dayStart, dayEnd);
  const now = new Date();
  const slots = [];

  for (let h = WORK_HOURS.start; h < WORK_HOURS.end; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION_MINUTES) {
      const slotStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), h, m, 0);
      const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

      if (slotStart <= now) continue;

      const hasConflict = busy.some(b => slotStart < b.end && slotEnd > b.start);
      if (hasConflict) continue;

      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({ time: timeStr, startTime: slotStart.toISOString() });
    }
  }

  return slots;
}

module.exports = {
  getCalendarApi,
  createEvent,
  deleteEvent,
  listUpcoming,
  getEventsInRange,
  isConfigured,
  getFreeBusy,
  getAvailableSlots,
  suggestNextSlots,
  getSlotsForDate,
  WORK_HOURS,
  TIMEZONE,
};
