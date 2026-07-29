const propertyRepository = require('../property/property.repository');
const inquiryRepository = require('../inquiry/inquiry.repository');
const propertyService = require('../property/property.service');
const inquiryService = require('../inquiry/inquiry.service');
const dashboardService = require('../dashboard/dashboard.service');
const platformDashboardService = require('../platform/dashboard.service');
const platformAgenciesService = require('../platform/agencies.service');
const agencyService = require('../agency/agency.service');
const billingService = require('../billing/billing.service');
const crmService = require('../crm/crm.service');
const authService = require('../auth/auth.service');
const auditLogService = require('../audit/auditLog.service');

// Every tool the model can call. `roles` is the actual authorization
// boundary - not a suggestion to the model. Regardless of what a
// prompt-injected message tries to talk the model into requesting, the
// executor below re-checks role AND scopes every DB query to ctx.tenantId
// (which comes from the authenticated request, never from the model),
// so a jailbroken model still can't retrieve another agency's data or a
// tool it isn't authorized for.
const TOOL_DEFINITIONS = {
  // ---- Property ----
  search_properties: {
    name: 'search_properties',
    description: "Search this agency's available property listings by city, type, price range, or bedrooms.",
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name, e.g. Lahore' },
        type: { type: 'string', enum: ['house', 'flat', 'plot', 'farmhouse', 'office', 'shop', 'warehouse'] },
        minPrice: { type: 'number' },
        maxPrice: { type: 'number' },
        bedrooms: { type: 'number' },
      },
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  get_property_details: {
    name: 'get_property_details',
    description: 'Get full details for one specific property by its ID.',
    parameters: {
      type: 'object',
      properties: { propertyId: { type: 'string' } },
      required: ['propertyId'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  compare_properties: {
    name: 'compare_properties',
    description: 'Compare 2-5 available properties side by side by their IDs (price, size, location, amenities).',
    parameters: {
      type: 'object',
      properties: { propertyIds: { type: 'array', items: { type: 'string' }, description: '2 to 5 property IDs' } },
      required: ['propertyIds'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  recommend_properties: {
    name: 'recommend_properties',
    description: 'Get similar-property recommendations based on one reference property (same city/type, closest price).',
    parameters: {
      type: 'object',
      properties: { propertyId: { type: 'string' } },
      required: ['propertyId'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  estimate_property_price: {
    name: 'estimate_property_price',
    description: 'Estimate a fair market price for a property given city, area, bedrooms, bathrooms.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        area: { type: 'number' },
        bedrooms: { type: 'number' },
        bathrooms: { type: 'number' },
      },
      required: ['area'],
    },
    roles: ['agent', 'agency_admin'],
  },
  get_property_analytics: {
    name: 'get_property_analytics',
    description: 'Get listing analytics: recently added, featured, most viewed, highest priced, lowest priced properties.',
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },

  // ---- Lead ----
  get_lead_stats: {
    name: 'get_lead_stats',
    description: "Get the current user's lead/inquiry statistics: totals, hot/warm/cold counts, average score, most viewed property.",
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  explain_lead_score: {
    name: 'explain_lead_score',
    description: 'Get the full scoring breakdown for one specific lead by its inquiry ID, to explain why it scored the way it did.',
    parameters: {
      type: 'object',
      properties: { inquiryId: { type: 'string', description: 'The inquiry/lead ID' } },
      required: ['inquiryId'],
    },
    roles: ['agent', 'agency_admin'],
  },
  get_lead_pipeline: {
    name: 'get_lead_pipeline',
    description: 'Get every lead grouped by CRM pipeline stage (new, contacted, viewing_scheduled, negotiation, closed_won, closed_lost).',
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  move_lead_stage: {
    name: 'move_lead_stage',
    description: 'Move a lead to a different pipeline stage.',
    parameters: {
      type: 'object',
      properties: {
        inquiryId: { type: 'string' },
        stage: { type: 'string', enum: inquiryService.PIPELINE_STAGES },
      },
      required: ['inquiryId', 'stage'],
    },
    roles: ['agent', 'agency_admin'],
  },

  // ---- Dashboard ----
  get_dashboard_summary: {
    name: 'get_dashboard_summary',
    description: "Get this agency's full dashboard: cards (properties, inquiries, hot leads, avg score) and charts (monthly inquiries trend, lead status breakdown, top properties).",
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  get_platform_stats: {
    name: 'get_platform_stats',
    description: 'Get platform-wide statistics across every agency: totals, active/trial/suspended counts, plan distribution, growth, top agencies.',
    parameters: { type: 'object', properties: {} },
    roles: ['super_admin'],
  },

  // ---- Agency ----
  get_agency_performance: {
    name: 'get_agency_performance',
    description: "Get this agency's performance: total properties/agents/leads, average lead score, conversion rate, total views, top agents by views.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  get_agency_branding: {
    name: 'get_agency_branding',
    description: "Get this agency's branding settings (logo, colors, custom domain).",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  list_platform_agencies: {
    name: 'list_platform_agencies',
    description: 'List agencies on the platform with pagination.',
    parameters: {
      type: 'object',
      properties: { page: { type: 'number' } },
    },
    roles: ['super_admin'],
  },

  // ---- User ----
  get_current_user: {
    name: 'get_current_user',
    description: 'Get the current logged-in user: name, email, role, and which agency workspace they belong to.',
    parameters: { type: 'object', properties: {} },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
  get_my_sessions: {
    name: 'get_my_sessions',
    description: 'List the current user\'s active login sessions (device sessions, when issued, when they expire).',
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  get_audit_log: {
    name: 'get_audit_log',
    description: 'Get recent audit log entries (who did what: property changes, lead stage moves, agency changes). agency_admin sees everyone, agent sees only their own actions.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max entries, default 20' } },
    },
    roles: ['agent', 'agency_admin'],
  },

  // ---- Billing ----
  get_subscription: {
    name: 'get_subscription',
    description: "Get this agency's current subscription plan, status, usage vs plan limits, and available plans.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  get_invoices: {
    name: 'get_invoices',
    description: "Get this agency's billing invoices/history.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },

  // ---- CRM ----
  list_tasks: {
    name: 'list_tasks',
    description: "List the current user's CRM tasks, optionally filtered by status.",
    parameters: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['pending', 'in_progress', 'done'] } },
    },
    roles: ['agent', 'agency_admin'],
  },
  create_task: {
    name: 'create_task',
    description: 'Create a new CRM follow-up task, optionally linked to a lead or property.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        dueDate: { type: 'string', description: 'ISO date' },
        relatedInquiry: { type: 'string' },
        relatedProperty: { type: 'string' },
      },
      required: ['title'],
    },
    roles: ['agent', 'agency_admin'],
  },
  list_appointments: {
    name: 'list_appointments',
    description: "List the current user's upcoming scheduled appointments/viewings.",
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  create_appointment: {
    name: 'create_appointment',
    description: 'Schedule a new appointment/property viewing.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        scheduledAt: { type: 'string', description: 'ISO datetime' },
        location: { type: 'string' },
        relatedProperty: { type: 'string' },
      },
      required: ['title', 'scheduledAt'],
    },
    roles: ['agent', 'agency_admin'],
  },
  get_upcoming_reminders: {
    name: 'get_upcoming_reminders',
    description: 'Get tasks due soon/overdue and appointments coming up in the next 48 hours.',
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
};

function getToolsForRole(role) {
  return Object.values(TOOL_DEFINITIONS)
    .filter((t) => t.roles.includes(role))
    .map(({ name, description, parameters }) => ({ name, description, parameters }));
}

const PROPERTY_LIST_FIELDS = 'title city locality type price bedrooms bathrooms area areaUnit featured views';

const EXECUTORS = {
  async search_properties(args, ctx) {
    const filter = { status: 'available' };
    if (args.city) filter.city = new RegExp(`^${String(args.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (args.type) filter.type = args.type;
    if (args.bedrooms) filter.bedrooms = { $gte: Number(args.bedrooms) };
    if (args.minPrice || args.maxPrice) {
      filter.price = {};
      if (args.minPrice) filter.price.$gte = Number(args.minPrice);
      if (args.maxPrice) filter.price.$lte = Number(args.maxPrice);
    }

    const items = await propertyRepository.find(ctx.tenantId, filter).sort({ createdAt: -1 }).limit(8).select(PROPERTY_LIST_FIELDS);
    return { renderAs: 'property_cards', count: items.length, properties: items };
  },

  async get_property_details(args, ctx) {
    const property = await propertyRepository.findById(ctx.tenantId, args.propertyId);
    if (!property || (ctx.requester.role === 'customer' && property.status !== 'available')) {
      return { error: 'Property not found.' };
    }
    return { renderAs: 'property_cards', count: 1, properties: [property] };
  },

  async compare_properties(args, ctx) {
    try {
      const properties = await propertyService.compareProperties(ctx.tenantId, args.propertyIds);
      return { renderAs: 'comparison_table', properties };
    } catch (err) {
      return { error: err.message };
    }
  },

  async recommend_properties(args, ctx) {
    try {
      const properties = await propertyService.recommendProperties(ctx.tenantId, args.propertyId);
      return { renderAs: 'property_cards', count: properties.length, properties };
    } catch {
      return { error: 'Reference property not found.' };
    }
  },

  async estimate_property_price(args) {
    return propertyService.getPriceEstimate(args);
  },

  async get_property_analytics(_args, ctx) {
    const analytics = await propertyService.getAnalytics(ctx.tenantId);
    return { renderAs: 'property_analytics', ...analytics };
  },

  async get_lead_stats(_args, ctx) {
    const summary = await dashboardService.getSummary(ctx.tenantId, ctx.requester);
    return { renderAs: 'lead_stats', ...summary.cards };
  },

  async explain_lead_score(args, ctx) {
    const propertyFilter = ctx.requester.role === 'agency_admin' ? {} : { agent: ctx.requester.id };
    const propertyIds = await propertyRepository.find(ctx.tenantId, propertyFilter).distinct('_id');
    const inquiry = await inquiryRepository.findById(ctx.tenantId, args.inquiryId);

    if (!inquiry || !propertyIds.some((id) => id.toString() === inquiry.property.toString())) {
      return { error: 'Lead not found or not accessible to this user.' };
    }

    return {
      renderAs: 'lead_score_explanation',
      score: inquiry.score,
      status: inquiry.status,
      breakdown: inquiry.scoreBreakdown,
      customer: inquiry.customer.name,
      budget: inquiry.budget,
      moveTimeline: inquiry.moveTimeline,
    };
  },

  async get_lead_pipeline(_args, ctx) {
    const result = await inquiryService.getPipeline(ctx.tenantId, ctx.requester);
    return { renderAs: 'lead_pipeline', ...result };
  },

  async move_lead_stage(args, ctx) {
    try {
      const inquiry = await inquiryService.moveLeadStage(ctx.tenantId, args.inquiryId, args.stage, ctx.requester);
      return { moved: true, inquiryId: inquiry._id, newStage: inquiry.pipelineStage };
    } catch (err) {
      return { error: err.message };
    }
  },

  async get_dashboard_summary(_args, ctx) {
    const summary = await dashboardService.getSummary(ctx.tenantId, ctx.requester);
    return { renderAs: 'dashboard_summary', ...summary };
  },

  async get_platform_stats() {
    const summary = await platformDashboardService.getPlatformSummary();
    return { renderAs: 'platform_summary', ...summary };
  },

  async get_agency_performance(_args, ctx) {
    const result = await agencyService.getPerformance(ctx.tenantId);
    return { renderAs: 'agency_performance', ...result };
  },

  async get_agency_branding(_args, ctx) {
    return agencyService.getBranding(ctx.tenantId);
  },

  async list_platform_agencies(args) {
    const result = await platformAgenciesService.listAgencies({ page: args.page });
    return { renderAs: 'agency_table', ...result };
  },

  async get_current_user(_args, ctx) {
    return { id: ctx.requester.id, name: ctx.requester.name, email: ctx.requester.email, role: ctx.requester.role, agencyId: ctx.tenantId };
  },

  async get_my_sessions(_args, ctx) {
    const sessions = await authService.listActiveSessions(ctx.requester.id);
    return { renderAs: 'session_list', count: sessions.length, sessions };
  },

  async get_audit_log(args, ctx) {
    const logs = await auditLogService.list(ctx.tenantId, ctx.requester, { limit: args.limit });
    return { renderAs: 'audit_timeline', count: logs.length, logs };
  },

  async get_subscription(_args, ctx) {
    return { renderAs: 'subscription_summary', ...(await billingService.getCurrentSubscription(ctx.tenantId)) };
  },

  async get_invoices(_args, ctx) {
    const invoices = await billingService.listInvoices(ctx.tenantId);
    return { renderAs: 'invoice_table', count: invoices.length, invoices };
  },

  async list_tasks(args, ctx) {
    const tasks = await crmService.listTasks(ctx.tenantId, ctx.requester, { status: args.status });
    return { renderAs: 'task_list', count: tasks.length, tasks };
  },

  async create_task(args, ctx) {
    const task = await crmService.createTask(ctx.tenantId, ctx.requester, {
      title: args.title,
      dueDate: args.dueDate,
      relatedInquiry: args.relatedInquiry,
      relatedProperty: args.relatedProperty,
    });
    return { renderAs: 'task_list', count: 1, tasks: [task] };
  },

  async list_appointments(_args, ctx) {
    const appointments = await crmService.listAppointments(ctx.tenantId, ctx.requester, {});
    return { renderAs: 'appointment_list', count: appointments.length, appointments };
  },

  async create_appointment(args, ctx) {
    const appointment = await crmService.createAppointment(ctx.tenantId, ctx.requester, {
      title: args.title,
      scheduledAt: args.scheduledAt,
      location: args.location,
      relatedProperty: args.relatedProperty,
    });
    return { renderAs: 'appointment_list', count: 1, appointments: [appointment] };
  },

  async get_upcoming_reminders(_args, ctx) {
    const result = await crmService.getUpcomingReminders(ctx.tenantId, ctx.requester);
    return { renderAs: 'reminders', ...result };
  },
};

async function executeTool(name, args, ctx) {
  const definition = TOOL_DEFINITIONS[name];
  if (!definition || !definition.roles.includes(ctx.requester.role)) {
    return { error: 'This tool is not available for your role.' };
  }
  const executor = EXECUTORS[name];
  if (!executor) return { error: 'Unknown tool.' };

  try {
    return await executor(args || {}, ctx);
  } catch {
    return { error: 'Tool execution failed.' };
  }
}

module.exports = { getToolsForRole, executeTool, TOOL_DEFINITIONS };
