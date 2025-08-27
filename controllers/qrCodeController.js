const qrCodeModel = require('../models/qrCodeModel');
const QRCode = require("qrcode");

// 📌 Create QR Code
exports.createQRCode = async (req, res) => {
    try {
        const user_id = req.user.id;

        // 🔍 Fetch user
        const user = await qrCodeModel.getUserById(user_id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const qrCode = await qrCodeModel.getActiveQRCodeByUserId(user_id);

        // ❌ Blocked/deleted users OR qr_blocked cannot generate QR codes
        if (user.status !== 'active' || (qrCode && qrCode.qr_disabled_by_admin === true)) {
            return res.status(403).json({
                message: 'User is not allowed to generate QR codes'
            });
        }

        // 🔍 Check active membership plan
        const plan = await qrCodeModel.getActivePlanByUserId(user_id);
        if (!plan) {
            await qrCodeModel.deactivateAllQRCodesForUser(user_id);
            return res.status(403).json({
                message: 'No active membership plan found'
            });
        }

        // 🧑 Build Full Name
        // const fullName = [user.first_name, user.middle_name, user.last_name]
        //     .filter(Boolean)
        //     .join('\u00A0');

        // 📞 Phone numbers
        const telLines = (user.phone_numbers || [])
            .filter(p => p.phone_number)
            .map(p => {
                const number = `${p.country_code || ''}${p.phone_number}`.replace(/\s+/g, '');
                return `TEL;TYPE=CELL:${number}`;
            })
            .join('\r\n');

        // 🎂 DOB
        const dobLine = user.dob ? `BDAY:${new Date(user.dob).toISOString().split('T')[0]}` : '';

        // 📧 Email
        const emailLine = user.email ? `EMAIL;TYPE=WORK:${user.email}` : '';

        // 🏠 Address
        const addressLine = user.address ? `ADR:;;${user.address};;;;` : '';

        // 🏢 Organization
        const orgLine = user.organization ? `ORG:${user.organization}` : '';

        // 🧑‍💼 Job Title
        const titleLine = user.job_title ? `TITLE:${user.job_title}` : '';

        // 🌐 Website
        const urlLine = user.website ? `URL:${user.website}` : '';

        // 🕒 Last updated
        const revLine = `REV:${new Date().toISOString()}`;

        // // 📇 Build vCard
        // const vcardLines = [
        //     'BEGIN:VCARD',
        //     'VERSION:3.0',
        //     `N:${user.last_name || ''};${user.first_name || ''};${user.middle_name || ''};;;`,
        //     `FN:${fullName}`,
        //     telLines,
        //     emailLine,
        //     dobLine,
        //     addressLine,
        //     orgLine,
        //     titleLine,
        //     urlLine,
        //     revLine,
        //     'NOTE:Scanned from Connexon QR Code',
        //     'END:VCARD'
        // ].filter(Boolean);

        // const vcardText = vcardLines.join('\r\n');


        // Build full name for display/storage
        const firstNameCombined = [user.first_name, user.middle_name]
            .filter(Boolean)
            .join(' '); // combine first + middle
        const surname = user.last_name || ''; // keep last name separately

        // Full Name for vCard display
        const fullName = [firstNameCombined, surname]
            .filter(Boolean)
            .join('\u00A0');

        // Build vCard
        const vcardLines = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `N:${surname};${firstNameCombined};;;`, // surname first, then first+middle
            `FN:${fullName}`,
            telLines,
            emailLine,
            dobLine,
            addressLine,
            orgLine,
            titleLine,
            urlLine,
            revLine,
            'NOTE:Scanned from Connexon QR Code',
            'END:VCARD'
        ].filter(Boolean);

        const vcardText = vcardLines.join('\r\n');


        // ✅ Generate QR Code (Base64 Data URL)
        const qrDataUrl = await QRCode.toDataURL(vcardText, { errorCorrectionLevel: 'H' });

        // 💾 Save new QR code
        await qrCodeModel.insertQRCode({
            user_id,
            qr_code_data: qrDataUrl,
            vcard: vcardText
        });

        // 🔁 Delete old QR codes AFTER successful insertion
        await qrCodeModel.deleteOldQRCodes(user_id, newQRCode.id);

        return res.status(201).json({
            status: 'success',
            message: 'QR code created successfully',
            // data: {
            //     user_id,
            //     qr_code_data: qrDataUrl,
            //     vcard: vcardText
            // }
        });

    } catch (err) {
        console.error('QR code creation error:', err.message);
        const statusCode = err.message.includes('blocked') ? 403 : 500;

        return res.status(statusCode).json({
            message: err.message || 'Internal server error'
        });
    }

};


// 📌 Get User QR Code
exports.getQRCodeByUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await qrCodeModel.getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.status !== 'active') {
            await qrCodeModel.deactivateAllQRCodesForUser(userId);
            return res.status(403).json({
                message: 'QR code is disabled for this user'
            });
        }

        // 🔍 Validate plan
        const plan = await qrCodeModel.getActivePlanByUserId(userId);
        if (!plan) {
            await qrCodeModel.deactivateAllQRCodesForUser(userId);
            return res.status(403).json({
                message: 'QR code is disabled because the plan is expired or missing'
            });
        }

        const qrCode = await qrCodeModel.getActiveQRCodeByUserId(userId);
        if (!qrCode || qrCode.is_active === false || qrCode.qr_disabled_by_admin === true) {
            return res.status(404).json({
                message: 'QR code not found, inactive, or disabled by admin'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'QR code fetched successfully',
            data: qrCode
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


// 📌 Deactivate QR Code
exports.toggleAllQRCodesByAdmin = async (req, res) => {
    try {
        const userId = req.params.id;
        const { qr_disabled_by_admin } = req.body;

        // Validate
        if (typeof qr_disabled_by_admin !== 'boolean') {
            return res.status(400).json({
                path: 'qr_disabled_by_admin',
                message: 'qr_disabled_by_admin must be a boolean (true or false)',
            });
        }

        // Update all QR codes for this user
        const updatedQRs = await qrCodeModel.disableQRCodesByAdmin(qrCode.user_id, qr_disabled_by_admin);

        if (!updatedQRs || updatedQRs.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: qr_disabled_by_admin
                    ? 'No active QR codes were found for this user to deactivate'
                    : 'No QR codes were found for this user to reactivate',
                data: [],
            });
        }

        res.status(200).json({
            status: 'success',
            message: qr_disabled_by_admin
                ? 'All QR codes for the user deactivated by admin successfully'
                : 'All QR codes for the user reactivated by admin successfully',
            data: updatedQRs,
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};




