const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')('sk_test_51PQDAFRv7G5ppYXUiqX1C1LvV2220rH14ZCGChLGN6MpCAH0iw2lYAkyjcPuFwbKtBvfrdZFoKz8vqNwtLrfNEF200Lli99trT'); // Replace with your Stripe secret key
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); }}));
app.use(bodyParser.urlencoded({ extended: true }));

const plansFilePath = path.join(__dirname, 'plans.json');

// Function to read plans from JSON file
function readPlans() {
    try {
        const data = fs.readFileSync(plansFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading plans file:', error);
        return {};
    }
}

// Function to write plans to JSON file
function writePlans(plans) {
    try {
        fs.writeFileSync(plansFilePath, JSON.stringify(plans, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing plans file:', error);
    }
}

let plans = readPlans();

// Create a new subscription plan
app.post('/create-plan', async (req, res) => {
    const { productName, price, interval, creatorId } = req.body;

    // Check if the plan already exists
    const existingPlan = Object.values(plans).find(plan =>
        plan.productName === productName && plan.price === price && plan.interval === interval
    );

    if (existingPlan) {
        return res.json({ planId: existingPlan.planId });
    }

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
            planId,
            creatorId,
            productId: product.id,
            priceId: priceObj.id,
            productName,
            price,
            interval,
        };

        writePlans(plans);

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

// Create a Checkout Session with Metadata
app.post('/create-checkout-session', async (req, res) => {
    const { planId, email, userId, resourceId, userType } = req.body;

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
            metadata: {
                email: email,
                planId: planId,
                userId: userId,
                resourceId: resourceId,
                userType: userType,
            },
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

// Webhook endpoint to handle Stripe events
app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
    const sig = request.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(request.rawBody, sig, 'whsec_07d63bc2cc84b07ad437cbe3ad780872a9ccd6c93dd782873c20f05f4ed0663c');
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Log event to a JSON file
    const logDir = './logs';
    if (!fs.existsSync(logDir)){
        fs.mkdirSync(logDir);
    }

    const logFilePath = `${logDir}/event-${Date.now()}.json`;
    fs.writeFileSync(logFilePath, JSON.stringify(event, null, 2), 'utf8');

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            //console.log('Checkout session completed:', session);

            // Access metadata
            const email = session.metadata.email;
            const planId = session.metadata.planId;
            const userId = session.metadata.userId;
            const resourceId = session.metadata.resourceId;
            const userType = session.metadata.userType;

            // Log necessary details
            console.log(`Subscription ID: ${session.subscription}`);
            console.log(`Plan ID: ${planId}`);
            console.log(`User Email: ${email}`);
            console.log(`Amount Total: ${session.amount_total}`);
            console.log(`User ID: ${userId}`);
            console.log(`Resource ID: ${resourceId}`);
            console.log(`User Type: ${userType}`);

            // Process the metadata as needed
            console.log(`Metadata - Email: ${email}, Plan ID: ${planId}, User ID: ${userId}, Resource ID: ${resourceId}, User Type: ${userType}`);

            break;
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful!');
            console.log(`PaymentIntent ID: ${paymentIntent.id}`);
            console.log(`Amount Received: ${paymentIntent.amount_received}`);
            break;
        case 'invoice.payment_succeeded':
            const invoice = event.data.object;
            console.log('Invoice payment succeeded:', invoice);
            console.log(`Invoice ID: ${invoice.id}`);
            console.log(`Subscription ID: ${invoice.subscription}`);
            console.log(`Amount Paid: ${invoice.amount_paid}`);
            break;
        case 'invoice.payment_failed':
            const failedInvoice = event.data.object;
            console.log('Invoice payment failed:', failedInvoice);
            console.log(`Invoice ID: ${failedInvoice.id}`);
            console.log(`Subscription ID: ${failedInvoice.subscription}`);
            console.log(`Attempt Count: ${failedInvoice.attempt_count}`);
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    response.json({ received: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
