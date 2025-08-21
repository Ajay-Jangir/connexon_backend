const pool = require('../db/pool');

exports.findAdminByEmail = async (email) => {
    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    return result.rows[0];
};

exports.insertAdmin = async ({ username, email, password_hash }) => {
    const result = await pool.query(
        `INSERT INTO admin_users (username, email, password_hash) 
        VALUES ($1, $2, $3) RETURNING id`,
        [username, email, password_hash]
    );
    return result.rows[0];
};
