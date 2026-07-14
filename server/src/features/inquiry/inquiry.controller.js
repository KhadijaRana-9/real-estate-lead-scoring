const inquiryService = require('./inquiry.service');

async function create(req, res, next) {
  try {
    const { propertyId, name, email, phone, message, budget, moveTimeline } = req.body;
    if (!propertyId || !name || !email || !budget) {
      return res.status(400).json({ message: 'propertyId, name, email and budget are required' });
    }

    const inquiry = await inquiryService.createInquiry({
      propertyId,
      customer: { name, email, phone },
      message,
      budget,
      moveTimeline,
    });

    res.status(201).json(inquiry);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const inquiries = await inquiryService.listInquiriesForAgent(req.user);
    res.json(inquiries);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list };
