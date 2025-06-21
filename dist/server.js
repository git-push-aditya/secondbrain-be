"use strict";
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
dotenv_1.default.config();
const app = (0, express_1.default)();
//create a new endpoint in users route such that tagged content are fetched only if a the content is tagged with all the mentioned tags    //i think the union field is for that in the tagged content endpoint
//our current sharable brain does is it shares the whole brain;but what if user only want to create a brain with all the relevent links and share it(i.e selected subset// a small mini brain there for sharing and not the whole brain// kinda like publishing a chapter and not hte whole book)
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
app.listen(2233, () => {
    console.log("Server started at port 2233");
});
require("./jobs/cleanUnusedtags");
