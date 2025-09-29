// aiServices/tools/emailTool.js
import { getEmailsList } from "../../services/gmailService.js";
import { categorizeEmails } from "../categorize.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { setLastFetchedEmails } from "../memory.js";

export const emailFetchTool = tool(
  async (input) => {
    const { userId, limit, pageToken } = input; // 1. Fetch raw emails using Gmail API pagination
    const { emails, nextPageToken } = await getEmailsList(
      userId,
      limit,
      pageToken
    );

    if (emails.length === 0) {
      return "No emails found.";
    }
    // 🔑 WRITE RAW EMAILS TO MEMORY
    setLastFetchedEmails(emails); 

    // If categorization fails, we get a specific return value
    const categorized = await categorizeEmails(emails); // Check if the categorization returned the specific error state object

    const isEmptyStructure = Object.values(categorized).every(
      (arr) => Array.isArray(arr) && arr.length === 0
    );

    if (emails.length > 0 && isEmptyStructure) {
      return "ERROR: Categorization failed due to an external service error. Please try again shortly.";
    }

    let output = JSON.stringify(categorized, null, 2);

    if (nextPageToken) {
      //Use a clear delimiter for the LLM to identify the token
      output += `\n\n---NEXT_PAGE_TOKEN_START---${nextPageToken}---NEXT_PAGE_TOKEN_END---`;
    }

    return output;
  },
  {
    name: "fetchEmails",
    description:
      "Fetch emails with pagination support. Returns categorized JSON and a nextPageToken if more emails exist.",
    schema: z.object({
      userId: z
        .string()
        .describe("The user identifier. Must be passed by the user."),
      limit: z
        .number()
        .default(10)
        .describe("The number of emails to fetch, typically 10."),
      pageToken: z
        .string()
        .nullable()
        .optional()
        .describe(
          "The token for the next page of results, provided in a previous tool output."
        ),
    }),
  }
);
