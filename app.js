const stripe = Stripe('pk_test_51PQDAFRv7G5ppYXUx4IQ2zbbFXCMujC0n3YzU7Kn4OrpxbKdXlLnVNm5ISjpRxefdef7h3RXM5kEk48LCVVuwJCF00n1LBnaEN'); // Replace with your Stripe public key

const form = document.getElementById('subscription-form');
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const userId = document.getElementById('user-id').value;
    const resourceId = document.getElementById('resource-id').value;
    const userType = document.getElementById('user-type').value;

    try {
        const response = await fetch('http://localhost:3000/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                resourceId,
                userType,
            }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        const session = await response.json();

        if (!session.id) {
            throw new Error('No session ID returned from backend');
        }

        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.id,
        });

        if (result.error) {
            console.error(result.error.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});
