// aiServices/tools/sendEmailTool.js

import { sendEmail } from "../../services/gmailService.js";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
// 🔑 Import the memory getter function
import { getLastFetchedEmails } from "../memory.js";
import { HumanMessage } from "langchain";

// Model instance specifically for body synthesis
const synthesisModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 0.5, // Higher temp for creative writing
  apiKey: process.env.GOOGLE_API_KEY,
});

// 🔑 NEW: Function to search memory by ID, Subject, or Sender
function findUniqueEmail(query) {
  if (!query) return null;

  const lastEmails = getLastFetchedEmails();
  const normalizedQuery = query.toLowerCase().trim();

  // Try to match against ID, Subject, or Sender Name
  const matches = lastEmails.filter((e) => {
    // 1. Check ID
    if (e.id === normalizedQuery) return true;
    // 2. Check Subject inclusion
    if (e.subject && e.subject.toLowerCase().includes(normalizedQuery))
      return true;
    // 3. Check Sender inclusion
    if (e.from && e.from.toLowerCase().includes(normalizedQuery)) return true;
    return false;
  });

  if (matches.length === 1) {
    return matches[0]; // Unique match found!
  } else if (matches.length > 1) {
    // Found multiple matches, return ambiguity error object
    return {
      error: `Found ${matches.length} emails matching "${query}". Please use a more specific phrase or the unique ID.`,
    };
  }

  return null; // No match found
}

async function generateBody(instruction) {
  const MAX_RETRIES = 3;
  const FALLBACK_BODY = `[Automated Response]: Regarding your request, ${instruction}`;

  const prompt = `
   You are an AI email composer. Your task is to turn the following brief instruction into a polite, professional, and complete email body. 
   Use appropriate greetings, closings, and formatting (newlines for paragraphs).
  At the end of email add name as "Govind Mehta".

  INSTRUCTION: "${instruction}"
  `;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await synthesisModel.invoke([new HumanMessage(prompt)]);
      return response.content; // Success!
    } catch (error) {
      console.warn(
        `[Synthesis] Attempt ${attempt} failed with error: ${
          error.status || error.message
        }. Retrying...`
      );
      if (attempt === MAX_RETRIES) {
        console.error(
          `[Synthesis] All ${MAX_RETRIES} attempts failed. Using fallback body.`
        );
        return FALLBACK_BODY;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return FALLBACK_BODY;
}

export const sendEmailTool = tool(
  async (input) => {
    let toAddress = input.recipient;
    let finalSubject = input.subject;
    let sourceMessageId = null;
    const bodyInstruction = input.bodyInstruction; // 1. Determine if this is a REPLY or a NEW MESSAGE // We repurpose 'replyToId' as a general identifier ('identifier')

    const isReply = !!input.replyToId;

    if (isReply) {
      // --- REPLY PATH (Contextual Lookup) ---

      // 🔑 Use the flexible search function
      const result = findUniqueEmail(input.replyToId);

      if (result && result.error) {
        return result.error; // Ambiguity error (multiple matches)
      }
      const targetEmail = result; // This is the unique email object

      if (!targetEmail) {
        return `Error: The email matching "${input.replyToId}" could not be found in the recent context.`;
      } // Infer 'to' address from the original 'from' header

      const fromMatch = targetEmail.from.match(/<([^>]+)>/);
      toAddress = fromMatch ? fromMatch[1] : targetEmail.from.trim(); // Infer subject with "Re:"

      finalSubject = targetEmail.subject.startsWith("Re:")
        ? targetEmail.subject
        : `Re: ${targetEmail.subject || "(No Subject)"}`;
      sourceMessageId = targetEmail.id;
    } else {
      // --- NEW MESSAGE PATH (Explicit Arguments) ---
      if (!toAddress || !finalSubject) {
        return "Error: Cannot send a new message without a recipient and subject.";
      } // sourceMessageId remains null for new messages.
    } // SYNTHESIZE BODY
    const finalBody = await generateBody(bodyInstruction);

    try {
      // SEND EMAIL
      await sendEmail(toAddress, finalSubject, finalBody, sourceMessageId);

      let status = `Email successfully sent to ${toAddress}`;
      if (isReply) {
        status += ` (as a reply, based on identifier: ${input.replyToId}).`;
      } else {
        status += ` (as a new message).`;
      }
      return status;
    } catch (error) {
      return `Failed to send email. Error: ${error.message}`;
    }
  },
  {
    name: "sendEmail",
    description:
      "Sends a new email OR replies to a recently fetched email. For replies, provide a unique subject line, sender name, or ID.",
    schema: z.object({
      // Required for ALL calls
      bodyInstruction: z
        .string()
        .describe(
          "The user's instruction on what the message body should convey (e.g., 'ask about the meeting time')."
        ), // Recipient and Subject are required for NEW messages, optional for reply (as they are inferred).
      recipient: z
        .string()
        .email()
        .optional()
        .describe(
          "The email address of the primary recipient (required for NEW message)."
        ),
      subject: z
        .string()
        .optional()
        .describe("The subject line of the email (required for NEW message)."), // REQUIRED for REPLY action, acts as the natural language identifier
      replyToId: z
        .string()
        .optional()
        .describe(
          "A unique identifier (Subject, Sender Name, or ID) of the email being replied to (REQUIRED for replies)."
        ),
    }),
  }
);
