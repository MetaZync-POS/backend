const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: Number
    }
  ],

  totalAmount: Number,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);