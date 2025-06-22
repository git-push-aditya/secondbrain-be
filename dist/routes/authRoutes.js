"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zodMiddleware_1 = require("../middlewares/zodMiddleware");
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
router.post('/signup', zodMiddleware_1.signInUpZodMiddleware, authController_1.signUp);
router.post('/signin', zodMiddleware_1.signInUpZodMiddleware, authController_1.signIn);
router.post('/logout', (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false, // or `isProd`
        sameSite: "strict",
        path: "/"
    });
    res.status(200).json({
        status: "success",
        payload: {
            message: "Logged out successfully"
        }
    });
});
exports.default = router;
