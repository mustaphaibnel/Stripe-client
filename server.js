const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')('sk_test_51PQDAFRv7G5ppYXUiqX1C1LvV2220rH14ZCGChLGN6MpCAH0iw2lYAkyjcPuFwbKtBvfrdZFoKz8vqNwtLrfNEF200Lli99trT'); // Replace with your Stripe secret key

const app = express();
app.use(cors());
app.use(bodyParser.json());

let plans = {}; // In-memory store for subscription plans

// Create a new subscription plan
app.post('/create-plan', async (req, res) => {
    const { productName, price, interval, creatorId } = req.body;

    try {
        const product = await stripe.products.create({
            name: productName,
        });

        const priceObj = await stripe.prices.create({
            unit_amount: price,
            currency: 'usd',
            recurring: { interval },
            product: product.id,
        });

        const planId = uuidv4();
        plans[planId] = {
            creatorId,
            productId: product.id,
            priceId: priceObj.id,
            productName,
            price,
            interval,
        };

        res.json({ planId });
    } catch (error) {
        console.error('Error creating plan:', error);
        res.status(500).json({ error: error.message });
    }
});

// List all subscription plans
app.get('/plans', (req, res) => {
    res.json({ plans });
});

// Create a customer
app.post('/create-customer', async (req, res) => {
    const { email, paymentMethodId } = req.body;

    try {
        const customer = await stripe.customers.create({
            email: email,
            payment_method: paymentMethodId,
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        res.json({ customerId: customer.id });
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create a Checkout Session
app.post('/create-checkout-session', async (req, res) => {
    const { planId, email } = req.body;

    if (!plans[planId]) {
        return res.status(404).json({ error: 'Plan not found' });
    }

    try {
        const customer = await stripe.customers.create({ email });
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer: customer.id,
            line_items: [
                {
                    price: plans[planId].priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: 'http://localhost:8000/success.html', // Replace with your success URL
            cancel_url: 'http://localhost:8000/cancel.html', // Replace with your cancel URL
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

// List all customers
app.get('/customers', async (req, res) => {
    try {
        const customers = await stripe.customers.list({
            limit: 10,
        });

        res.json({ customers });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
