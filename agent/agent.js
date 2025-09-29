import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages"; // Use @langchain/core
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from "dotenv";
import { emailFetchTool } from "../aiServices/tools/emailFetchTool.js";
import { sendEmailTool } from "../aiServices/tools/sendEmailTool.js";

dotenv.config();

export const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash", // a recent, capable model
  temperature: 0.3,
  apiKey: process.env.GOOGLE_API_KEY,
});

export const modelWithTools = model.bindTools([emailFetchTool, sendEmailTool]);

export async function chatWithUser(userInput) {
  const systemPrompt = `
You are a helpful and efficient email assistant. You have access to two tools: **fetchEmails** and **sendEmail**.

## Tool Usage Rules

### 📧 Fetching Emails (fetchEmails)
- **Goal:** Summarize the user's inbox.
- **Trigger:** You **must** call "fetchEmails" when the user asks to read, summarize, or list emails.
- **Parameters:** Always fetch 10 emails at a time, passing the required 'userId' and the optional 'pageToken'.

### ✍️ Sending Emails (sendEmail)
- **Trigger:** You **must** call "sendEmail" when the user explicitly asks to **send, reply, or draft** a message.
- **Argument Derivation (New Message):** If the user is sending a *new* email, extract the **recipient**, **subject**, and **bodyInstruction** directly from the prompt. The 'replyToId' must be omitted.
- **Argument Derivation (Reply):** If the user asks to **reply** to an email:
    - You **must** extract the unique **Gmail ID** and pass it as the **'replyToId'** argument.
    - Omit the 'recipient' and 'subject' arguments, as the tool will infer them from the ID using memory.
    - Extract the user's core instruction as the **'bodyInstruction'**.
- **Body Generation:** The 'bodyInstruction' you provide must lead to a complete, polite, and professional email body.
- **Output:** Report the success or failure of the send operation clearly and concisely.

---

## Final Output Formatting

After executing **fetchEmails**, you must generate a user-friendly summary following these rules:

1.  Group the results clearly under the **Category** name (e.g., **Job Alerts**).
2.  For each email, use a consistently indented block format, followed by one line of space before the next email in that category:

    \`\`\`
    **Category Name:**
      * Subject: [Email Subject]
      * From: [Sender Name] <[sender@email.com]>
      * Summary: [A brief 1-2 line summary of the email content.]
      * Gmail Link: [Direct Link to the Email]

    [One line of space]
    \`\`\`

3.  **Pagination:** Check the tool output for the token delimiter.
    - If \`---NEXT_PAGE_TOKEN_START---\` is found, include the clean token at the end using the format: **Next Page Token: [token]**.
    - If no token is found, state: "No more emails found."
4.  Do NOT show the raw JSON or the token delimiters to the user.
`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userInput),
  ];

  // First invocation: get a response (either a tool call or a final answer)
  let response = await modelWithTools.invoke(messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    for (const toolCall of response.tool_calls) {
      const toolName = toolCall.name;
      const toolArgs = toolCall.args;
      const toolCallId = toolCall.id;

      let toolResult;

      if (toolName === "fetchEmails") {
        toolResult = await emailFetchTool.func(toolArgs);
      } else if (toolName === "sendEmail") {
        // 🔑 Handle the new tool
        toolResult = await sendEmailTool.func(toolArgs);
      } // Add the tool execution to history

      messages.push(response);
      messages.push(
        new ToolMessage({
          tool_call_id: toolCallId,
          content: toolResult,
        })
      );
      //Second invocation: Model generates final response based on tool result
      // console.log("before");
      response = await modelWithTools.invoke(messages);
      // console.log("Response:", response);
      // console.log("after");
    }
  }
  return response.content;
}
