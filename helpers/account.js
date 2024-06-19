const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: creatorEmail,
  });
  