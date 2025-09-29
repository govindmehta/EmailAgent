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

// Fallback categorization without AI
function fallbackCategorizeEmails(emails) {
  const categorized = {
    "Job Alerts": [],
    "Newsletters": [],
    "Promotions": [],
    "Personal": [],
    "Work": [],
    "Others": []
  };

  emails.forEach(email => {
    const subject = email.subject?.toLowerCase() || '';
    const from = email.from?.toLowerCase() || '';
    const snippet = email.snippet?.toLowerCase() || '';
    
    // Add summary as snippet truncated to reasonable length
    const emailWithSummary = {
      ...email,
      summary: email.snippet ? email.snippet.substring(0, 100) + (email.snippet.length > 100 ? "..." : "") : "No content available"
    };
    
    // Simple keyword-based categorization
    if (subject.includes('job') || subject.includes('career') || subject.includes('hiring') || 
        from.includes('jobs') || from.includes('career') || from.includes('linkedin')) {
      categorized["Job Alerts"].push(emailWithSummary);
    } else if (subject.includes('newsletter') || subject.includes('digest') || subject.includes('weekly') ||
               from.includes('newsletter') || from.includes('digest')) {
      categorized["Newsletters"].push(emailWithSummary);
    } else if (subject.includes('sale') || subject.includes('offer') || subject.includes('discount') ||
               subject.includes('promo') || snippet.includes('unsubscribe')) {
      categorized["Promotions"].push(emailWithSummary);
    } else if (from.includes('work') || from.includes('team') || from.includes('project') ||
               subject.includes('meeting') || subject.includes('project')) {
      categorized["Work"].push(emailWithSummary);
    } else if (from.includes('gmail.com') || from.includes('yahoo.com') || from.includes('hotmail.com')) {
      categorized["Personal"].push(emailWithSummary);
    } else {
      categorized["Others"].push(emailWithSummary);
    }
  });

  return categorized;
}

export async function categorizeEmails(emails) {
  // Skip AI categorization if API key is missing or if there are too many emails
  if (!process.env.GOOGLE_API_KEY || emails.length > 50) {
    console.log("🔄 Using fallback categorization (API key missing or too many emails)");
    return fallbackCategorizeEmails(emails);
  }

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

    // Validate the response structure
    if (!response || typeof response !== 'object') {
      throw new Error("Invalid response structure from AI model");
    }

    return response;
  } catch (err) {
    console.error("Error in categorizeEmails execution:", err.message); 
    
    // Enhanced fallback: try to categorize manually without AI
    console.log("🔄 Falling back to simple categorization...");
    
    try {
      return fallbackCategorizeEmails(emails);
    } catch (fallbackErr) {
      console.error("Fallback categorization also failed:", fallbackErr.message);
      
      // If everything fails, return empty structure
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
}
