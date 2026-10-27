const express = require('express');
const { Order, Product, Analytics } = require('../models');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const { productId, contactName, contactPhone, city, department } = req.body;
    const product = await Product.findByPk(productId);
    if (!product || product.status !== 'active') return res.status(400).json({ error: 'товар недоступний' });
    if (!contactName || !contactPhone || !city || !department) return res.status(400).json({ error: 'усі поля обовʼязкові' });
    if (!/^\+380\d{9}$/.test(contactPhone)) return res.status(400).json({ error: 'формат телефону +380XXXXXXXXX' });
    const order = await Order.create({ buyerId: req.user.id, productId, contactName, contactPhone, city, department });
    product.status = 'sold';
    await product.save();
    await Analytics.create({ event: 'order', userId: req.user.id, productId, ip: req.ip });
    res.json(order);
  } catch (e) { res.status(500).json({ error: 'помилка сервера' }); }
});

router.get('/my', requireAuth, async (req, res) => {
  const orders = await Order.findAll({ where: { buyerId: req.user.id }, include: [{ model: Product, as: 'product' }], order: [['createdAt','DESC']] });
  res.json(orders.map(o => ({ ...o.toJSON(), product: o.product && { ...o.product.toJSON(), images: JSON.parse(o.product.images || '[]') } })));
});

module.exports = router;