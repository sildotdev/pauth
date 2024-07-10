const initializeDatabase = require('../services/db');
const { DataTypes } = require('sequelize');

const defineCharacters = async () => {
  const sequelize = await initializeDatabase;
  const Character = sequelize.define('ix_character', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    faction: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    attributes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    money: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    create_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    last_join_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    schema: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    steamid: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    tickets: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    vehicles: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'ix_characters',
    timestamps: false,
  });

  // We don't need to sync the model with the database since the table already exists
  await sequelize.sync();

  return Character;
};

module.exports = defineCharacters;