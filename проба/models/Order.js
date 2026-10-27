const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  buyerId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'processing', 'done', 'cancelled'), defaultValue: 'pending' },
  contactName: { type: DataTypes.STRING, allowNull: false },
  contactPhone: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  department: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true });