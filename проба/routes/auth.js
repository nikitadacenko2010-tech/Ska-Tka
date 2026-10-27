const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User, Analytics } = require('../models');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'забагато спроб' } });

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

router.post('/register', limiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'усі поля обовʼязкові' });
    if (password.length < 6) return res.status(400).json({ error: 'пароль мінімум 6 символів' });
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: 'email вже зайнятий' });
    const passwordHash = await bcrypt.hash(password, 10);
    const isFirst = (await User.count()) === 0;
    const user = await User.create({ email, passwordHash, name, role: isFirst ? 'admin' : 'user' });
    setCookie(res, sign(user));
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) { res.status(500).json({ error: 'помилка сервера' }); }
});

router.post('/login', limiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'невірні дані' });
    if (user.isBlocked) return res.status(403).json({ error: 'акаунт заблоковано' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'невірні дані' });
    setCookie(res, sign(user));
    await Analytics.create({ event: 'login', userId: user.id, ip: req.ip });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) { res.status(500).json({ error: 'помилка сервера' }); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: ['id','email','name','role','avatar','isBlocked'] });
  if (!user) return res.status(404).json({ error: 'не знайдено' });
  res.json(user);
});

router.post('/visit', async (req, res) => {
  await Analytics.create({ event: 'visit', ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;