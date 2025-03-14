const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const express = require("express");
const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // Stripe requires raw body
  async (req, res) => {
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log("❌ Webhook error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // **Handle Payment Success**
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      console.log("✅ Payment confirmed for:", paymentIntent.amount);
      // ✅ Update booking status in your database here
    }

    res.json({ received: true });
  }
);

module.exports = router;
