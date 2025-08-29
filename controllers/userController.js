const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { isValidPhoneNumber, isStrongPassword } = require('../utils/validate');
const { generateToken } = require('../utils/jwt');
const jwt = require('jsonwebtoken');
const validator = require('validator');


exports.registerUser = async (req, res) => {
    try {
        let {
            first_name, middle_name, last_name,
            email, password, dob, address,
            phone_numbers
        } = req.body;

        // Trim inputs
        first_name = first_name?.trim();
        middle_name = middle_name?.trim() || null;
        last_name = last_name?.trim() || null;
        email = email?.trim().toLowerCase();
        address = address?.trim() || null;

        // Validate required fields
        if (!first_name || !email || !password || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
            return res.status(400).json({ path: 'body', message: 'Required fields missing' });
        }

        // Validate password
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                path: 'password',
                message: 'Password must be at least 8 characters long'
            });
        }

        // Check if email exists
        const existing = await userModel.findUserByEmail(email);
        if (existing) {
            return res.status(409).json({ path: 'email', message: 'Email already registered' });
        }

        // Validate all phone numbers
        for (const { phone_number, country_code } of phone_numbers) {
            if (!phone_number || !country_code) {
                return res.status(400).json({ path: 'phone_numbers', message: 'Phone number and country code required' });
            }

            if (!isValidPhoneNumber(phone_number)) {
                return res.status(400).json({ path: 'phone_number', message: `Invalid phone number: ${phone_number}` });
            }

            if (!/^\+\d{1,4}$/.test(country_code)) {
                return res.status(400).json({ path: 'country_code', message: `Invalid country code: ${country_code}` });
            }

            const phoneExists = await userModel.isPhoneNumberRegistered(phone_number);
            if (phoneExists) {
                return res.status(409).json({ path: 'phone_number', message: `Phone number already registered: ${phone_number}` });
            }
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const userId = await userModel.insertUser({
            first_name, middle_name, last_name,
            email, password_hash, dob, address
        });

        // Insert each phone number
        for (const { phone_number, country_code } of phone_numbers) {
            await userModel.insertPhoneNumber(userId.id, country_code, phone_number);
        }

        // Success
        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            user_id: userId.id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ path: 'server', message: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email });

    res.status(200).json({
        status: 'success',
        message: 'Login successful',
        token
    });
};


exports.updateUser = async (req, res) => {
    try {
        // Authorization header validation
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ path: 'auth', message: 'Authorization token missing or invalid' });
        }

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ path: 'auth', message: 'Invalid or expired token' });
        }

        const userId = decoded.id;

        // Check body is present
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ path: 'body', message: 'Missing request body' });
        }

        const {
            first_name,
            middle_name,
            last_name,
            email,
            dob,
            address,
            phone_numbers
        } = req.body;

        const user = await userModel.findUserById(userId);
        if (!user) {
            return res.status(404).json({ path: 'id', message: 'User not found' });
        }

        const updatedFields = {};

        if (first_name !== undefined) {
            if (typeof first_name !== 'string' || first_name.trim() === '') {
                return res.status(400).json({ path: 'first_name', message: 'First name must be a non-empty string' });
            }
            updatedFields.first_name = first_name.trim();
        }

        if (middle_name !== undefined) {
            if (typeof middle_name !== 'string') {
                return res.status(400).json({ path: 'middle_name', message: 'Middle name must be a string' });
            }
            updatedFields.middle_name = middle_name.trim();
        }

        if (last_name !== undefined) {
            if (typeof last_name !== 'string' || last_name.trim() === '') {
                return res.status(400).json({ path: 'last_name', message: 'Last name must be a non-empty string' });
            }
            updatedFields.last_name = last_name.trim();
        }

        if (email !== undefined) {
            if (typeof email !== 'string' || !validator.isEmail(email)) {
                return res.status(400).json({ path: 'email', message: 'Invalid email format' });
            }
            updatedFields.email = email.toLowerCase();
        }

        if (dob !== undefined) {
            const date = new Date(dob);
            if (isNaN(date.getTime())) {
                return res.status(400).json({ path: 'dob', message: 'Invalid date format (use YYYY-MM-DD)' });
            }
            updatedFields.dob = dob;
        }

        if (address !== undefined) {
            if (typeof address !== 'string' || address.trim() === '') {
                return res.status(400).json({ path: 'address', message: 'Address must be a non-empty string' });
            }
            updatedFields.address = address.trim();
        }

        // ✅ Validate phone_numbers
        if (phone_numbers !== undefined) {
            if (!Array.isArray(phone_numbers)) {
                return res.status(400).json({ path: 'phone_numbers', message: 'Phone numbers must be an array' });
            }

            for (const num of phone_numbers) {
                if (num.id && (!num.phone_number || num.phone_number.trim() === "")) {
                    // skip validation here because it's a delete request
                    continue;
                }
                if (!num.phone_number || typeof num.phone_number !== 'string') {
                    return res.status(400).json({ path: 'phone_number', message: 'Each phone_number must be a non-empty string' });
                }
                if (num.country_code && typeof num.country_code !== 'string') {
                    return res.status(400).json({ path: 'country_code', message: 'Country code must be a string' });
                }
                if (num.id && typeof num.id !== 'number') {
                    return res.status(400).json({ path: 'id', message: 'Phone number id must be a number if provided' });
                }
            }
        }

        // ✅ Handle phone numbers (insert/update/delete specific only)
        if (phone_numbers !== undefined) {
            for (const num of phone_numbers) {
                if (num.id && (!num.phone_number || num.phone_number.trim() === "")) {
                    // explicit delete
                    await userModel.deletePhoneNumbers(userId, [num.id]);
                } else {
                    // insert/update
                    await userModel.upsertUserPhoneNumbers(userId, [num]);
                }
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




exports.getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await userModel.getUserById(userId);
        if (!user) {
            return res.status(404).json({ path: 'user', message: 'User not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'User profile fetched successfully',
            data: user
        });
    } catch (error) {
        console.error('Error in getMyProfile:', error);
        return res.status(500).json({ path: 'internal', message: 'Server error' });
    }
};
