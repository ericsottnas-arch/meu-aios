// meu-projeto/lib/iris-calendar.js
// Iris v3: Gerenciamento de agendamento de reuniões via GHL Calendar
// Horário disponível: 12:00 às 20:00, reuniões de 15-20 min

const GhlCrm = require('./ghl-crm');

const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_API_KEY = process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN;
const GHL_CALENDAR_ID = process.env.GHL_CALENDAR_ID;
const TIMEZONE = 'America/Sao_Paulo';
const MEETING_DURATION_MIN = 20;

// Horário de trabalho do Eric
const WORK_HOURS = { start: 12, end: 20 };

let crmClient = null;

function getCrm() {
  if (!crmClient && GHL_LOCATION_ID && GHL_API_KEY) {
    crmClient = new GhlCrm(GHL_LOCATION_ID, GHL_API_KEY);
  }
  return crmClient;
}

/**
 * Busca calendários disponíveis e retorna o primeiro (ou o configurado)
 * @returns {Promise<string|null>} calendarId
 */
async function getCalendarId() {
  if (GHL_CALENDAR_ID) return GHL_CALENDAR_ID;

  const crm = getCrm();
  if (!crm) return null;

  try {
    const calendars = await crm.getCalendars();
    if (calendars.length === 0) return null;

    // Pegar o primeiro calendário ativo
    const active = calendars.find((c) => c.isActive !== false) || calendars[0];
    console.log(`📅 Iris Calendar: usando calendário "${active.name}" (${active.id})`);
    return active.id;
  } catch (error) {
    console.error('📅 Iris Calendar: erro ao buscar calendários:', error.message);
    return null;
  }
}

/**
 * Busca próximos horários disponíveis nos próximos N dias
 * Filtra apenas horários entre 12:00 e 20:00
 * @param {number} [daysAhead=7] - Quantos dias à frente buscar
 * @returns {Promise<Array<{date: string, time: string, startTime: string, endTime: string}>>}
 */
async function getAvailableSlots(daysAhead = 7) {
  const crm = getCrm();
  if (!crm) return [];

  const calendarId = await getCalendarId();
  if (!calendarId) return [];

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  try {
    const result = await crm.getFreeSlots(calendarId, start.getTime(), end.getTime(), TIMEZONE);

    const slots = [];
    const slotData = result?.slots || result || {};

    for (const [dateKey, daySlots] of Object.entries(slotData)) {
      if (!Array.isArray(daySlots)) continue;

      for (const slot of daySlots) {
        const slotTime = new Date(slot);
        const hour = slotTime.getHours();

        // Filtrar: apenas entre 12:00 e 20:00
        if (hour >= WORK_HOURS.start && hour < WORK_HOURS.end) {
          const endTime = new Date(slotTime);
          endTime.setMinutes(endTime.getMinutes() + MEETING_DURATION_MIN);

          slots.push({
            date: dateKey,
            time: `${String(hour).padStart(2, '0')}:${String(slotTime.getMinutes()).padStart(2, '0')}`,
            startTime: slotTime.toISOString(),
            endTime: endTime.toISOString(),
          });
        }
      }
    }

    return slots;
  } catch (error) {
    console.error('📅 Iris Calendar: erro ao buscar slots:', error.message);
    return [];
  }
}

/**
 * Sugere os próximos 3 horários disponíveis formatados para mensagem
 * @returns {Promise<string|null>} Texto formatado com sugestões
 */
