const pool = require('../db/pool');

// === Structured Payment Log ===
exports.logPaymentEvent = async ({
    user_payment_id,
    user_id,
    plan_id,
    amount,
    payment_method,
    gateway_order_id,
    gateway_payment_id,
    gateway_signature,
    status
}) => {
    await pool.query(`
        INSERT INTO payment_logs (
            user_payment_id,
            user_id,
            plan_id,
            amount,
            payment_method,
            gateway_order_id,
            gateway_payment_id,
            gateway_signature,
            status,
            created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    `, [user_payment_id, user_id, plan_id, amount, payment_method, gateway_order_id, gateway_payment_id, gateway_signature, status]);
};

// === Create Payment ===
exports.createPayment = async ({ user_id, plan_id, amount, order_id, metadata }) => {
    const result = await pool.query(`
        INSERT INTO user_payments (
            user_id, plan_id, amount, gateway_order_id, payment_gateway, status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [user_id, plan_id, amount, order_id, 'Razorpay', 'created', JSON.stringify(metadata)]);

    const payment = result.rows[0];

    // Log the creation
    await exports.logPaymentEvent({
        user_payment_id: payment.id,
        user_id,
        plan_id,
        amount,
        payment_method: 'Razorpay',
        gateway_order_id: order_id,
        gateway_payment_id: null,
        gateway_signature: null,
        status: 'created'
    });

    return payment;
};

// === Mark Payment as Paid ===
exports.markPaymentAsPaid = async ({ order_id, payment_id, signature, payment_method }) => {
    const result = await pool.query(`SELECT * FROM user_payments WHERE gateway_order_id = $1`, [order_id]);
    if (!result.rowCount) return null;

    const payment = result.rows[0];
    const metadata = payment.metadata || {};
    const duration = metadata.duration_days || 30;

    const updated = await pool.query(`
        UPDATE user_payments
        SET gateway_payment_id = $1,
            gateway_signature = $2,
            status = 'paid',
            paid_at = NOW(),
            payment_method = $4,
            plan_start_date = NOW(),
            plan_end_date = NOW() + INTERVAL '${duration} days'
        WHERE gateway_order_id = $3
        RETURNING *
    `, [payment_id, signature, order_id, payment_method || 'UPI']);

    const updatedPayment = updated.rows[0];

    // Log the payment success
    await exports.logPaymentEvent({
        user_payment_id: updatedPayment.id,
        user_id: updatedPayment.user_id,
        plan_id: updatedPayment.plan_id,
        amount: updatedPayment.amount,
        payment_method: updatedPayment.payment_method,
        gateway_order_id: updatedPayment.gateway_order_id,
        gateway_payment_id: updatedPayment.gateway_payment_id,
        gateway_signature: updatedPayment.gateway_signature,
        status: updatedPayment.status
    });

    return updatedPayment;
};

// === Mark Payment as Failed ===
// exports.markPaymentAsFailed = async ({ order_id, reason }) => {
//     const result = await pool.query(`SELECT * FROM user_payments WHERE gateway_order_id = $1`, [order_id]);
//     if (!result.rowCount) return null;

//     const updated = await pool.query(`
//         UPDATE user_payments
//         SET status = 'failed'
//         WHERE gateway_order_id = $1
//         RETURNING *
//     `, [order_id]);

//     const updatedPayment = updated.rows[0];

//     // Log failure
//     await exports.logPaymentEvent({
//         user_payment_id: updatedPayment.id,
//         user_id: updatedPayment.user_id,
//         plan_id: updatedPayment.plan_id,
//         amount: updatedPayment.amount,
//         payment_method: updatedPayment.payment_method,
//         gateway_order_id: updatedPayment.gateway_order_id,
//         gateway_payment_id: updatedPayment.gateway_payment_id,
//         gateway_signature: updatedPayment.gateway_signature,
//         status: 'failed'
//     });

//     return updatedPayment;
// };

async function markPaymentAsPaid(order_id, payment_id, signature, payment_method) {
    try {
        // 1. Get the payment record with plan_id + user_id
        const paymentResult = await pool.query(
            `SELECT * FROM user_payments WHERE gateway_order_id = $1`,
            [order_id]
        );

        if (paymentResult.rows.length === 0) {
            throw new Error("Payment record not found");
        }

        const payment = paymentResult.rows[0];

        // 2. Get plan duration
        const planResult = await pool.query(
            `SELECT duration_in_days FROM membership_plans WHERE id = $1`,
            [payment.plan_id]
        );

        if (planResult.rows.length === 0) {
            throw new Error("Plan not found");
        }

        const duration = planResult.rows[0].duration_in_days;

        // 3. Check if user already has an active plan
        const latestEndResult = await pool.query(
            `SELECT MAX(plan_end_date) AS latest_end
             FROM user_payments
             WHERE user_id = $1 AND status = 'paid'`,
            [payment.user_id]
        );

        let startDate = new Date(); // default = NOW()
        const latestEnd = latestEndResult.rows[0].latest_end;

        if (latestEnd && new Date(latestEnd) > new Date()) {
            // User has an active plan → stack
            startDate = new Date(latestEnd);
        }

        // 4. Update user_payments with stacked dates
        const updated = await pool.query(
            `UPDATE user_payments
             SET gateway_payment_id = $1,
                 gateway_signature = $2,
                 status = 'paid',
                 paid_at = NOW(),
                 payment_method = $4,
                 plan_start_date = $5,
                 plan_end_date = $5 + ($6 || ' days')::interval
             WHERE gateway_order_id = $3
             RETURNING *`,
            [payment_id, signature, order_id, payment_method || "UPI", startDate, duration]
        );

        // 5. Update users table with current active plan info
        await pool.query(
            `UPDATE users
             SET current_plan_start = $1,
                 current_plan_end = $2,
                 membership_plan_id = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [
                updated.rows[0].plan_start_date,
                updated.rows[0].plan_end_date,
                payment.plan_id,
                payment.user_id,
            ]
        );

        return updated.rows[0];
    } catch (error) {
        console.error("Error marking payment as paid:", error);
        throw error;
    }
}


// === Log Webhook Event ===
exports.logWebhook = async ({ order_id, event }) => {
    const result = await pool.query(`SELECT * FROM user_payments WHERE gateway_order_id = $1`, [order_id]);
    if (!result.rowCount) return null;

    const payment = result.rows[0];

    await exports.logPaymentEvent({
        user_payment_id: payment.id,
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        gateway_order_id: payment.gateway_order_id,
        gateway_payment_id: payment.gateway_payment_id,
        gateway_signature: payment.gateway_signature,
        status: `webhook: ${event.type || 'unknown'}`
    });
};

// === Mark Payment as Refunded ===
exports.markPaymentAsRefunded = async ({ order_id, refund_id, reason }) => {
    const result = await pool.query(`SELECT * FROM user_payments WHERE gateway_order_id = $1`, [order_id]);
    if (!result.rowCount) return null;

    const updated = await pool.query(`
        UPDATE user_payments
        SET status = 'refunded'
        WHERE gateway_order_id = $1
        RETURNING *
    `, [order_id]);

    const updatedPayment = updated.rows[0];

    // Log refund
    await exports.logPaymentEvent({
        user_payment_id: updatedPayment.id,
        user_id: updatedPayment.user_id,
        plan_id: updatedPayment.plan_id,
        amount: updatedPayment.amount,
        payment_method: updatedPayment.payment_method,
        gateway_order_id: updatedPayment.gateway_order_id,
        gateway_payment_id: updatedPayment.gateway_payment_id,
        gateway_signature: updatedPayment.gateway_signature,
        status: `refunded: ${refund_id} (${reason})`
    });

    return updatedPayment;
};
