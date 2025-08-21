// routes/qrCodeRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const qrCodeController = require("../controllers/qrCodeController");

router.post("/create", authMiddleware, qrCodeController.createQRCode);
router.get("/get", authMiddleware, qrCodeController.getQRCodeByUser);

module.exports = router;
