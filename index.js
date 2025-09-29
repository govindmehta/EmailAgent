// index.js

import { chatWithUser } from "./agent/agent.js";

// --- Configuration for Testing ---
// 🔑 The identifier can now be a Subject, Sender Name, or ID.
// We'll use the Sender Name "Abhyuday Patel" from your previous fetch results.
const REPLY_IDENTIFIER = "Abhyuday Patel";
const TEST_REPLY_INSTRUCTION =
  "say I am interested and will apply by the end of the week, and ask about next steps.";

const NEW_MESSAGE_RECIPIENT = "patelabhyuday09@gmail.com";
const NEW_MESSAGE_SUBJECT = "Project Checkpoint Inquiry";
const NEW_MESSAGE_INSTRUCTION = "ask about the timeline for phase 2.";
// ------------------------------------

function extractToken(responseText) {
  // Looks for the user-friendly output pattern 'Next Page Token: <token>'
  const friendlyRegex = /Next Page Token: (\S+)/;
  const match = responseText.match(friendlyRegex);

  if (match) {
    return match[1];
  }

  // Fallback check for the delimited pattern
  const delimitedRegex =
    /---NEXT_PAGE_TOKEN_START---(.*?)---NEXT_PAGE_TOKEN_END---/;
  const delimitedMatch = responseText.match(delimitedRegex);

  return delimitedMatch ? delimitedMatch[1] : null;
}

async function main() {
  const userId = "govind123";

  // 📧 STEP 1: FETCH EMAILS (Initializes Memory Context)
  console.log("--- 📧 STEP 1: FETCHING EMAILS TO SET MEMORY CONTEXT ---");
  const fetchQuery = `Get my latest 10 emails. userId: ${userId}`;
  const response1 = await chatWithUser(fetchQuery);
  console.log("\n✅ Agent Final Response (Fetch):", response1);
  console.log("\n" + "=".repeat(50) + "\n");

  // ✍️ STEP 2: TEST CONTEXTUAL REPLY (Natural Language Lookup)
  console.log(
    `--- ✍️ STEP 2: TESTING CONTEXTUAL REPLY (Reply to: ${REPLY_IDENTIFIER}) ---`
  );

  // // The LLM will use 'Abhyuday Patel' as the identifier to find the email in memory.
  const replyQuery = `Reply to the email from ${REPLY_IDENTIFIER} and ${TEST_REPLY_INSTRUCTION}`;

  const responseReply = await chatWithUser(replyQuery);
  console.log("\n✅ Agent Final Response (Reply):", responseReply);
  console.log("\n" + "=".repeat(50) + "\n");

  // ✉️ STEP 3: TEST NEW MESSAGE (Explicit Arguments)
  console.log(`--- ✉️ STEP 3: TESTING SEND NEW MESSAGE ---`);

  // The LLM must explicitly extract the recipient, subject, and instruction.
  const newMsgQuery = `Send a new email to ${NEW_MESSAGE_RECIPIENT} with the subject '${NEW_MESSAGE_SUBJECT}' and the body instruction '${NEW_MESSAGE_INSTRUCTION}'.`;

  const responseNew = await chatWithUser(newMsgQuery);
  console.log("\n✅ Agent Final Response (New Message):", responseNew);
  console.log("\n" + "=".repeat(50) + "\n");
}

main();
