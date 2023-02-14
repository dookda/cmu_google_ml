const Pool = require('pg').Pool
const { Client } = require('pg')

const db = new Pool({
    user: 'sakdahomhuan',
    host: 'localhost',
    database: 'gdb',
    password: '1234',
    port: 5432,
});

exports.db = db;