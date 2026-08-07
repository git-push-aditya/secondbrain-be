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
var _a;
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
const prismaClient_1 = __importDefault(require("./prismaClient"));
dotenv_1.default.config();
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    yield prismaClient_1.default.$disconnect();
    console.log("signing off");
    process.exit(0);
}));
const app = (0, express_1.default)();
const allowedOrigins = [
    'http://localhost:5173',
    'https://secondbrain.notaditya.dev',
    ...(((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',').map(origin => origin.trim()).filter(Boolean)) || [])
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    maxAge: 86400,
}));
app.use((0, helmet_1.default)());
//no auth/DB work here on purpose - the frontend pings this on load to wake a sleeping Render dyno before the user reaches an actual request
app.get('/health', (_req, res) => {
    res.status(200).send('ok');
});
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use('/auth', authRoutes_1.default);
app.use('/user', userRoutes_1.default);
app.get('/me', zodMiddleware_1.meZod, jwstAuth_1.default, me_1.restoreMe);
const startServer = () => {
    const port = process.env.PORT || 2233;
    app.listen(port, () => {
        console.log(`Server started at port ${port}`);
    });
};
startServer();
require("./jobs/cleanUnusedtags");
