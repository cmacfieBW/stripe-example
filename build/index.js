"use strict";
// Server code from https://github.com/stripe-samples/accept-a-card-payment/tree/master/using-webhooks/server/node-typescript
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = __importDefault(require("dotenv"));
var body_parser_1 = __importDefault(require("body-parser"));
var express_1 = __importDefault(require("express"));
var stripe_1 = __importDefault(require("stripe"));
// Replace if using a different env file or config.
dotenv_1.default.config({ path: './.env' });
// Server code from https://github.com/stripe-samples/accept-a-card-payment/tree/master/using-webhooks/server/node-typescript
var stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
var stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
var stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
var app = express_1.default();
app.use(function (req, res, next) {
    // This is to allow local web demo to call local backend
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.originalUrl === '/webhook') {
        next();
    }
    else {
        /* @ts-ignore */
        body_parser_1.default.json()(req, res, next);
    }
});
function getKeys(payment_method) {
    var secret_key = stripeSecretKey;
    var publishable_key = stripePublishableKey;
    switch (payment_method) {
        case 'grabpay':
        case 'fpx':
            publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_MY;
            secret_key = process.env.STRIPE_SECRET_KEY_MY;
            break;
        case 'au_becs_debit':
            publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_AU;
            secret_key = process.env.STRIPE_SECRET_KEY_AU;
            break;
        case 'oxxo':
            publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_MX;
            secret_key = process.env.STRIPE_SECRET_KEY_MX;
            break;
        case 'wechat_pay':
            publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_WECHAT;
            secret_key = process.env.STRIPE_SECRET_KEY_WECHAT;
            break;
        default:
            publishable_key = process.env.STRIPE_PUBLISHABLE_KEY;
            secret_key = process.env.STRIPE_SECRET_KEY;
    }
    return { secret_key: secret_key, publishable_key: publishable_key };
}
/***
 * Creates or fetches a customer with the firebase ID that the customer has
 * @param stripe
 * @param email
 * @param firebaseId
 */
function getOrCreateCustomer(stripe, email, firebaseId) {
    return __awaiter(this, void 0, void 0, function () {
        var searchRes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stripe.customers.search({ query: "metadata['firebaseId']:'" + firebaseId + "'" })];
                case 1:
                    searchRes = _a.sent();
                    if (searchRes && searchRes.data && searchRes.data.length > 0) {
                        return [2 /*return*/, searchRes.data[0]];
                    }
                    return [4 /*yield*/, stripe.customers.create({
                            email: email,
                            metadata: {
                                'firebaseId': firebaseId
                            }
                        })];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/***
 * Payment sheet
 * For Google Pay
 * For Apple Pay
 */
app.post('/create-payment-intent', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, currency, amount, firebaseId, request_three_d_secure, _b, payment_method_types, _c, client, secret_key, stripe, customer, params, paymentIntent, error_1;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.body, email = _a.email, currency = _a.currency, amount = _a.amount, firebaseId = _a.firebaseId, request_three_d_secure = _a.request_three_d_secure, _b = _a.payment_method_types, payment_method_types = _b === void 0 ? [] : _b, _c = _a.client, client = _c === void 0 ? 'ios' : _c;
                secret_key = getKeys(payment_method_types[0]).secret_key;
                stripe = new stripe_1.default(secret_key, {
                    apiVersion: '2022-08-01',
                    typescript: true,
                });
                return [4 /*yield*/, getOrCreateCustomer(stripe, email, firebaseId)];
            case 1:
                customer = _d.sent();
                params = {
                    amount: amount,
                    currency: currency,
                    customer: customer.id,
                    payment_method_options: {
                        card: {
                            request_three_d_secure: request_three_d_secure || 'automatic',
                        },
                        sofort: {
                            preferred_language: 'en',
                        },
                        wechat_pay: {
                            app_id: 'wx65907d6307c3827d',
                            client: client,
                        },
                    },
                    payment_method_types: payment_method_types,
                };
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                return [4 /*yield*/, stripe.paymentIntents.create(params)];
            case 3:
                paymentIntent = _d.sent();
                // Send publishable key and PaymentIntent client_secret to client.
                return [2 /*return*/, res.send({
                        clientSecret: paymentIntent.client_secret,
                    })];
            case 4:
                error_1 = _d.sent();
                return [2 /*return*/, res.send({
                        error: error_1.raw.message,
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Subscription card
 */
app.post('/create-checkout-session-card-subscription', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, priceId, email, firebaseId, secret_key, stripe, customer, session;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, priceId = _a.priceId, email = _a.email, firebaseId = _a.firebaseId;
                secret_key = getKeys().secret_key;
                stripe = new stripe_1.default(secret_key, {
                    apiVersion: '2022-08-01',
                    typescript: true,
                });
                return [4 /*yield*/, getOrCreateCustomer(stripe, email, firebaseId)];
            case 1:
                customer = _b.sent();
                return [4 /*yield*/, stripe.checkout.sessions.create({
                        payment_method_types: ["card"],
                        customer: customer.id,
                        line_items: [
                            {
                                price: priceId,
                                quantity: 1,
                            },
                        ],
                        mode: 'subscription',
                        success_url: "https://checkout.stripe.dev/success",
                        cancel_url: "https://checkout.stripe.dev/cancel",
                    })];
            case 2:
                session = _b.sent();
                return [2 /*return*/, res.json({ id: session.id })];
        }
    });
}); });
/***
 * Payment card
 */
