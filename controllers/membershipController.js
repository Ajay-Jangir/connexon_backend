const pool = require('../db/pool');

// Create Membership Plan
exports.createPlan = async (req, res) => {
    try {
        const { name, description, price, duration_in_days, features, is_active } = req.body;

        // === Basic Validation ===
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ path: 'name', message: 'Name is required and must be a non-empty string' });
        }

        if (price === undefined || isNaN(price) || Number(price) < 0) {
            return res.status(400).json({ path: 'price', message: 'Price must be a valid non-negative number' });
        }

        if (!Number.isInteger(duration_in_days) || duration_in_days <= 0) {
            return res.status(400).json({ path: 'duration_in_days', message: 'Duration must be a positive integer (in days)' });
        }

        if (features && !Array.isArray(features)) {
            return res.status(400).json({ path: 'features', message: 'Features must be an array of strings' });
        }

        if (is_active !== undefined && typeof is_active !== 'boolean') {
            return res.status(400).json({ path: 'is_active', message: 'is_active must be a boolean (true or false)' });
        }

        const trimmedName = name.trim().toLowerCase();
        const trimmedDesc = (description || '').trim().toLowerCase();
        const parsedPrice = parseFloat(price);
        const isActiveFinal = is_active === true;

        // === Duplicate Check (based on name, description, price) ===
        const duplicateCheck = await pool.query(
            `SELECT 1 FROM membership_plans 
            WHERE LOWER(name) = $1 AND LOWER(description) = $2 AND price = $3`,
            [trimmedName, trimmedDesc, parsedPrice]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                path: 'plan',
                message: 'A plan with the same name, description, and price already exists'
            });
        }

        // === Insert Plan ===
        const result = await pool.query(
            `INSERT INTO membership_plans (name, description, price, duration_in_days, features, is_active)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                name.trim(),
                description || '',
                parsedPrice,
                duration_in_days,
                features || [],
                isActiveFinal
            ]
        );

        res.status(201).json({
            status: 'success',
            message: 'Membership plan created successfully',
            data: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};



// Update Membership Plan
exports.updatePlan = async (req, res) => {
    try {
        const planId = parseInt(req.params.id);
        if (isNaN(planId)) {
            return res.status(400).json({ path: 'id', message: 'Invalid plan ID' });
        }

        const existing = await pool.query('SELECT * FROM membership_plans WHERE id = $1', [planId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ path: 'id', message: 'Plan not found' });
        }

        const { name, description, price, duration_in_days, features, is_active } = req.body;

        const updated = {};
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ path: 'name', message: 'Name must be a non-empty string' });
            }
            updated.name = name.trim();
        } else updated.name = existing.rows[0].name;

        if (description !== undefined) {
            if (typeof description !== 'string') {
                return res.status(400).json({ path: 'description', message: 'Description must be a string' });
            }
            updated.description = description;
        } else updated.description = existing.rows[0].description;

        if (price !== undefined) {
            if (isNaN(price) || Number(price) < 0) {
                return res.status(400).json({ path: 'price', message: 'Price must be a valid non-negative number' });
            }
            updated.price = parseFloat(price);
        } else updated.price = existing.rows[0].price;

        if (duration_in_days !== undefined) {
            if (!Number.isInteger(duration_in_days) || duration_in_days <= 0) {
                return res.status(400).json({ path: 'duration_in_days', message: 'Duration must be a positive integer' });
            }
            updated.duration_in_days = duration_in_days;
        } else updated.duration_in_days = existing.rows[0].duration_in_days;

        if (features !== undefined) {
            if (!Array.isArray(features)) {
                return res.status(400).json({ path: 'features', message: 'Features must be an array of strings' });
            }
            updated.features = features;
        } else updated.features = existing.rows[0].features;

        if (is_active !== undefined) {
            if (typeof is_active !== 'boolean') {
                return res.status(400).json({ path: 'is_active', message: 'is_active must be true or false' });
            }
            updated.is_active = is_active;
        } else updated.is_active = existing.rows[0].is_active;

        await pool.query(
            `UPDATE membership_plans
             SET name = $1, description = $2, price = $3, duration_in_days = $4, features = $5, is_active = $6
             WHERE id = $7`,
            [
                updated.name,
                updated.description,
                updated.price,
                updated.duration_in_days,
                updated.features,
                updated.is_active,
                planId
            ]
        );

        res.status(200).json({ status: 'success', message: 'Membership plan updated successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};

// Delete Membership Plan
exports.deletePlan = async (req, res) => {
    try {
        const planId = parseInt(req.params.id);
        if (isNaN(planId)) {
            return res.status(400).json({ path: 'id', message: 'Invalid plan ID' });
        }

        const result = await pool.query('DELETE FROM membership_plans WHERE id = $1 RETURNING *', [planId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ path: 'id', message: 'Plan not found' });
        }

        res.status(200).json({ status: 'success', message: 'Membership plan deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};

// Fetch All Membership Plans
// For admin: show all plans
exports.getAllPlansForAdmin = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM membership_plans ORDER BY id DESC');

        res.status(200).json({
            status: 'success',
            message: 'Membership plans fetched successfully',
            data: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};

// For users: show only active plans
exports.getAllActivePlans = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM membership_plans WHERE is_active = true ORDER BY id DESC');

        res.status(200).json({
            status: 'success',
            message: 'Active membership plans fetched successfully',
            data: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};

