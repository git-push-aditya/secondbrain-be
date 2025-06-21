"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateToken = (payload) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.log("seceret doenst exist");
        throw new Error("JWT secret is not defined.");
    }
    const token = jsonwebtoken_1.default.sign(payload, secret);
    return token;
};
exports.generateToken = generateToken;
