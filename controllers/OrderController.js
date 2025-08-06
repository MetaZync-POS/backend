const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { products, totalAmount, customerName, customerContact } = req.body;

    // Just create the order (don't check or deduct stock here)
    const order = await Order.create({
      products,
      totalAmount,
      customerName,
      customerContact,
      status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('products.product');

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('products.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (err) {
    console.error('Get order by ID error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/status/:id
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id).populate('products.product');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // If confirming order, check stock and deduct it
    if (status === 'Completed' && order.status !== 'Completed') {
      for (const item of order.products) {
        const product = await Product.findById(item.product._id);

        if (!product || product.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product: ${product?.name || 'Unknown'}`
          });
        }
      }

      for (const item of order.products) {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { quantity: -item.quantity }
        });
      }
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      order
    });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// @desc    Update order (edit products, quantity, customer details)
// @route   PUT /api/orders/:id
exports.updateOrder = async (req, res) => {
  try {
    const { products, totalAmount, customerName, customerContact, status } = req.body;

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Restore previous product stock before applying changes
    for (const item of existingOrder.products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    // Check stock for new order items
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${item.product}`
        });
      }
    }

    // Deduct stock for new items
    for (const item of products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    existingOrder.products = products;
    existingOrder.totalAmount = totalAmount;
    existingOrder.customerName = customerName;
    existingOrder.customerContact = customerContact;
    if (status) existingOrder.status = status;

    await existingOrder.save();

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order: existingOrder
    });
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update order'
    });
  }
};


// @desc    Delete order
// @route   DELETE /api/orders/:id
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order'
    });
  }
};
