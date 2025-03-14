const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const processRefund = async (paymentId, amount) => {
    try {
      if (!paymentId) {
        console.warn("⚠️ No payment ID provided. Skipping refund.");
        return { message: "No payment ID provided. Skipping refund." };
      }
  
      console.log(`🔹 Processing refund for Payment ID: ${paymentId}, Amount: $${amount}`);
  
      // ✅ Implement your payment gateway refund logic (Stripe/Square)
      const refundResponse = await stripe.refunds.create({
        payment_intent: paymentId,
        amount: Math.round(amount * 100), // Convert to cents if using Stripe
      });
  
      console.log("✅ Refund Successful:", refundResponse);
      return refundResponse;
  
    } catch (error) {
      console.error("❌ Refund Error:", error);
      return { message: "Refund failed", error: error.message };
    }
  };
  

module.exports = { processRefund };