async function suggestNextSlots() {
  const slots = await getAvailableSlots(7);
  if (slots.length === 0) return null;

  const next3 = slots.slice(0, 3);
  const formatted = next3.map((s) => {
    const date = new Date(s.startTime);
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayName = dayNames[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${dayName} (${day}/${month}) às ${s.time}`;
  });

  return formatted.join('\n');
}

/**
 * Cria um appointment para um contato
 * @param {string} contactId - ID do contato GHL
 * @param {string} startTime - ISO 8601
 * @param {Object} [options]
 * @param {string} [options.contactName] - Nome do contato
 * @param {string} [options.email] - Email para convite
 * @param {string} [options.notes] - Notas
 * @returns {Promise<{success: boolean, appointment?: Object, error?: string}>}
 */
async function createMeeting(contactId, startTime, options = {}) {
  const crm = getCrm();
  if (!crm) return { success: false, error: 'CRM não configurado' };

  const calendarId = await getCalendarId();
  if (!calendarId) return { success: false, error: 'Calendário não encontrado' };

  const start = new Date(startTime);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + MEETING_DURATION_MIN);

  // Verificar se está dentro do horário de trabalho
  const hour = start.getHours();
  if (hour < WORK_HOURS.start || hour >= WORK_HOURS.end) {
    return { success: false, error: `Horário fora do período disponível (${WORK_HOURS.start}h-${WORK_HOURS.end}h)` };
  }

  try {
    const appointment = await crm.createAppointment({
      calendarId,
      contactId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      title: `Reunião de Estratégia - ${options.contactName || 'Lead'}`,
      notes: options.notes || `Agendado via Iris. ${options.email ? 'Email: ' + options.email : ''}`,
      appointmentStatus: 'confirmed',
    });

    console.log(`📅 Iris Calendar: reunião criada para ${options.contactName || contactId} em ${start.toLocaleString('pt-BR')}`);
    return { success: true, appointment };
  } catch (error) {
    console.error('📅 Iris Calendar: erro ao criar reunião:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Encontra o próximo slot disponível e cria a reunião
 * @param {string} contactId
 * @param {Object} [options]
 * @returns {Promise<{success: boolean, slot?: Object, appointment?: Object, error?: string}>}
 */
async function scheduleNextAvailable(contactId, options = {}) {
  const slots = await getAvailableSlots(7);
  if (slots.length === 0) {
    return { success: false, error: 'Nenhum horário disponível nos próximos 7 dias' };
  }

  // Pegar o primeiro slot disponível (a partir de amanhã se já passou das 18h)
  const now = new Date();
  const minStart = now.getHours() >= 18 ? new Date(now.setDate(now.getDate() + 1)) : now;

  const validSlot = slots.find((s) => new Date(s.startTime) > minStart);
  if (!validSlot) {
    return { success: false, error: 'Nenhum horário disponível em breve' };
  }

  const result = await createMeeting(contactId, validSlot.startTime, options);
  if (result.success) {
    return { success: true, slot: validSlot, appointment: result.appointment };
  }

  return result;
}

/**
 * Agenda uma reunião em horário e duração customizados.
 * Usado pelo Alex para agendamentos via linguagem natural.
 *
 * @param {Object} options
 * @param {string} options.startTime - ISO 8601 com offset BR (ex: '2026-03-10T15:00:00-03:00')
 * @param {number} [options.durationMinutes=60] - Duração em minutos
 * @param {string[]} [options.emails=[]] - Emails dos participantes
 * @param {string} [options.title] - Título da reunião
 * @param {string} [options.notes] - Notas adicionais
 * @returns {Promise<{success: boolean, appointment?: Object, startFormatted?: string, endFormatted?: string, error?: string}>}
 */
async function scheduleMeeting({ startTime, durationMinutes = 60, emails = [], title, notes } = {}) {
  const crm = getCrm();
  if (!crm) return { success: false, error: 'CRM não configurado (GHL_API_KEY ou GHL_LOCATION_ID ausente)' };

  const calendarId = await getCalendarId();
  if (!calendarId) return { success: false, error: 'Calendário GHL não encontrado' };

  if (!emails.length) return { success: false, error: 'Informe pelo menos um e-mail' };

  // Busca ou cria contato para o primeiro participante
  let contactId;
  try {
    const contact = await crm.findOrCreateContact(emails[0]);
    contactId = contact.id;
  } catch (err) {
    return { success: false, error: `Erro ao buscar/criar contato: ${err.message}` };
  }

  const start = new Date(startTime);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);

  const meetingTitle = title || `Reunião — ${emails.join(', ')}`;
  const meetingNotes = [
    notes || '',
    `Participantes: ${emails.join(', ')}`,
    'Agendado via Alex (Telegram)',
  ].filter(Boolean).join('\n');

  try {
    const appointment = await crm.createAppointment({
      calendarId,
      contactId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      title: meetingTitle,
      notes: meetingNotes,
      appointmentStatus: 'confirmed',
    });

    const fmtOptions = { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    const startFormatted = start.toLocaleString('pt-BR', fmtOptions);
    const endFormatted = end.toLocaleString('pt-BR', fmtOptions);

    console.log(`📅 Alex Calendar: reunião criada "${meetingTitle}" em ${startFormatted}`);
    return { success: true, appointment, startFormatted, endFormatted, durationMinutes };
  } catch (err) {
    console.error('📅 Alex Calendar: erro ao criar reunião:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verifica se o módulo de calendário está configurado
 */
function isConfigured() {
  return !!(GHL_API_KEY && GHL_LOCATION_ID);
}

module.exports = {
  getCalendarId,
  getAvailableSlots,
  suggestNextSlots,
  createMeeting,
  scheduleNextAvailable,
  scheduleMeeting,
  isConfigured,
  WORK_HOURS,
  MEETING_DURATION_MIN,
};
