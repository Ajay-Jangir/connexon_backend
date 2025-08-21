const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN || '10h';

exports.generateToken = (payload) => {
    return jwt.sign(payload, secret, { expiresIn });
};

exports.verifyToken = (token) => {
    return jwt.verify(token, secret);
};
