
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountToCharge,
    currency: 'usd',
    application_fee_amount: applicationFee,
    transfer_data: {
      destination: creatorStripeAccountId,
    },
    payment_method: paymentMethodId,
    confirmation_method: 'manual',
    confirm: true,
  });
  