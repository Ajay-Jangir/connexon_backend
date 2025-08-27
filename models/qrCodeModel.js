// === qrCodeModel.js ===
const pool = require('../db/pool');

// Fetch user details
exports.getUserById = async (user_id) => {
    const result = await pool.query(`
        SELECT 
            u.id,
            u.first_name,
            u.middle_name,
            u.last_name,
            u.email,
            TO_CHAR(u.dob, 'YYYY-MM-DD') AS dob,
            u.address,
            u.status,
            COALESCE(json_agg(
                jsonb_build_object(
                    'country_code', p.country_code,
                    'phone_number', p.phone_number
                )
            ) FILTER (WHERE p.phone_number IS NOT NULL), '[]') AS phone_numbers
        FROM users u
        LEFT JOIN user_phone_numbers p ON u.id = p.user_id
        WHERE u.id = $1
        GROUP BY u.id;
    `, [user_id]);

    return result.rows[0] || null;
};

// Get active plan for user
exports.getActivePlanByUserId = async (user_id) => {
    const result = await pool.query(
        `SELECT * FROM user_payments 
        WHERE user_id = $1 
        AND plan_start_date <= CURRENT_TIMESTAMP
        AND plan_end_date >= CURRENT_TIMESTAMP
        AND status = 'paid'
        ORDER BY plan_end_date DESC 
        LIMIT 1`,
        [user_id]
    );
    return result.rows[0] || null;
};

// Insert QR code (but prevent if blocked)
exports.insertQRCode = async ({ user_id, qr_code_data, vcard }) => {
    // Check if user is blocked from generating QR codes
    const userCheck = await pool.query(
        `SELECT status FROM users WHERE id = $1`,
        [user_id]
    );

    const qrCodeCheck = await pool.query(
        `SELECT qr_disabled_by_admin FROM qr_codes
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
        [user_id]
    );

    if (userCheck.rows[0]?.status === 'blocked' || qrCodeCheck.rows[0]?.qr_disabled_by_admin === true) {
        throw new Error('QR code generation is blocked by admin');
    }

    const result = await pool.query(
        `INSERT INTO qr_codes (user_id, qr_code_data, vcard)
        VALUES ($1, $2, $3)
         RETURNING *`,
        [user_id, qr_code_data, vcard]
    );

    const insertedId = result.rows[0].id;

    await pool.query(
        `DELETE FROM qr_codes 
        WHERE user_id = $1 
        AND is_active = FALSE 
        AND id != $2`,
        [user_id, insertedId]
    );

    return result.rows[0];
};

// Deactivate all active QR codes for user
exports.deactivateAllQRCodesForUser = async (user_id) => {
    await pool.query(
        `UPDATE qr_codes 
         SET is_active = FALSE 
         WHERE user_id = $1 AND is_active = TRUE`,
        [user_id]
    );
};

// Deletes all QR codes for a user except the new one
exports.deleteOldQRCodes = async (user_id, excludeQrId) => {
    await pool.query(
        `DELETE FROM qr_codes
         WHERE user_id = $1 AND id != $2`,
        [user_id, excludeQrId]
    );
};


// Get latest active QR code
exports.getActiveQRCodeByUserId = async (user_id) => {
    const result = await pool.query(
        `SELECT * FROM qr_codes
        WHERE user_id = $1 
          AND is_active = TRUE 
          AND qr_disabled_by_admin = FALSE
        ORDER BY created_at DESC LIMIT 1`,
        [user_id]
    );
    return result.rows[0] || null;
};


exports.disableQRCodesByAdmin = async (user_id, qr_disabled_by_admin) => {
    const result = await pool.query(
        `UPDATE qr_codes
         SET qr_disabled_by_admin = $2
         WHERE user_id = $1
         RETURNING *`,
        [user_id, qr_disabled_by_admin]
    );
    return result.rows;
};




