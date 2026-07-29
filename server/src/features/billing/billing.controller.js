const billingService = require('./billing.service');

async function getSubscription(req, res, next) {
  try {
    const result = await billingService.getCurrentSubscription(req.tenant._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listInvoices(req, res, next) {
  try {
    const invoices = await billingService.listInvoices(req.tenant._id);
    res.json(invoices);
  } catch (err) {
    next(err);
  }
}

async function generateInvoice(req, res, next) {
  try {
    const invoice = await billingService.generateInvoiceForCurrentPeriod(req.tenant._id);
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

async function upgrade(req, res, next) {
  try {
    const origin = req.headers.origin || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const result = await billingService.requestUpgrade(req.tenant._id, req.body.plan, {
      successUrl: req.body.successUrl || `${origin}/dashboard?billing=success`,
      cancelUrl: req.body.cancelUrl || `${origin}/dashboard?billing=cancelled`,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSubscription, listInvoices, generateInvoice, upgrade };
