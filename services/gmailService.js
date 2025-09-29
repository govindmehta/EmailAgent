import { extractLinks } from "./extractLinks.js";
import fs from "fs/promises";
import { google } from "googleapis";
import readline from "readline";

const CREDENTIALS_PATH = "clientSecret.json";
const TOKEN_PATH = "token.json";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

let oAuth2Client;

async function getAuthClient() {
  if (oAuth2Client) {
    return oAuth2Client;
  }

  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.web;

  oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  try {
    const token = JSON.parse(await fs.readFile(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } catch (err) {
    return await getNewToken(oAuth2Client);
  }
}

async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this URL:", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question("Enter the code from that page here: ", resolve);
  });

  rl.close();

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
  console.log("Token stored to", TOKEN_PATH);

  return oAuth2Client;
}

function getBody(payload) {
  let body = "";
  if (payload.parts) {
    for (const part of payload.parts) {
      body += getBody(part); // Recursively handle multipart messages
    }
  } else if (payload.body && payload.body.data) {
    body += Buffer.from(payload.body.data, "base64").toString();
  }
  return body;
}

//Helper function to extract specific headers
function getHeader(headers, name) {
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header ? header.value : "N/A";
}

// userId is there in case you want multi-user, but Gmail uses "me"
async function getEmailsList(userId, limit, pageToken = null) {
  try {
    const auth = await getAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    // Fetch messages with Gmail pagination
    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: limit,
      pageToken, // null = first page, otherwise continue
    });

    const messages = res.data.messages || [];
    const nextPageToken = res.data.nextPageToken || null;

    if (!messages.length) {
      return { emails: [], nextPageToken: null };
    }

    // Fetch details concurrently
    const emailPromises = messages.map(async (msg) => {
      try {
        const emailRes = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
        });
        const payload = emailRes.data.payload;
        const headers = payload.headers || [];
        const subject = getHeader(headers, "Subject");
        const from = getHeader(headers, "From");
        const snippet = emailRes.data.snippet;
        const body = getBody(payload);
        const links = extractLinks(body);
        const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${msg.id}`;
        return { id: msg.id, subject, from, snippet, links, gmailLink };
      } catch (err) {
        console.error(`Failed to fetch message ${msg.id}:`, err);
        return null; // skip this one
      }
    });

    const emails = await Promise.all(emailPromises);
    return {
      emails: emails.filter((e) => e !== null), // filter out failures
      nextPageToken,
    };
  } catch (err) {
    console.error("An error occurred:", err);
    return { emails: [], nextPageToken: null };
  }
}

async function sendEmail(to, subject, body, sourceMessageId = null) {
    try {
        const auth = await getAuthClient();
        const gmail = google.gmail({ version: "v1", auth });
        
        let threadId = undefined;
        let headers = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'MIME-Version: 1.0',
        ];

        // 🔑 Add headers for proper threading if replying
        if (sourceMessageId) {
            // Fetch the thread ID and Message-ID header from the source message
            const sourceMessage = await gmail.users.messages.get({
                userId: 'me',
                id: sourceMessageId,
                fields: 'threadId,payload/headers'
            });

            const sourceMessageID = getHeader(sourceMessage.data.payload.headers, 'Message-ID');
            threadId = sourceMessage.data.threadId;

            headers.push(`In-Reply-To: ${sourceMessageID}`);
            headers.push(`References: ${sourceMessageID}`);
        }
        
        const emailContent = [...headers, '', body].join('\n');

        const base64Email = Buffer.from(emailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: base64Email,
                threadId: threadId // Associate the new message with the thread
            },
        });

        return res.data;
    } catch (err) {
        console.error("Error sending email:", err);
        throw new Error("Failed to send email via Gmail API.");
    }
}



export { getEmailsList,sendEmail };
