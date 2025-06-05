const knex = require('knex');
const config = require('./knexfile');
console.log('Knex Config:', config.development); // Add this for debugging
const db = knex(config.development);
module.exports = { db };