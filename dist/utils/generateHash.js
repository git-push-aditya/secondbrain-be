"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHash = void 0;
const generateHash = () => {
    return Buffer.from(Date.now().toString()).toString("base64");
};
exports.generateHash = generateHash;
