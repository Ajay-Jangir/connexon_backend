exports.isValidPhoneNumber = (phone) => {
    return /^\+?[0-9]{10,15}$/.test(phone);
};

exports.isStrongPassword = (password) => {
    return password.length >= 8;
};
