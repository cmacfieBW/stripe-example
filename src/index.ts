// Server code from https://github.com/stripe-samples/accept-a-card-payment/tree/master/using-webhooks/server/node-typescript

import env from 'dotenv';
import bodyParser from 'body-parser';
import express from 'express';

import Stripe from 'stripe';
import {generateResponse} from './utils';
// Replace if using a different env file or config.
env.config({path: './.env'});

// Server code from https://github.com/stripe-samples/accept-a-card-payment/tree/master/using-webhooks/server/node-typescript
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const app = express();

app.use(
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ): void => {
        // This is to allow local web demo to call local backend
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        if (req.originalUrl === '/webhook') {
            next();
        } else {
            /* @ts-ignore */
            bodyParser.json()(req, res, next);
        }
    }
);

function getKeys(payment_method?: string) {
    let secret_key: string | undefined = stripeSecretKey;
    let publishable_key: string | undefined = stripePublishableKey;

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

    return {secret_key, publishable_key};
}

/***
 * Creates or fetches a customer with the firebase ID that the customer has
 * @param stripe
 * @param email
 * @param firebaseId
 */
async function getOrCreateCustomer(stripe: Stripe, email: string, firebaseId: string): Promise<Stripe.Customer> {
    const searchRes = await stripe.customers.search({query: `metadata['firebaseId']:'${firebaseId}'`});
    if (searchRes && searchRes.data && searchRes.data.length > 0) {
        return searchRes.data[0];
    }
    return await stripe.customers.create({
        email: email,
        metadata: {
            'firebaseId': firebaseId
        }
    });
}


/***
 * Payment sheet
 * For Google Pay
 * For Apple Pay
 */
app.post(
    '/create-payment-intent',
    async (
        req: express.Request,
        res: express.Response
    ): Promise<express.Response<any>> => {
        const {
            email,
            currency,
            amount,
            firebaseId,
            request_three_d_secure,
            payment_method_types = [],
            client = 'ios',
        }: {
            email: string;
            currency: string;
            payment_method_types: string[];
            request_three_d_secure: 'any' | 'automatic';
            amount: number;
            firebaseId: string;
            client: 'ios' | 'android';
        } = req.body;

        const {secret_key} = getKeys(payment_method_types[0]);

        const stripe = new Stripe(secret_key as string, {
            apiVersion: '2022-08-01',
            typescript: true,
        });

        const customer = await getOrCreateCustomer(stripe, email, firebaseId);
        // Create a PaymentIntent with the order amount and currency.
        const params: Stripe.PaymentIntentCreateParams = {
            amount: amount,
            currency,
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

        try {
            const paymentIntent: Stripe.PaymentIntent =
                await stripe.paymentIntents.create(params);
            // Send publishable key and PaymentIntent client_secret to client.
            return res.send({
                clientSecret: paymentIntent.client_secret,
            });
        } catch (error: any) {
            return res.send({
                error: error.raw.message,
            });
        }
    }
);

/**
 * Subscription card
 */
app.post('/create-checkout-session-card-subscription', async (req, res) => {
    const {
        priceId,
        email,
        firebaseId,
    }: { priceId: string, email: string; firebaseId: string } = req.body;

    const {secret_key} = getKeys();

    const stripe = new Stripe(secret_key as string, {
        apiVersion: '2022-08-01',
        typescript: true,
    });

    const customer = await getOrCreateCustomer(stripe, email, firebaseId);

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer: customer.id,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `https://checkout.stripe.dev/success`,
        cancel_url: `https://checkout.stripe.dev/cancel`,

    });
    return res.json({id: session.id});
});

/***
 * Payment card
 */
app.post('/create-checkout-session-card', async (req, res) => {
    console.log(`Called /create-checkout-session-card`)
    const {
        amount,
        name,
        image,
        email,
        firebaseId
    }: { amount: number; name: string; image?: string; email: string; firebaseId: string; } = req.body;
    const {secret_key} = getKeys();

    const stripe = new Stripe(secret_key as string, {
        apiVersion: '2022-08-01',
        typescript: true,
    });

    const customer = await getOrCreateCustomer(stripe, email, firebaseId);

    const session = await stripe.checkout.sessions.create({
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
        success_url: `https://checkout.stripe.dev/success`,
        cancel_url: `https://checkout.stripe.dev/cancel`,

    });
    return res.json({id: session.id});
});

/**
 * Payment Klarna
 */
app.post('/create-checkout-session-klarna', async (req, res) => {
    console.log(`Called /create-checkout-session`)
    const {
        amount,
        name,
        image,
        email,
        firebaseId
    }: { port?: string; amount: number; name: string; image?: string; email: string; firebaseId: string; } = req.body;
    const {secret_key} = getKeys();

    const stripe = new Stripe(secret_key as string, {
        apiVersion: '2022-08-01',
        typescript: true,
    });

    const customer = await getOrCreateCustomer(stripe, email, firebaseId);

    const session = await stripe.checkout.sessions.create({
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
        success_url: `https://checkout.stripe.dev/success`,
        cancel_url: `https://checkout.stripe.dev/cancel`,

    });
    return res.json({id: session.id});
});


app.listen(4242, (): void =>
    console.log(`Node server listening on port ${4242}!`)
);