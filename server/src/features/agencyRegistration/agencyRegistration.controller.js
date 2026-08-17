const registrationService = require('./agencyRegistration.service');

async function register(req, res, next) {
  try {
    const { agency, checkoutUrl, paymentConfigured } = await registrationService.register(req.body, req.files);
    res.status(201).json({
      agencyId: agency._id,
      companyName: agency.companyName,
      slug: agency.slug,
      status: agency.status,
      checkoutUrl,
      paymentConfigured,
    });
  } catch (err) {
    next(err);
  }
}

async function status(req, res, next) {
  try {
    const result = await registrationService.getRegistrationStatus(req.params.agencyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, status };
