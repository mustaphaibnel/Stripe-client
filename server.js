const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')('sk_test_51PQDAFRv7G5ppYXUiqX1C1LvV2220rH14ZCGChLGN6MpCAH0iw2lYAkyjcPuFwbKtBvfrdZFoKz8vqNwtLrfNEF200Lli99trT'); // Replace with your Stripe secret key

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());

app.post('/create-checkout-session', async (req, res) => {
    const { amount } = req.body;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'One-Time Payment',
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'http://localhost:8000/success.html', // Replace with your success URL
            cancel_url: 'http://localhost:8000/cancel.html', // Replace with your cancel URL
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
