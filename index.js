// index.js
import { chatWithUser } from "./agent/agent.js";

function extractToken(responseText) {
  // FIX: Look for the user-friendly output pattern 'Next Page Token: <token>'
  const friendlyRegex = /Next Page Token: (\S+)/;
  const match = responseText.match(friendlyRegex);

  // Fallback to the original delimited pattern in case the LLM did embed it
  if (match) {
    return match[1];
  }

  // Original delimiter check (Less likely to work due to LLM prompt)
  const delimitedRegex =
    /---NEXT_PAGE_TOKEN_START---(.*?)---NEXT_PAGE_TOKEN_END---/;
  const delimitedMatch = responseText.match(delimitedRegex);

  return delimitedMatch ? delimitedMatch[1] : null;
}

const EMAIL_ID_TO_REPLY = "199902347ac2f7b3"; // Replace with a valid ID after first run
const TEST_REPLY_INSTRUCTION = "say I am interested and will apply by the end of the week.";

async function main() {
  const userId = "govind123";

  // console.log("--- 📧 STEP 1: FETCHING EMAILS TO SET MEMORY CONTEXT ---");
  // const fetchQuery = `Get my latest 10 emails. userId: ${userId}`;
  // const response1 = await chatWithUser(fetchQuery);
  // console.log("\n✅ Agent Final Response (Fetch):", response1);
  // console.log("\n" + "=".repeat(50) + "\n");

  // const nextToken = extractToken(response1);

  // if (nextToken) {
  //   console.log(
  //     `--- 📧 FETCHING NEXT 10 EMAILS (Token: ${nextToken.slice(0, 10)}...) ---`
  //   );
  //   const response2 = await chatWithUser(
  //     `Get the next 10 emails. userId: ${userId} pageToken: ${nextToken}`
  //   );
  //   console.log("\n✅ Agent Final Response 2:", response2);
  // } else {
  //   console.log("No next page token found. Skipping second pagination test.");
  // }

  // console.log(
  //   `--- ✍️ STEP 2: TESTING CONTEXTUAL REPLY (Reply to ID: ${EMAIL_ID_TO_REPLY}) ---`
  // );

  // The agent will use the ID to infer TO and SUBJECT
  // const replyQuery = `Reply to the email with ID ${EMAIL_ID_TO_REPLY} and ${TEST_REPLY_INSTRUCTION}.`;

  // const responseReply = await chatWithUser(replyQuery);
  // console.log("\n✅ Agent Final Response (Reply):", responseReply);
  // console.log("\n" + "=".repeat(50) + "\n");

  // --- STEP 3: TEST NEW MESSAGE (Does NOT Use Memory) ---
  console.log(`--- ✉️ STEP 3: TESTING SEND NEW MESSAGE ---`);
  const newMsgQuery = `Send a new email to patelabhyuday09@gmail.com with the subject 'Project Update' and the body instruction 'tell them the update meeting is rescheduled to Tuesday.'`;

  const responseNew = await chatWithUser(newMsgQuery);
  console.log("\n✅ Agent Final Response (New Message):", responseNew);
  console.log("\n" + "=".repeat(50) + "\n");
}

main();
