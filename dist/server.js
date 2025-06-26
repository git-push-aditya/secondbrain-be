"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const zodMiddleware_1 = require("./middlewares/zodMiddleware");
const jwstAuth_1 = __importDefault(require("./middlewares/jwstAuth"));
const me_1 = require("./controllers/me");
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("redis");
dotenv_1.default.config();
const redisClient = (0, redis_1.createClient)();
redisClient.on('error', (err) => {
    console.error('redis client error : ', err);
});
redisClient.on('reconnecting', () => {
    console.warn('Reconnecting to Redis...');
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use('/auth', authRoutes_1.default);
app.use('/user', userRoutes_1.default);
app.get('/me', zodMiddleware_1.meZod, jwstAuth_1.default, me_1.restoreMe);
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield redisClient.connect();
        console.log('successfully connected to redis client');
        app.listen(2233, () => {
            console.log("Server started at port 2233");
        });
    }
    catch (e) {
        console.error('something happened :', e);
    }
});
startServer();
require("./jobs/cleanUnusedtags");
exports.default = redisClient;
