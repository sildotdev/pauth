const { Sequelize } = require('sequelize');
const defineCharacters = require('../models/Character');

const createLocalDatabase = () => {
  return new Sequelize({
    dialect: 'sqlite',
    storage: 'fallback.db',
  });
};

const createPrimaryDatabase = () => {
  return new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
  });
};

const authenticateDatabase = async (sequelize) => {
  try {
    await sequelize.authenticate();
    console.log('Connection established successfully.');
    return sequelize;
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    throw err;
  }
};

const initializeDatabase = async () => {
  let sequelize;
  try {
    sequelize = createPrimaryDatabase();
    sequelize = await authenticateDatabase(sequelize);
  } catch {
    console.log('Falling back to local sqlite database...');
    sequelize = createLocalDatabase();
    sequelize = await authenticateDatabase(sequelize);
  }
  return sequelize;
};

module.exports = initializeDatabase();
