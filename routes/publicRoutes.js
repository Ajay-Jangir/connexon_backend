// const express = require("express");
// const router = express.Router();
// const qrCodeModel = require("../models/qrCodeModel");

// // Web page shown after QR code scan
// router.get("/contact/:user_id", async (req, res) => {
//   const { user_id } = req.params;

//   const user = await qrCodeModel.getUserById(user_id);
//   if (!user || user.status !== "active") {
//     return res.status(403).send("User is blocked or not found");
//   }

//   const plan = await qrCodeModel.getActivePlanByUserId(user_id);
//   if (!plan) {
//     return res.status(403).send("Plan expired or not found");
//   }

//   const qrCode = await qrCodeModel.getActiveQRCodeByUserId(user_id);
//   if (!qrCode || !qrCode.is_active) {
//     return res.status(404).send("QR code not found or inactive");
//   }

//   const vcfLink = `/contact/vcf/${user_id}`;
//   res.send(`
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <title>Add to Contacts</title>
//       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//       <style>
//         body { font-family: sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
//         a {
//           display: inline-block;
//           margin-top: 20px;
//           padding: 14px 24px;
//           background: #007bff;
//           color: white;
//           text-decoration: none;
//           font-size: 18px;
//           border-radius: 8px;
//         }
//       </style>
//     </head>
//     <body>
//       <h2>Add ${user.first_name} to your contacts</h2>
//       <a href="${vcfLink}" target="_blank">Add to Contacts</a>
//     </body>
//     </html>
//   `);
// });

// // vCard (.vcf) generation route
// router.get("/contact/vcf/:user_id", async (req, res) => {
//   const { user_id } = req.params;

//   const user = await qrCodeModel.getUserById(user_id);
//   if (!user || user.status !== "active") {
//     return res.status(403).send("User not found or blocked");
//   }

//   const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
//   const telLines = (user.phone_numbers || [])
//     .filter(p => p.phone_number)
//     .map(p => `TEL;TYPE=CELL:${(p.country_code || "") + p.phone_number}`)
//     .join('\r\n');

//   const vcardLines = [
//     "BEGIN:VCARD",
//     "VERSION:3.0",
//     `N:${user.last_name || ''};${user.first_name || ''};${user.middle_name || ''};;`,
//     `FN:${fullName}`,
//     telLines,
//     user.email ? `EMAIL:${user.email}` : '',
//     user.dob ? `BDAY:${new Date(user.dob).toISOString().split("T")[0]}` : '',
//     user.address ? `ADR:;;${user.address};;;;` : '',
//     user.organization ? `ORG:${user.organization}` : '',
//     user.job_title ? `TITLE:${user.job_title}` : '',
//     user.website ? `URL:${user.website}` : '',
//     `REV:${new Date().toISOString()}`,
//     "END:VCARD"
//   ].filter(Boolean).join('\r\n');

//   res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
//   res.setHeader('Content-Disposition', 'inline; filename="contact.vcf"');
//   res.send(vcardLines);
// });

// module.exports = router;
