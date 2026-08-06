"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.client = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : new client_1.PrismaClient({
    log: ["error"],
});
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.client;
}
exports.default = exports.client;
