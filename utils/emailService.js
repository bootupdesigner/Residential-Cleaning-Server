const nodemailer = require("nodemailer");
const { google } = require("googleapis");

// 🔹 OAuth2 Setup
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const REDIRECT_URI = "https://developers.google.com/oauthplayground";

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const sendBookingConfirmationEmail = async (user, booking) => {
  try {
    console.log("🔹 Preparing to send email...");
    console.log("📧 User Email:", user?.email || "No Email Found");
    console.log("📅 Booking Date:", booking?.date || "No Date Found");
    console.log("⏰ Booking Time:", booking?.time || "No Time Found");

    // ✅ Step 1: Get a new access token
    const { token: accessToken } = await oAuth2Client.getAccessToken();
    if (!accessToken) throw new Error("Failed to retrieve access token");

    // ✅ Step 2: Create Nodemailer transporter with access token
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: GMAIL_USER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken,
      },
    });

    // ✅ Step 3: Prepare email content
    const mailOptions = {
      from: `"JMAC Cleaning Services" <${GMAIL_USER}>`,
      to: user.email,
      bcc: ADMIN_EMAIL,
      subject: "Home Booking Confirmation - JMAC Cleaning Services",
      html: `
        <h2>Booking Confirmed</h2>
        <p>Dear ${user.firstName},</p>
        <p>Your cleaning appointment has been confirmed.</p>
        <h3>Appointment Details</h3>
        <ul>
          <li><strong>Date:</strong> ${booking.date}</li>
          <li><strong>Time:</strong> ${booking.time}</li>
          <li><strong>Address:</strong> ${booking.serviceAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}</li>
          <li><strong>Add-ons:</strong> ${booking.addOns.length > 0 ? booking.addOns.join(", ") : "None"}</li>
        </ul>
        <p>Thank you for choosing JMAC Cleaning Services.</p>
        <p>Best Regards,<br>JMAC Cleaning Services Team</p>
      `,
    };

    // ✅ Step 4: Send email
    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Booking confirmation email sent successfully:", result.messageId);

    return result;
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.data || error.message || error);
  }
};

module.exports = { sendBookingConfirmationEmail };
