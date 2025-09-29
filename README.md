# 🚀 Email Agent CLI

AI-powered email assistant that helps you manage Gmail efficiently through a command-line interface.

## ✨ Features

- **📧 Fetch Emails**: Get your latest 10 emails with AI categorization
- **➡️ Pagination**: Navigate through email pages using next page tokens  
- **✉️ Send Emails**: Compose and send new emails with AI-generated content
- **↩️ Smart Replies**: Reply to emails using natural language identifiers
- **🧠 In-Memory Cache**: Stores recent emails for quick reply access
- **🤖 AI Integration**: Uses Google Gemini for email categorization and body generation

## 🛠️ Prerequisites

- **Bun Runtime**: Install from [bun.sh](https://bun.sh)
- **Google API Credentials**: Gmail API access with OAuth2
- **Environment Variables**: Google Gemini API key

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd EmailAgent

# Install dependencies using Bun
bun install
```

### 2. Setup Google API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth2 credentials and download as `clientSecret.json`
5. Place `clientSecret.json` in the project root

### 3. Setup Environment Variables

Create a `.env` file in the project root:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com).

### 4. Run the CLI

```bash
# Start Email Agent
bun run start

# Or run directly
bun run cli.js
```

## 🎯 Usage

### Available Commands

| Command | Description |
|---------|-------------|
| `fetch` | Get your latest 10 emails |
| `next` | Get next page of emails |
| `send` | Send a new email |  
| `reply` | Reply to an email from memory |
| `help` | Show help information |
| `exit` | Exit the application |

### Command Examples

#### 📧 Fetch Latest Emails
```
🤖 Email Agent > fetch
```
This will retrieve and categorize your latest 10 emails.

#### ➡️ Get Next Page
```  
🤖 Email Agent > next
```
Use this after `fetch` to get the next 10 emails.

#### ✉️ Send New Email
```
🤖 Email Agent > send
📮 Recipient email address: john@example.com
📝 Subject line: Project Update
💭 What should the email say?: Ask about the progress on phase 2 and timeline
```

#### ↩️ Reply to Email
```
🤖 Email Agent > reply
🔍 Enter email identifier: John Smith
💭 What should your reply say?: Confirm receipt and ask for meeting tomorrow
```

You can identify emails by:
- Sender name (e.g., "John Smith")
- Subject keywords (e.g., "Project Update") 
- Gmail message ID

## 🏗️ Architecture

```
├── cli.js              # Main CLI interface
├── agent/
│   └── agent.js        # AI agent with LangChain integration
├── aiServices/
│   ├── memory.js       # In-memory email cache
│   ├── categorize.js   # Email categorization logic
│   └── tools/
│       ├── emailFetchTool.js  # Email fetching tool
│       └── sendEmailTool.js   # Email sending tool
└── services/
    ├── gmailService.js # Gmail API integration
    └── extractLinks.js # Link extraction utility
```

## 🔧 Configuration

### User ID
The default user ID is `user123`. You can modify this in `cli.js`:

```javascript
let currentUserId = "your_preferred_user_id";
```

### Email Limits
- Fetches 10 emails per page by default
- Stores last fetched emails in memory for replies
- Supports pagination with next page tokens

## 🐛 Troubleshooting

### Authentication Issues
1. Ensure `clientSecret.json` is in project root
2. Run the CLI and follow OAuth flow to generate `token.json`
3. Check that Gmail API is enabled in Google Cloud Console

### API Rate Limits
- Gmail API has quotas - if you hit limits, wait before retrying
- Gemini API also has rate limits for AI features

### Memory Issues
- Email cache is cleared when CLI restarts
- Only the last 10 fetched emails are kept in memory

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make changes and test with Bun
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🚀 Development with Bun

This project is optimized for Bun runtime:

```bash
# Install dependencies
bun install

# Run in development  
bun run dev

# Run production
bun run start
```

Bun provides faster startup times and better performance compared to Node.js for this CLI application.
