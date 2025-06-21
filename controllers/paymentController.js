const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/userModel");

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("❌ Stripe Secret Key is missing in environment variables!");
}

const processPayment = async (req, res) => {
  try {
    console.log("🔹 Request Headers:", req.headers);

    const userId = req.user?.id;
    const {
      selectedAddOns = [],
      totalPrice: providedTotal,
      payInFull = false, // ✅ NEW
    } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error("❌ User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Recalculate total if not passed or invalid
    let totalPrice = providedTotal;
    if (!totalPrice || totalPrice <= 0) {
      totalPrice = user.cleaningPrice || 0;

      const addOnPrices = {
        windowCleaning: 35,
        ovenCleaning: 15,
        baseboardCleaning: 70,
        ceilingFanCleaning: 15,
        doors: 25,
      };

      selectedAddOns.forEach((addOn) => {
        if (addOnPrices[addOn]) {
          totalPrice += addOnPrices[addOn];
        }
      });
    }

    // ✅ Determine amount to charge
    const amountToCharge = payInFull ? totalPrice : 25;
    const amountInCents = Math.round(amountToCharge * 100);

    console.log(`🔹 Charging ${payInFull ? "full amount" : "$25 deposit"}: $${amountToCharge}`);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      payment_method_types: ["card"],
      metadata: {
        userId: user._id.toString(),
        cleaningPrice: user.cleaningPrice,
        payInFull,
        depositPaid: !payInFull,
        addOns: selectedAddOns.length ? selectedAddOns.join(", ") : "None",
      },
    });

    console.log("✅ Payment Intent Created:", paymentIntent.id);

    res.status(200).json({
      message: "Payment intent created",
      clientSecret: paymentIntent.client_secret,
      totalAmount: amountToCharge,
    });

  } catch (error) {
    console.error("❌ Payment processing error:", error);
    res.status(500).json({ message: "Payment processing failed", error: error.message });
  }
};



const getSavedCards = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ message: "User or Stripe customer not found" });
    }

    // **Fetch saved payment methods from Stripe**
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    // **Filter only necessary card details (never return full card numbers)**
    const formattedCards = paymentMethods.data.map((card) => ({
      id: card.id,
      brand: card.card.brand,
      last4: card.card.last4,
      expMonth: card.card.exp_month,
      expYear: card.card.exp_year,
    }));

    res.status(200).json({ savedCards: formattedCards });
  } catch (error) {
    console.error("❌ Error fetching saved cards:", error);
    res.status(500).json({ message: "Failed to fetch saved cards", error });
  }
};

module.exports = { processPayment, getSavedCards };
