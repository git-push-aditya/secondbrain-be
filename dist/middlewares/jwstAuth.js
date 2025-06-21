"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const handleErrors_1 = __importDefault(require("../utils/handleErrors"));
const secret = process.env.JWT_SECRET;
const verifyJwt = (req, res, next) => {
    const token = req.cookies['token'];
    try {
        const verify = jsonwebtoken_1.default.verify(token, secret);
        if (verify.userId) {
            req.body.userId = verify.userId;
            next();
        }
        else {
            res.status(400).json({
                message: "Invalid jwt token"
            });
            return;
        }
    }
    catch (e) {
        (0, handleErrors_1.default)(e, res);
        return;
    }
};
exports.default = verifyJwt;
