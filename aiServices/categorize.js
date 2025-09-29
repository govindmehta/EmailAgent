// categorize.js (The corrected file)

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "langchain";
// 🔑 NEW: StructuredOutputParser to enforce Zod schema
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

// 🔑 NEW: Define the output schema using Zod
const EmailItemSchema = z.object({
  subject: z.string(),
  from: z.string(),
  snippet: z.string(),
  links: z.array(z.string()),
  gmailLink: z.string(),
  summary: z.string().describe("A 1-2 line plain text summary of the email."),
});

const CategorizedEmailsSchema = z
  .object({
    "Job Alerts": z.array(EmailItemSchema),
    Newsletters: z.array(EmailItemSchema),
    Promotions: z.array(EmailItemSchema),
    Personal: z.array(EmailItemSchema),
    Work: z.array(EmailItemSchema),
    Others: z.array(EmailItemSchema),
  })
  .describe("Group of emails categorized by type.");

//NEW: Create a parser from the Zod schema
const parser = StructuredOutputParser.fromZodSchema(CategorizedEmailsSchema);

// Get the instructions for the model based on the schema
const formatInstructions = parser.getFormatInstructions();

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function categorizeEmails(emails) {
  const systemPrompt = `
You are an assistant that classifies emails and writes short summaries.
Your task is to review the provided JSON list of emails and return a single, valid JSON object that categorizes them and provides summaries.
${formatInstructions}
`;

  try {
    // 🔑 Use the model's structured output capability (JSON Mode)
    const structuredModel = model.withStructuredOutput(CategorizedEmailsSchema);

    const response = await structuredModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(emails, null, 2)),
    ]);

    // 🔑 The model's response.content is now a guaranteed JavaScript object/JSON.
    // We stringify it for tool consistency, but the underlying object is valid.
    return response;
  } catch (err) {
    console.error("Error in categorizeEmails execution:", err); // If the structured output still fails, return an empty structure
    return {
      "Job Alerts": [],
      "Newsletters": [],
      "Promotions": [],
      "Personal": [],
      "Work": [],
      "Others": [],
    };
  }
}
