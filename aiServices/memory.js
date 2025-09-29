// aiServices/memory.js
/**
 * Simple, in-memory store for conversational context (cache)
 * This holds the raw email objects from the last fetch operation,
 * which are needed for contextual replies.
 */

// Stores the raw email objects retrieved from the Gmail API
// Structure: [{ id, subject, from, messageId, ... }, ...]
let lastFetchedEmails = []; 


//  Updates the memory store with the latest fetched emails.
export function setLastFetchedEmails(emails) {
    // Only store non-null emails
    lastFetchedEmails = emails.filter(e => e && e.id);
    console.log(`[Memory] Stored ${lastFetchedEmails.length} emails for reply context.`);
}


// Retrieves the last set of fetched emails.
export function getLastFetchedEmails() {
    return lastFetchedEmails;
}


// Finds an email in memory based on its ID.
export function findEmailById(id) {
    return lastFetchedEmails.find(e => e.id === id) || null;
}