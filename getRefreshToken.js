require("dotenv").config(); // ✅ Load .env variables
const { google } = require("googleapis");
const readline = require("readline");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Error: Missing CLIENT_ID or CLIENT_SECRET. Check your .env file.");
  process.exit(1);
}

// ✅ Consistent variable name
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log("👉 Open the URL below in your browser:");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('🔑 Enter the code from the page here: ', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code); // ✅ Correct object used here
    console.log('✅ Tokens:', tokens);
    rl.close();
  } catch (error) {
    console.error("❌ Error exchanging code for token:", error);
    rl.close();
  }
});
