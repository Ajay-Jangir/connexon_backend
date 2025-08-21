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

exports.createUser = async (req, res) => {
    try {
        const {
            first_name,
            middle_name,
            last_name,
            email,
            dob,
            address,
            password,
            phone_numbers
        } = req.body;

        const newUserFields = {};

        // ----- Field Validations -----
        if (!first_name || typeof first_name !== 'string' || first_name.trim() === '') {
            return res.status(400).json({ path: 'first_name', message: 'First name is required and cannot be empty' });
        }
        newUserFields.first_name = first_name.trim();

        if (middle_name !== undefined) {
            if (typeof middle_name !== 'string') {
                return res.status(400).json({ path: 'middle_name', message: 'Middle name must be a string' });
            }
            newUserFields.middle_name = middle_name.trim();
        }

        if (!last_name || typeof last_name !== 'string' || last_name.trim() === '') {
            return res.status(400).json({ path: 'last_name', message: 'Last name is required and cannot be empty' });
        }
        newUserFields.last_name = last_name.trim();

        if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
            return res.status(400).json({ path: 'email', message: 'Valid email is required' });
        }
        const existingEmailUser = await userModel.findUserByEmail(email.toLowerCase());
        if (existingEmailUser) {
            return res.status(409).json({ path: 'email', message: 'Email already in use' });
        }
        newUserFields.email = email.toLowerCase();

        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ path: 'password', message: 'Password is required and must be at least 6 characters' });
        }
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        newUserFields.password_hash = await bcrypt.hash(password, saltRounds);

        if (dob !== undefined) {
            const date = new Date(dob);
            if (isNaN(date.getTime())) {
                return res.status(400).json({ path: 'dob', message: 'Invalid date format (use YYYY-MM-DD)' });
            }
            newUserFields.dob = dob; // store as provided
        }

        if (address !== undefined) {
            if (typeof address !== 'string' || address.trim() === '') {
                return res.status(400).json({ path: 'address', message: 'Address must be a non-empty string' });
            }
            newUserFields.address = address.trim();
        }

        // ----- Insert User -----
        const insertedUser = await userModel.insertUser(newUserFields);

        // ----- Handle Phone Numbers -----
        if (phone_numbers !== undefined) {
            if (!Array.isArray(phone_numbers)) {
                return res.status(400).json({ path: 'phone_numbers', message: 'Phone numbers must be an array' });
            }

            for (const num of phone_numbers) {
                if (!num.phone_number || typeof num.phone_number !== 'string') {
                    return res.status(400).json({ path: 'phone_number', message: 'Each phone_number must be a non-empty string' });
                }
                if (num.country_code && typeof num.country_code !== 'string') {
                    return res.status(400).json({ path: 'country_code', message: 'Country code must be a string' });
                }
            }

            for (const num of phone_numbers) {
                await userModel.insertPhoneNumber(insertedUser.id, num.country_code || '+91', num.phone_number);
            }
        }

        const newUser = await userModel.findUserByIdWithPhones(insertedUser.id);

        return res.status(201).json({
            status: 'success',
            message: 'User created successfully by admin',
            data: newUser
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ path: 'server', message: 'Internal server error' });
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
        } = req.body;

        const user = await userModel.findUserById(userId);
        if (!user) {
            return res.status(404).json({ path: 'id', message: 'User not found' });
        }

        const updatedFields = {};

        if (first_name !== undefined) {
            if (typeof first_name !== 'string' || first_name.trim() === '') {
                return res.status(400).json({ path: 'first_name', message: 'First name cannot be empty' });
            }
            updatedFields.first_name = first_name.trim();
        }

        if (middle_name !== undefined) {
            if (typeof middle_name !== 'string' || middle_name.trim() === '') {
                return res.status(400).json({ path: 'middle_name', message: 'Middle name cannot be empty' });
            }
            updatedFields.middle_name = middle_name.trim();
        }

        if (last_name !== undefined) {
            if (typeof last_name !== 'string' || last_name.trim() === '') {
                return res.status(400).json({ path: 'last_name', message: 'Last name cannot be empty' });
            }
            updatedFields.last_name = last_name.trim();
        }

        if (email !== undefined) {
            if (typeof email !== 'string' || !validator.isEmail(email)) {
                return res.status(400).json({ path: 'email', message: 'Invalid email format' });
            }
            const existingEmailUser = await userModel.findUserByEmail(email.toLowerCase());
            if (existingEmailUser && existingEmailUser.id !== userId) {
                return res.status(409).json({ path: 'email', message: 'Email already in use by another user' });
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


        // Handle phone numbers
        if (phone_numbers !== undefined) {
            if (!Array.isArray(phone_numbers)) {
                return res.status(400).json({ path: 'phone_numbers', message: 'Phone numbers must be an array' });
            }
            for (const num of phone_numbers) {
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
            await userModel.upsertUserPhoneNumbers(userId, phone_numbers);
            const keepIds = phone_numbers.filter(p => p.id).map(p => p.id);
            await userModel.deletePhoneNumbers(userId, keepIds);
        }

        if (Object.keys(updatedFields).length === 0 && phone_numbers === undefined) {
            return res.status(400).json({ path: 'body', message: 'No valid fields provided for update' });
        }

        await userModel.updateUserById(userId, updatedFields);
        const updatedUser = await userModel.findUserByIdWithPhones(userId);

        return res.status(200).json({
            status: 'success',
            message: 'User updated successfully by admin',
            data: updatedUser
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ path: 'server', message: 'Internal server error' });
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
