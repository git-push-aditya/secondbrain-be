"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodCreateCollection = exports.zodTaggedContent = exports.zodSharableLink = exports.zodDeleteContent = exports.zodAddContent = exports.zodSharedContent = exports.zodFetchContent = exports.meZod = exports.signInUpZodMiddleware = void 0;
const zod_1 = require("zod");
const requiredCookie = zod_1.z.object({
    token: zod_1.z
        .string()
        .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/, {
        message: "Invalid JWT format",
    }),
}).passthrough();
const signInUpZodMiddleware = (req, res, next) => {
    var _a;
    const requiredBody = zod_1.z.object({
        userName: zod_1.z.string().min(5),
        rememberMe: zod_1.z.boolean(),
        email: zod_1.z.string().email().optional(),
        password: zod_1.z.string().min(8).max(15).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()|\[\]{}:])/, { message: 'Password must contain at least one lowercase, one upper case and 1 special character.' })
    });
    const parsedObejct = requiredBody.safeParse(req.body);
    if (!parsedObejct.success) {
        console.log("Incorrect format of input object", req.body, (_a = parsedObejct.error) === null || _a === void 0 ? void 0 : _a.format());
        res.status(401).json({
            status: "failure",
            payload: {
                message: "Incorrect format of username/password/email"
            }
        });
        return;
    }
    next();
};
exports.signInUpZodMiddleware = signInUpZodMiddleware;
const meZod = (req, res, next) => {
    const cookieCheck = requiredCookie.safeParse(req.cookies);
    if (cookieCheck.success) {
        next();
    }
    else {
        res.status(400).json({
            status: "failure",
            payload: {
                message: "unAuthorized access; login or re-login"
            }
        });
    }
};
exports.meZod = meZod;
const zodFetchContent = (req, res, next) => {
    const cookieCheck = requiredCookie.safeParse(req.cookies);
    const requiredQuery = zod_1.z.object({
        collectionId: zod_1.z.coerce.number(),
        page: zod_1.z.coerce.number(),
        limit: zod_1.z.coerce.number()
    });
    const bodyCheck = requiredQuery.safeParse(req.query);
    if (cookieCheck.success && bodyCheck.success) {
        next();
    }
    else {
        res.status(400).json({
            status: "failure",
            payload: {
                message: "unAuthorized access; login or re-login"
            }
        });
    }
};
exports.zodFetchContent = zodFetchContent;
const zodSharedContent = (req, res, next) => {
    const requiredQuery = zod_1.z.object({
        page: zod_1.z.coerce.number(),
        limit: zod_1.z.coerce.number(),
        hash: zod_1.z.string()
    });
    const queryCheck = requiredQuery.safeParse(req.query);
    if (queryCheck.success) {
        next();
    }
    else {
        res.status(400).json({
            status: "failure",
            payload: {
                message: "unAuthorized access; login or re-login"
            }
        });
    }
};
exports.zodSharedContent = zodSharedContent;
const zodAddContent = (req, res, next) => {
    var _a, _b;
    const requiredBody = zod_1.z.object({
        title: zod_1.z.string().max(200, { message: "Maximum 200 characters are allowed" }),
        hyperlink: zod_1.z.string().url({ message: "Invalid url format" }),
        note: zod_1.z.string().max(600, { message: 'no more than 600 characters a re allowed' }).optional(),
        type: zod_1.z.enum(['WEB', 'YOUTUBE', 'REDDIT', 'TWITTER', 'INSTAGRAM']),
        existingTags: zod_1.z.string().array(),
        newTags: zod_1.z.string().array(),
        collectionId: zod_1.z.number()
    });
    const bodyCheck = requiredBody.safeParse(req.body);
    const cookieCheck = requiredCookie.safeParse(req.cookies);
    if (bodyCheck.success && cookieCheck.success) {
        next();
    }
    else {
        if (!bodyCheck.success) {
            console.log("Body Errors:", (_a = bodyCheck.error) === null || _a === void 0 ? void 0 : _a.format());
        }
        if (!cookieCheck.success) {
            console.log("Header error : ", (_b = cookieCheck.error) === null || _b === void 0 ? void 0 : _b.format());
        }
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Bad request; Invalid format"
            }
        });
    }
    return;
};
exports.zodAddContent = zodAddContent;
const zodDeleteContent = (req, res, next) => {
    var _a, _b;
    const requiredBody = zod_1.z.object({
        contentId: zod_1.z.number({ message: "Invalid contentId format" })
    });
    const bodyCheck = requiredBody.safeParse(req.body);
    const cookieCheck = requiredCookie.safeParse(req.cookies);
    if (bodyCheck.success && cookieCheck.success) {
        next();
    }
    else {
        if (!bodyCheck.success) {
            console.log("Body Errors : ", (_a = bodyCheck.error) === null || _a === void 0 ? void 0 : _a.format());
        }
        if (!cookieCheck.success) {
            console.log("Header error : ", (_b = cookieCheck.error) === null || _b === void 0 ? void 0 : _b.format());
        }
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Bad request; Invalid format"
            }
        });
    }
    return;
};
exports.zodDeleteContent = zodDeleteContent;
//note: no need to have jwt or verified to access someone elses shared content
//accessing shared content is not a secure route
const zodSharableLink = (req, res, next) => {
    var _a;
    const validationSchema = zod_1.z.object({
        id: zod_1.z.string().nonempty().min(8, { message: "Sharable link (id) is missing or empty" })
    });
    const result = validationSchema.safeParse({ id: req.query.id });
    if (!result.success) {
        const error = result.error.issues[0];
        console.log("something happened : ", (_a = result.error) === null || _a === void 0 ? void 0 : _a.format());
        res.status(400).json({
            status: "failure",
            payload: {
                message: error.message
            }
        });
        return;
    }
    next();
};
exports.zodSharableLink = zodSharableLink;
const zodTaggedContent = (req, res, next) => {
    var _a, _b;
    const validationSchema = zod_1.z.object({
        tags: zod_1.z.string().array().nonempty({ message: "No tag passed" }),
        union: zod_1.z.boolean()
    });
    const cookieCheck = requiredCookie.safeParse(req.cookies);
    const check = validationSchema.safeParse({
        tags: req.body.tags,
        union: req.body.union
    });
    if (!check.success || !cookieCheck.success) {
        console.log("Error in tags or jwt: ", (_a = check.error) === null || _a === void 0 ? void 0 : _a.issues[0]);
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Invalid format of data passed",
                error: (_b = check.error) === null || _b === void 0 ? void 0 : _b.issues[0].message
            }
        });
        return;
    }
    next();
};
exports.zodTaggedContent = zodTaggedContent;
const zodCreateCollection = (req, res, next) => {
    const requiredBody = zod_1.z.object({
        collectionName: zod_1.z.string(),
        collectionDesc: zod_1.z.string()
    });
    const cookieCheck = requiredCookie.safeParse(req.cookies);
    const bodyCheck = requiredBody.safeParse(req.body);
    if (cookieCheck.success && bodyCheck.success) {
        next();
    }
    else if (!cookieCheck.success) {
        console.error("session logout");
        res.status(420).json({
            status: "failure",
            payload: {
                message: "Session timed out, re-login"
            }
        });
    }
    else {
        console.error("Passed parameters for collection creation is invalid");
        res.status(400).json({
            status: "failure",
            payload: {
                message: "Passed parameters for collection creation is invalid"
            }
        });
    }
};
exports.zodCreateCollection = zodCreateCollection;
//error code 420 for session logout, re-login
