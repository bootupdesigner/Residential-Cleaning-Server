require("dotenv").config(); // ✅ Load .env variables

const { google } = require("googleapis");
const readline = require("readline");

// ✅ Ensure environment variables are loaded
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground"; // Use this for refresh tokens

// ✅ Check if values are correctly loaded
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Error: Missing CLIENT_ID or CLIENT_SECRET. Check your .env file.");
  process.exit(1); // Stop execution
}

// 🔹 Initialize OAuth2 Client
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Step 1: Generate an Authorization URL
const getAccessToken = async () => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline", // Required to get a refresh token
    scope: ["https://mail.google.com/"], // Full Gmail access
  });

  console.log("🔹 Authorize this app by visiting this URL:", authUrl);

  // Step 2: Enter the authorization code
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the code from the Google authentication page: ", async (code) => {
    rl.close();

    try {
      const { tokens } = await oAuth2Client.getToken(code);
      console.log("🔑 Refresh Token:", tokens.refresh_token);
      console.log("✅ Save this refresh token in your .env file.");
    } catch (error) {
      console.error("❌ Error retrieving access token:", error.response?.data || error.message);
    }
  });
};

// Run the function
getAccessToken();
