exports.isValidPhoneNumber = (phone) => {

    // Remove spaces, dashes, dots, and parentheses
    const cleaned = phone.replace(/[\s-.()]/g, '');

    // Must contain only digits, length between 5 and 15
    return /^\d{5,15}$/.test(cleaned);
};

exports.isStrongPassword = (password) => {
    return password.length >= 8;
};
