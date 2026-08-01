const Award = require('./award.model');

async function list(req, res, next) {
  try {
    const items = await Award.find({ status: 'active' }).sort({ order: 1, year: -1 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const award = await Award.create(req.body);
    res.status(201).json(award);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const award = await Award.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!award) return res.status(404).json({ message: 'Award not found' });
    res.json(award);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await Award.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Award not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
