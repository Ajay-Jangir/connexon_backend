const pool = require('../db/pool');

exports.findUserById = async (id) => {
    const { rows } = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );
    return rows[0];
};

exports.findUserByEmail = async (email) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
};

exports.isPhoneNumberRegistered = async (phone_number) => {
    if (!phone_number) return false;

    const { rows } = await pool.query(
        `SELECT 1 FROM user_phone_numbers WHERE phone_number = $1 LIMIT 1`,
        [phone_number]
    );
    return rows.length > 0;
};


exports.insertUser = async (user) => {
    const {
        first_name, middle_name, last_name, email, password_hash,
        dob, address
    } = user;

    const result = await pool.query(`
    INSERT INTO users 
        (first_name, middle_name, last_name, email, password_hash, dob, address)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    `, [first_name, middle_name || null, last_name || null, email, password_hash, dob || null, address || null]);

    return result.rows[0];
};

exports.insertPhoneNumber = async (user_id, country_code, phone_number) => {
    await pool.query(`
        INSERT INTO user_phone_numbers (user_id, country_code, phone_number)
        VALUES ($1, $2, $3)
    `, [user_id, country_code, phone_number]);
};

exports.getAllUsers = async () => {
    const result = await pool.query(`
        SELECT 
            u.id, u.first_name, u.middle_name, u.last_name, 
                COALESCE(u.first_name, '') || 
            CASE 
                WHEN u.middle_name IS NOT NULL THEN ' ' || u.middle_name 
                ELSE '' 
            END || 
            CASE 
                WHEN u.last_name IS NOT NULL THEN ' ' || u.last_name 
                ELSE '' 
            END AS full_name,

            u.email, 
            TO_CHAR(u.dob, 'YYYY-MM-DD') AS dob,
            u.address, u.status, 
            u.current_plan_start, u.current_plan_end, u.membership_plan_id,
            u.created_at, u.updated_at,

            json_agg(DISTINCT jsonb_build_object(
                'id', p.id,
                'country_code', p.country_code, 
                'phone_number', p.phone_number
            )) AS phone_numbers,

            (
                SELECT row_to_json(q) 
                FROM qr_codes q 
                WHERE q.user_id = u.id AND q.is_active = TRUE 
                LIMIT 1
            ) AS active_qr_code,

            (
                SELECT row_to_json(pay) 
                FROM user_payments pay 
                WHERE pay.user_id = u.id 
                AND pay.status = 'paid' 
                AND pay.plan_end_date >= CURRENT_TIMESTAMP 
                ORDER BY pay.plan_end_date DESC 
                LIMIT 1
            ) AS active_payment,

            (
                SELECT row_to_json(pl) 
                FROM membership_plans pl 
                WHERE pl.id = u.membership_plan_id
            ) AS plan_details

        FROM users u
        LEFT JOIN user_phone_numbers p ON u.id = p.user_id
        GROUP BY u.id
        ORDER BY u.id ASC;
    `);
    return result.rows;
};


exports.updateUserById = async (id, data) => {
    const { first_name, middle_name, last_name, email, dob, address, status } = data;
    await pool.query(`
        UPDATE users SET
            first_name = COALESCE($1, first_name),
            middle_name = COALESCE($2, middle_name),
            last_name = COALESCE($3, last_name),
            email = COALESCE($4, email),
            dob = COALESCE($5, dob),
            address = COALESCE($6, address),
            status = COALESCE($7, status)
        WHERE id = $8
    `, [first_name, middle_name, last_name, email, dob, address, status, id]);
};


exports.deleteUserById = async (id) => {
    await pool.query('DELETE FROM user_phone_numbers WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
};

exports.massDeleteUsers = async (ids) => {
    await pool.query('DELETE FROM user_phone_numbers WHERE user_id = ANY($1::int[])', [ids]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [ids]);
};

exports.getUserById = async (user_id) => {
    const result = await pool.query(`
        SELECT 
            u.id, u.first_name, u.middle_name, u.last_name, 
            COALESCE(u.first_name, '') || 
            CASE 
                WHEN u.middle_name IS NOT NULL THEN ' ' || u.middle_name 
                ELSE '' 
            END || 
            CASE 
                WHEN u.last_name IS NOT NULL THEN ' ' || u.last_name 
                ELSE '' 
            END AS full_name,

            u.email, 
            TO_CHAR(u.dob, 'YYYY-MM-DD') AS dob,
            u.address, u.status, 
            u.current_plan_start, u.current_plan_end, u.membership_plan_id,
            u.created_at, u.updated_at,

            json_agg(DISTINCT jsonb_build_object(
                'id', p.id,
                'country_code', p.country_code, 
                'phone_number', p.phone_number
            )) AS phone_numbers,

            (
                SELECT row_to_json(q) 
                FROM qr_codes q 
                WHERE q.user_id = u.id AND q.is_active = TRUE 
                LIMIT 1
            ) AS active_qr_code,

            (
                SELECT row_to_json(pay) 
                FROM user_payments pay 
                WHERE pay.user_id = u.id 
                  AND pay.status = 'paid' 
                  AND pay.plan_end_date >= CURRENT_TIMESTAMP 
                ORDER BY pay.plan_end_date DESC 
                LIMIT 1
            ) AS active_payment,

            (
                SELECT row_to_json(pl) 
                FROM membership_plans pl 
                WHERE pl.id = u.membership_plan_id
            ) AS plan_details

        FROM users u
        LEFT JOIN user_phone_numbers p ON u.id = p.user_id
        WHERE u.id = $1
        GROUP BY u.id
        LIMIT 1;
    `, [user_id]);

    return result.rows[0];
};


// ✅ Upsert phone numbers with add, edit, delete specific only
exports.upsertUserPhoneNumbers = async (userId, phoneNumbers = []) => {
    for (const { id, country_code, phone_number } of phoneNumbers) {
        if (!phone_number || typeof phone_number !== 'string' || phone_number.trim() === '') {
            throw new Error("⚠️ Please enter a valid phone number.");
        }

        if (id) {
            // Update existing number
            await pool.query(
                `UPDATE user_phone_numbers
                 SET country_code = COALESCE($1, country_code),
                     phone_number = $2
                 WHERE id = $3 AND user_id = $4`,
                [country_code || '+91', phone_number, id, userId]
            );
        } else {
            // Insert new number
            await pool.query(
                `INSERT INTO user_phone_numbers (user_id, country_code, phone_number)
                 VALUES ($1, $2, $3)`,
                [userId, country_code || '+91', phone_number]
            );
        }
    }
};



exports.deletePhoneNumbers = async (userId, idsToDelete = []) => {
    if (idsToDelete.length === 0) return; // nothing to delete

    await pool.query(
        `DELETE FROM user_phone_numbers
         WHERE user_id = $1 AND id = ANY($2::int[])`,
        [userId, idsToDelete]
    );
};


exports.findUserByIdWithPhones = async (userId) => {
    const userRes = await pool.query(
        `SELECT 
            id, 
            first_name, 
            middle_name, 
            last_name, 
            email, 
            dob, 
            address, 
            status,
            created_at, 
            updated_at
         FROM users
         WHERE id = $1`,
        [userId]
    );

    if (userRes.rows.length === 0) return null;

    const phoneRes = await pool.query(
        `SELECT id, country_code, phone_number
         FROM user_phone_numbers
         WHERE user_id = $1`,
        [userId]
    );

    return {
        ...userRes.rows[0],
        phone_numbers: phoneRes.rows
    };
};



