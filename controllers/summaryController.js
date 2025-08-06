// controllers/summaryController.js

const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/Admin");

const dayjs = require("dayjs");

const getSummary = async (req, res) => {
  try {
    const [products, orders, users] = await Promise.all([
      Product.find(),
      Order.find(),
      User.find(),
    ]);

    const today = dayjs().format("YYYY-MM-DD");

    const totalProducts = products.length;
    const outOfStock = products.filter((p) => p.quantity === 0).length;
    const todaysSales = orders
      .filter(
        (order) =>
          order.createdAt &&
          dayjs(order.createdAt).format("YYYY-MM-DD") === today
      )
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalInventoryValue = products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );
    const adminCount = users.filter(
      (u) => u.role === "Admin" || u.role === "SuperAdmin"
    ).length;

    res.json({
      totalProducts,
      outOfStock,
      todaysSales,
      totalInventoryValue,
      adminCount,
    });
  } catch (err) {
    console.error("Summary Error:", err);
    res.status(500).json({ message: "Failed to get summary data" });
  }
};

module.exports = { getSummary };
