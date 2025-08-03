const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    
  name: {
    type: String,
    required: true
  },
  
  brand: String,
  
  category: String,
  
  price: {
    type: Number,
    required: true
  },
  
  quantity: {
    type: Number,
    default: 0
  },
  
  description: String,
  
  imageUrl: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
