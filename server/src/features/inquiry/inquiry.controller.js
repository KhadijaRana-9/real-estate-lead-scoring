const inquiryService = require('./inquiry.service');

async function create(req, res, next) {
  try {
    const { propertyId, name, email, phone, message, budget, moveTimeline } = req.body;

    const inquiry = await inquiryService.createInquiry(req.tenant._id, {
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
    const inquiries = await inquiryService.listInquiriesForAgent(req.tenant._id, req.user);
    res.json(inquiries);
  } catch (err) {
    next(err);
  }
}

async function pipeline(req, res, next) {
  try {
    const result = await inquiryService.getPipeline(req.tenant._id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function moveStage(req, res, next) {
  try {
    const inquiry = await inquiryService.moveLeadStage(req.tenant._id, req.params.id, req.body.stage, req.user);
    res.json(inquiry);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, pipeline, moveStage };
