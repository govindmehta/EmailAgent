#!/usr/bin/env bun
import { chatWithUser } from "./agent/agent.js";
import readline from "readline";

// Store the next page token for pagination
let nextPageToken = null;
let currentUserId = "user123"; // Default user ID

// Extract token from agent response
function extractToken(responseText) {
  const friendlyRegex = /Next Page Token: (\S+)/;
  const match = responseText.match(friendlyRegex);
  
  if (match) {
    return match[1];
  }
  
  const delimitedRegex = /---NEXT_PAGE_TOKEN_START---(.*?)---NEXT_PAGE_TOKEN_END---/;
  const delimitedMatch = responseText.match(delimitedRegex);
  
  return delimitedMatch ? delimitedMatch[1] : null;
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt helper function
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Display welcome message and help
function displayWelcome() {
  console.log(`
╔════════════════════════════════════════╗
║            🚀 EMAIL AGENT              ║
║        Your AI Email Assistant         ║
╚════════════════════════════════════════╝

Available commands:
  📧 fetch    - Get your latest 10 emails
  ➡️  next     - Get next page of emails
  ✉️  send     - Send a new email
  ↩️  reply    - Reply to an email from memory
  ❓ help     - Show this help message
  🚪 exit     - Exit the application

Type a command to get started!
`);
}

// Display help
function displayHelp() {
  console.log(`
📚 COMMAND HELP:

📧 fetch
   Retrieves your latest 10 emails and stores them in memory.
   Usage: Just type 'fetch'

➡️ next
   Gets the next page of emails (if available from previous fetch).
   Usage: Just type 'next'

✉️ send
   Sends a new email to someone.
   Usage: Type 'send' and follow the prompts for:
   - Recipient email address
   - Subject line  
   - Email content instruction

↩️ reply
   Replies to an email from your recent emails in memory.
   Usage: Type 'reply' and provide:
   - Email identifier(s): You can use:
     * Single identifier: 'govind@email.com' or 'Update on project'
     * Multiple identifiers: 'govind@email.com, Update on project'
     * Gmail ID: 'abc123def456' (most precise)
   - Reply content instruction

❓ help
   Shows this help message

🚪 exit
   Exits the Email Agent
`);
}

// Handle fetch emails command
async function handleFetch() {
  console.log("\n📧 Fetching your latest emails...\n");
  
  try {
    const query = `Get my latest 10 emails. userId: ${currentUserId}`;
    const response = await chatWithUser(query);
    
    // Extract and store next page token
    const token = extractToken(response);
    if (token && token !== 'null') {
      nextPageToken = token;
      console.log(`\n💡 More emails available. Use 'next' command to see them.`);
    } else {
      nextPageToken = null;
      console.log(`\n📭 No more emails to fetch.`);
    }
    
    console.log("\n" + response);
  } catch (error) {
    console.error("\n❌ Error fetching emails:", error.message);
  }
}

// Handle next page of emails
async function handleNext() {
  if (!nextPageToken) {
    console.log("\n📭 No more emails available. Use 'fetch' to get the latest emails first.");
    return;
  }
  
  console.log("\n➡️ Fetching next page of emails...\n");
  
  try {
    const query = `Get my next 10 emails using pageToken: ${nextPageToken}. userId: ${currentUserId}`;
    const response = await chatWithUser(query);
    
    // Extract and store next page token  
    const token = extractToken(response);
    if (token && token !== 'null') {
      nextPageToken = token;
      console.log(`\n💡 More emails available. Use 'next' command to continue.`);
    } else {
      nextPageToken = null;
      console.log(`\n📭 No more emails to fetch.`);
    }
    
    console.log("\n" + response);
  } catch (error) {
    console.error("\n❌ Error fetching next emails:", error.message);
  }
}

// Handle send email command
async function handleSend() {
  console.log("\n✉️ Send a New Email");
  console.log("━━━━━━━━━━━━━━━━━━━\n");
  
  try {
    const recipient = await prompt("📮 Recipient email address: ");
    if (!recipient.trim()) {
      console.log("❌ Recipient email is required!");
      return;
    }
    
    const subject = await prompt("📝 Subject line: ");
    if (!subject.trim()) {
      console.log("❌ Subject is required!");
      return;
    }
    
    const instruction = await prompt("💭 What should the email say? (describe the content): ");
    if (!instruction.trim()) {
      console.log("❌ Email content instruction is required!");
      return;
    }
    
    console.log("\n📤 Sending email...\n");
    
    const query = `Send a new email to ${recipient} with the subject '${subject}' and the body instruction '${instruction}'.`;
    const response = await chatWithUser(query);
    
    console.log("\n" + response);
  } catch (error) {
    console.error("\n❌ Error sending email:", error.message);
  }
}

// Handle reply to email command  
async function handleReply() {
  console.log("\n↩️ Reply to an Email");
  console.log("━━━━━━━━━━━━━━━━━━\n");
  
  try {
    // Import and check memory
    const { getLastFetchedEmails } = await import("./aiServices/memory.js");
    const cachedEmails = getLastFetchedEmails();
    
    if (cachedEmails.length === 0) {
      console.log("❌ No emails found in memory! Please use 'fetch' or 'next' to load emails first.");
      return;
    }
    
    console.log(`📋 Found ${cachedEmails.length} emails in memory. Here are some examples:`);
    cachedEmails.slice(0, 3).forEach((email, index) => {
      console.log(`   ${index + 1}. From: ${email.from} | Subject: ${email.subject?.substring(0, 50) || 'No subject'}...`);
    });
    console.log("");
    console.log("💡 Tip: You can use multiple identifiers separated by commas for better matching");
    console.log("   Example: 'govind@email.com, Update on project' or 'LinkedIn, invitation'");
    console.log("");
    
    const identifier = await prompt("🔍 Enter email identifier(s) (sender name, subject, or ID): ");
    if (!identifier.trim()) {
      console.log("❌ Email identifier is required!");
      return;
    }
    
    const instruction = await prompt("💭 What should your reply say? (describe the reply content): ");
    if (!instruction.trim()) {
      console.log("❌ Reply content instruction is required!");
      return;
    }
    
    console.log("\n📤 Sending reply...\n");
    
    const query = `Reply to the email identified by "${identifier}" with the following content: ${instruction}`;
    const response = await chatWithUser(query);
    
    console.log("\n" + response);
  } catch (error) {
    console.error("\n❌ Error sending reply:", error.message);
  }
}

// Main CLI loop
async function main() {
  displayWelcome();
  
  while (true) {
    try {
      const input = await prompt("\n🤖 Email Agent > ");
      const command = input.trim().toLowerCase();
      
      console.log(); // Add spacing
      
      switch (command) {
        case 'fetch':
          await handleFetch();
          break;
          
        case 'next':
          await handleNext();
          break;
          
        case 'send':
          await handleSend();
          break;
          
        case 'reply':
          await handleReply();
          break;
          
        case 'help':
          displayHelp();
          break;
          
        case 'exit':
        case 'quit':
        case 'q':
          console.log("👋 Thanks for using Email Agent! Goodbye!");
          rl.close();
          process.exit(0);
          break;
          
        case '':
          // Empty input, just continue
          break;
          
        default:
          console.log(`❓ Unknown command: '${command}'\nType 'help' to see available commands.`);
          break;
      }
    } catch (error) {
      console.error("❌ Unexpected error:", error.message);
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log("\n\n👋 Thanks for using Email Agent! Goodbye!");
  rl.close();
  process.exit(0);
});

// Start the CLI
main().catch((error) => {
  console.error("❌ Failed to start Email Agent:", error.message);
  process.exit(1);
});