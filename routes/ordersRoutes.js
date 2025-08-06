const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/OrderController');

// Create new order
router.post('/', orderCtrl.createOrder);

// Get all orders
router.get('/', orderCtrl.getAllOrders);

// Update order status
router.put('/status/:id', orderCtrl.updateOrderStatus);

// Update order status or edit order (quantity/customer)
router.put('/:id', orderCtrl.updateOrder);


// Delete order (only super admin)
router.delete('/:id', orderCtrl.deleteOrder);

module.exports = router;
