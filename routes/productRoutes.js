const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const productController = require('../controllers/ProductController');

//POST /api/products
router.post('/',upload.single('image'), productController.createProduct);

//GET /api/products
router.get('/', productController.getAllProducts);

//GET /api/products/:id
router.get('/:id', productController.getProductById);

//PUT /api/products/:id
router.put('/:id', upload.single('image'), productController.updateProduct);

//DELETE /api/products/:id
router.delete('/:id', productController.deleteProduct);

module.exports = router;
