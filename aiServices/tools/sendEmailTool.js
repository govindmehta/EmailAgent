// aiServices/tools/sendEmailTool.js

import { sendEmail } from "../../services/gmailService.js";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { findEmailById } from "../memory.js";
import { HumanMessage } from "langchain";

// Model instance specifically for body synthesis
const synthesisModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 0.5, // Higher temp for creative writing
  apiKey: process.env.GOOGLE_API_KEY,
});


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
            console.warn(`[Synthesis] Attempt ${attempt} failed with error: ${error.status || error.message}. Retrying...`);
            if (attempt === MAX_RETRIES) {
                console.error(`[Synthesis] All ${MAX_RETRIES} attempts failed. Using fallback body.`);
                // Return the raw instruction as a safe fallback
                return FALLBACK_BODY; 
            }
            // Wait a moment before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); 
        }
    }
    // Should be unreachable, but good practice to handle
    return FALLBACK_BODY;
}


export const sendEmailTool = tool(
  async ({ recipient, subject, bodyInstruction, replyToId }) => {
    let toAddress = recipient;
    let finalSubject = subject;
    let sourceMessageId = null;

    // CONTEXTUAL LOGIC (if replyToId is provided)
    if (replyToId) {
      const targetEmail = findEmailById(replyToId);

      if (!targetEmail) {
        return `Error: Could not find email with ID '${replyToId}' in the recent context. Cannot reply.`;
      }

      // Infer 'to' and 'subject' for a reply
      const fromMatch = targetEmail.from.match(/<([^>]+)>/);
      toAddress = fromMatch ? fromMatch[1] : targetEmail.from.trim();

      // Ensure subject starts with "Re:"
      if (targetEmail.subject) {
        finalSubject = targetEmail.subject.startsWith("Re:")
          ? targetEmail.subject
          : `Re: ${targetEmail.subject}`;
      } else {
        finalSubject = `Re: (No Original Subject)`;
      }

      sourceMessageId = targetEmail.id;
    }

    // SYNTHESIZE BODY
    const finalBody = await generateBody(bodyInstruction);
    // console.log("[SendEmailTool] Generated Email Body:\n", finalBody);

    try {
      // SEND EMAIL
      await sendEmail(toAddress, finalSubject, finalBody, sourceMessageId);

    //   console.log("hello");
      let status = `Email successfully sent to ${toAddress}`;
      if (replyToId) {
        status += ` (as a reply to ID: ${replyToId}).`;
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
      "Sends a new email OR replies to a recently fetched email. Requires the recipient, subject, and body instruction.",
    schema: z.object({
      // Recipient and Subject are always required for the tool call
      recipient: z
        .string()
        .email()
        .describe("The email address of the primary recipient."),
      subject: z
        .string()
        .describe(
          "The subject line of the email. For NEW emails, use the subject provided by the user."
        ),
      bodyInstruction: z
        .string()
        .describe(
          "The user's instruction on what the message body should convey (e.g., 'ask about the meeting time')."
        ),
      // This is OPTIONAL, only provided if the user is replying.
      replyToId: z
        .string()
        .optional()
        .describe(
          "The unique Gmail ID of the email being replied to, if available in the user's request."
        ),
    }),
  }
);
