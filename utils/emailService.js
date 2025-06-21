const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { createEvent } = require('ics');
const fs = require('fs');
const path = require('path');


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


    const convertTo24Hour = (time) => {
      const [timePart, period] = time.split(" ");
      let [hours, minutes] = timePart.split(":");
      if (period === "PM" && hours !== "12") hours = String(+hours + 12);
      if (period === "AM" && hours === "12") hours = "00";
      return `${hours.padStart(2, "0")}:${minutes}`;
    };

    // ✅ Generate Google Calendar link
    const createCalendarLink = (booking) => {
      const start = new Date(`${booking.date}T${convertTo24Hour(booking.time)}:00`);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2-hour service

      const formatISO = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const dates = `${formatISO(start)}/${formatISO(end)}`;
      const location = encodeURIComponent(`${booking.serviceAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`);
      const details = encodeURIComponent("Your cleaning appointment with JMAC Cleaning Services.");
      const title = encodeURIComponent("JMAC Cleaning Appointment");

      return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    };

    const calendarLink = createCalendarLink(booking);

    // ✅ Convert 12-hour time to [hour, minute]
    const getTimeParts = (time) => {
      const [timePart, period] = time.split(" ");
      let [hour, minute] = timePart.split(":").map(Number);
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      return [hour, minute];
    };

    // ✅ Generate .ics event file
    const [hour, minute] = getTimeParts(booking.time);
    const [year, month, day] = booking.date.split("-").map(Number); // YYYY-MM-DD

    const event = {
      start: [year, month, day, hour, minute],
      duration: { hours: 2 },
      title: 'JMAC Cleaning Appointment',
      description: 'Your cleaning appointment with JMAC Cleaning Services.',
      location: `${booking.serviceAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`,
      status: 'CONFIRMED',
      organizer: { name: 'JMAC Cleaning Services', email: GMAIL_USER },
      attendees: [{ name: `${user.firstName} ${user.lastName}`, email: user.email }],
    };

    let icsAttachment = null;

    createEvent(event, (error, value) => {
      if (error) {
        console.error("❌ ICS generation error:", error);
      } else {
        icsAttachment = {
          filename: 'appointment.ics',
          content: value,
          contentType: 'text/calendar',
        };
      }
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
        <p>📅 <a href="${calendarLink}" target="_blank">Add this appointment to your Google Calendar</a></p>
       <p>📎 ICS calendar file is attached for Apple/Outlook users.</p>

        <p>Thank you for choosing JMAC Cleaning Services.</p>
        <p>Best Regards,<br>JMAC Cleaning Services Team</p>
      `,
      attachments: icsAttachment ? [icsAttachment] : [],

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
