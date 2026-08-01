const Partner = require('./partner.model');

async function list(req, res, next) {
  try {
    const items = await Partner.find({ status: 'active' }).sort({ order: 1, name: 1 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const partner = await Partner.create(req.body);
    res.status(201).json(partner);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const partner = await Partner.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!partner) return res.status(404).json({ message: 'Partner not found' });
    res.json(partner);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await Partner.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Partner not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
