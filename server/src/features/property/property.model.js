const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    city: { type: String, required: true, trim: true },
    area: { type: Number, required: true, min: 0 },
    areaUnit: { type: String, enum: ['marla', 'sqft'], default: 'marla' },
    type: { type: String, enum: ['house', 'flat', 'plot'], default: 'house' },
    bedrooms: { type: Number, default: 0, min: 0 },
    bathrooms: { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['available', 'sold'], default: 'available' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

propertySchema.index({ city: 1, price: 1, type: 1 });

module.exports = mongoose.model('Property', propertySchema);
