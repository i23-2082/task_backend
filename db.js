const { Pool } = require('pg');
const knex = require('knex');
const config = require('./knexfile');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = knex({
  client: 'pg',
  connection: pgPool,
  migrations: {
    directory: './migrations',
  },
});

module.exports = { db, pgPool };
