const razorpay = require('../utils/razorpay');
const crypto = require('crypto');
const paymentModal = require('../models/paymentModel');
const pool = require('../db/pool');
const axios = require('axios'); // at the top of your file

exports.createOrder = async (req, res) => {
    const { plan_id, device_type, browser } = req.body;
    const user_id = req.user.id;

    try {
        // Fetch location using IP
        let location = null;
        try {
            const geoRes = await axios.get(`https://ipapi.co/${req.ip}/json`);
            location = `${geoRes.data.city}, ${geoRes.data.country_name}`;
        } catch (geoErr) {
            console.warn("Failed to fetch location from IP:", geoErr.message);
        }

        // Get plan details
        const result = await pool.query(
            'SELECT price, duration_in_days FROM membership_plans WHERE id = $1 AND is_active = TRUE',
            [plan_id]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid or inactive plan_id' });
        }

        const { price: amount, duration_in_days } = result.rows[0];
        const currency = 'INR';

        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency,
            receipt: `order_rcptid_${Date.now()}`,
            payment_capture: 1,
        });

        // Parse user agent
        const userAgent = req.headers['user-agent'] || '';
        const detectedDevice = /mobile/i.test(userAgent) ? 'Mobile' : /tablet/i.test(userAgent) ? 'Tablet' : 'Desktop';
        const detectedBrowser = /chrome/i.test(userAgent)
            ? 'Chrome'
            : /firefox/i.test(userAgent)
                ? 'Firefox'
                : /safari/i.test(userAgent)
                    ? 'Safari'
                    : 'Unknown';

        const metadata = {
            user_agent: userAgent,
            ip_address: req.ip,
            location,
            device_type: device_type || detectedDevice,
            browser: browser || detectedBrowser,
            created_by: 'user',
            created_at: new Date().toISOString(),
            duration_days: duration_in_days
        };


        await paymentModal.createPayment({
            user_id,
            plan_id,
            amount,
            order_id: order.id,
            duration_in_days,
            metadata
        });

        res.status(200).json({
            status: 'success',
            order_id: order.id,
            amount,
            currency
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Failed to create order' });
    }
};

exports.verifyPayment = async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
    } = req.body;

    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    if (generated_signature === razorpay_signature) {
        await paymentModal.markPaymentAsPaid({
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            signature: razorpay_signature
        });

        res.json({ status: 'success', message: 'Payment verified' });
    } else {
        res.status(400).json({ status: 'error', message: 'Invalid payment signature' });
    }
};


exports.handleWebhook = async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

    if (signature === expectedSignature) {
        await paymentModal.logWebhook({
            order_id: req.body.payload?.payment?.entity?.order_id || '',
            event: req.body
        });

        res.status(200).json({ status: "Webhook verified" });
    } else {
        res.status(400).json({ status: "Invalid signature" });
    }
};


exports.getMyPayments = async (req, res) => {
    const user_id = req.user.id;

    try {
        const payments = await pool.query(`
            SELECT 
                p.*, 
                mp.name AS plan_name
            FROM user_payments p
            JOIN membership_plans mp ON p.plan_id = mp.id
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
        `, [user_id]);

        res.json({
            status: "success",
            payments: payments.rows.map(p => ({
                id: p.id,
                plan_name: p.plan_name,
                plan_id: p.plan_id,
                amount: p.amount,
                payment_method: p.payment_method,
                payment_gateway: p.payment_gateway,
                gateway_order_id: p.gateway_order_id,
                gateway_payment_id: p.gateway_payment_id,
                gateway_signature: p.gateway_signature,
                status: p.status,
                paid_at: p.paid_at,
                plan_start_date: p.plan_start_date,
                plan_end_date: p.plan_end_date,
                created_at: p.created_at,
                metadata: p.metadata
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", message: "Could not fetch payments" });
    }
};