app.post('/create-checkout-session-card', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, amount, name, image, email, firebaseId, secret_key, stripe, customer, session;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log("Called /create-checkout-session-card");
                _a = req.body, amount = _a.amount, name = _a.name, image = _a.image, email = _a.email, firebaseId = _a.firebaseId;
                secret_key = getKeys().secret_key;
                stripe = new stripe_1.default(secret_key, {
                    apiVersion: '2022-08-01',
                    typescript: true,
                });
                return [4 /*yield*/, getOrCreateCustomer(stripe, email, firebaseId)];
            case 1:
                customer = _b.sent();
                return [4 /*yield*/, stripe.checkout.sessions.create({
                        payment_method_types: ["card"],
                        customer: customer.id,
                        line_items: [
                            {
                                price_data: {
                                    currency: 'sek',
                                    product_data: {
                                        name: name,
                                        images: image != null ? [image] : undefined,
                                    },
                                    unit_amount: amount,
                                },
                                quantity: 1,
                            },
                        ],
                        submit_type: 'donate',
                        mode: 'payment',
                        success_url: "https://checkout.stripe.dev/success",
                        cancel_url: "https://checkout.stripe.dev/cancel",
                    })];
            case 2:
                session = _b.sent();
                return [2 /*return*/, res.json({ id: session.id })];
        }
    });
}); });
/**
 * Payment Klarna
 */
app.post('/create-checkout-session-klarna', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, amount, name, image, email, firebaseId, secret_key, stripe, customer, session;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log("Called /create-checkout-session");
                _a = req.body, amount = _a.amount, name = _a.name, image = _a.image, email = _a.email, firebaseId = _a.firebaseId;
                secret_key = getKeys().secret_key;
                stripe = new stripe_1.default(secret_key, {
                    apiVersion: '2022-08-01',
                    typescript: true,
                });
                return [4 /*yield*/, getOrCreateCustomer(stripe, email, firebaseId)];
            case 1:
                customer = _b.sent();
                return [4 /*yield*/, stripe.checkout.sessions.create({
                        payment_method_types: ['klarna'],
                        customer: customer.id,
                        line_items: [
                            {
                                price_data: {
                                    currency: 'sek',
                                    product_data: {
                                        name: name,
                                        images: image != null ? [image] : undefined,
                                    },
                                    unit_amount: amount,
                                },
                                quantity: 1,
                            },
                        ],
                        mode: 'payment',
                        success_url: "https://checkout.stripe.dev/success",
                        cancel_url: "https://checkout.stripe.dev/cancel",
                    })];
            case 2:
                session = _b.sent();
                return [2 /*return*/, res.json({ id: session.id })];
        }
    });
}); });
app.listen(4242, function () {
    return console.log("Node server listening on port " + 4242 + "!");
});
