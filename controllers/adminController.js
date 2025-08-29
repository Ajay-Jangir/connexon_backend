const bcrypt = require('bcrypt');
const adminModel = require('../models/adminModel');
const { generateToken } = require('../utils/jwt');
const userModel = require('../models/userModel');
const validator = require('validator');


exports.registerAdmin = async (req, res) => {
    try {
        let { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ path: 'body', message: 'Username, email and password are required' });
        }

        username = username.trim();
        email = email.trim().toLowerCase();  // Normalize email to lowercase

        const existingUser = await adminModel.findAdminByEmail(email);
        if (existingUser) {
            return res.status(409).json({ path: 'email', message: 'Email already registered' });
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        const newAdmin = await adminModel.insertAdmin({ username, email, password_hash });

        res.status(201).json({
            status: 'success',
            message: 'Admin registered successfully',
            admin_id: newAdmin.id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};

exports.loginAdmin = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ path: 'body', message: 'Email and password are required' });
        }

        email = email.trim().toLowerCase();  // Normalize email to lowercase

        const admin = await adminModel.findAdminByEmail(email);
        if (!admin) {
            return res.status(401).json({ path: 'credentials', message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ path: 'credentials', message: 'Invalid email or password' });
        }

        const token = generateToken({ id: admin.id, email: admin.email, role: admin.role });

        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await userModel.getAllUsers();
        res.status(200).json({
            status: 'success',
            message: 'Users fetched successfully',
            data: users
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};


exports.updateAnyUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ path: 'id', message: 'Invalid user ID' });
        }

        const {
            first_name,
            middle_name,
            last_name,
            email,
            dob,
            address,
            phone_numbers,
            status,
        } = req.body;

        const user = await userModel.findUserById(userId);
        if (!user) {
            return res.status(404).json({ path: 'id', message: 'User not found' });
        }

        const updatedFields = {};

        // First name - cannot be null
        if (first_name !== undefined) {
            if (typeof first_name !== 'string' || first_name.trim() === '') {
                return res.status(400).json({ path: 'first_name', message: 'First name cannot be empty or null' });
            }
            updatedFields.first_name = first_name.trim();
        }

        // Middle name - can be null
        if (middle_name !== undefined) {
            if (middle_name !== null && typeof middle_name !== 'string') {
                return res.status(400).json({ path: 'middle_name', message: 'Middle name must be a string or null' });
            }
            updatedFields.middle_name = middle_name === null ? null : middle_name.trim();
        }

        // Last name - can be null
        if (last_name !== undefined) {
            if (last_name !== null && typeof last_name !== 'string') {
                return res.status(400).json({ path: 'last_name', message: 'Last name must be a string or null' });
            }
            updatedFields.last_name = last_name === null ? null : last_name.trim();
        }

        // Email - cannot be null
        if (email !== undefined) {
            if (typeof email !== 'string' || !validator.isEmail(email)) {
                return res.status(400).json({ path: 'email', message: 'Invalid email format or empty' });
            }
            const existingEmailUser = await userModel.findUserByEmail(email.toLowerCase());
            if (existingEmailUser && existingEmailUser.id !== userId) {
                return res.status(409).json({ path: 'email', message: 'Email already in use by another user' });
            }
            updatedFields.email = email.toLowerCase();
        }

        // Date of birth - can be null
        if (dob !== undefined) {
            if (dob !== null) {
                const date = new Date(dob);
                if (isNaN(date.getTime())) {
                    return res.status(400).json({ path: 'dob', message: 'Invalid date format (use YYYY-MM-DD)' });
                }
                updatedFields.dob = dob;
            } else {
                updatedFields.dob = null;
            }
        }

        // Address - can be null
        if (address !== undefined) {
            if (address !== null && typeof address !== 'string') {
                return res.status(400).json({ path: 'address', message: 'Address must be a string or null' });
            }
            updatedFields.address = address === null ? null : address.trim();
        }

        // Status - keep original validation
        if (status !== undefined) {
            if (!['active', 'blocked'].includes(status.toLowerCase())) {
                return res.status(400).json({ path: 'status', message: 'Status must be either active or blocked' });
            }
            updatedFields.status = status.toLowerCase();
        }


        if (phone_numbers !== undefined) {
            if (!Array.isArray(phone_numbers)) {
                return res.status(400).json({ path: 'phone_numbers', message: 'Phone numbers must be an array' });
            }

            for (const num of phone_numbers) {
                // Skip empty numbers with ID (they will be deleted)
                if (num.id && (!num.phone_number || num.phone_number.trim() === "")) {
                    await userModel.deletePhoneNumbers(userId, [num.id]);
                    continue;
                }

                // Type checks
                if (typeof num.phone_number !== 'string') {
                    return res.status(400).json({ path: 'phone_number', message: 'Phone number must be a string' });
                }
                if (typeof num.country_code !== 'string') {
                    return res.status(400).json({ path: 'country_code', message: 'Country code must be a string' });
                }
                if (num.id !== undefined && typeof num.id !== 'number') {
                    return res.status(400).json({ path: 'id', message: 'Phone number id must be a number if provided' });
                }

                // Presence & format
                if (!num.phone_number.trim() || !num.country_code.trim()) {
                    return res.status(400).json({ path: 'phone_numbers', message: 'Phone number and country code required' });
                }
                if (!isValidPhoneNumber(num.phone_number)) {
                    return res.status(400).json({ path: 'phone_number', message: 'Invalid phone number format' });
                }
                if (!/^\+\d{1,4}$/.test(num.country_code)) {
                    return res.status(400).json({ path: 'country_code', message: 'Invalid country code format' });
                }

                // Duplicate check
                const isRegistered = await userModel.isPhoneNumberRegistered(num.country_code, num.phone_number);
                if (isRegistered && (!num.id || (num.id && num.id !== isRegistered.id))) {
                    return res.status(409).json({ path: 'phone_number', message: 'Phone number already registered' });
                }

                // Insert/update
                await userModel.upsertUserPhoneNumbers(userId, [num]);
            }
        }


        // ✅ Prevent empty update
        if (Object.keys(updatedFields).length === 0 && phone_numbers === undefined) {
            return res.status(400).json({ path: 'body', message: 'No valid fields provided for update' });
        }

        await userModel.updateUserById(userId, updatedFields);

        // ✅ Fetch the updated user with phones
        const updatedUser = await userModel.findUserByIdWithPhones(userId);

        return res.status(200).json({
            status: 'success',
            message: 'User updated successfully',
            data: updatedUser
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            path: 'server',
            message: 'Internal server error'
        });
    }
};


exports.deleteAnyUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const user = await userModel.findUserById(userId);
        if (!user) {
            return res.status(404).json({ path: 'id', message: 'User not found' });
        }

        await userModel.deleteUserById(userId);

        res.status(200).json({ status: 'success', message: 'User deleted successfully by admin' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};


exports.massDeleteAnyUsers = async (req, res) => {
    try {
        const { user_ids } = req.body;

        if (!Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({ path: 'user_ids', message: 'Array of user IDs is required' });
        }

        await userModel.massDeleteUsers(user_ids);

        res.status(200).json({ status: 'success', message: 'Users deleted successfully by admin' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};
