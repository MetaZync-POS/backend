const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
    }
  ],

  totalAmount: Number,
  customerName: {
    type: String,
    required: true,
  },
  customerContact: {
    type: String,
    required: true,
  },

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