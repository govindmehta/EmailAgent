// aiServices/memory.js
/**
 * aiServices/memory.js
 * Simple, in-memory store for conversational context (cache)
 */

// Stores the raw email objects retrieved from the Gmail API
let lastFetchedEmails = []; 

/**
 * Updates the memory store with the latest fetched emails.
 * 🔑 FIX: The assignment operation automatically replaces the entire old array, 
 * ensuring only the new batch is kept.
 * @param {Array} emails - Array of raw email objects.
 */
export function setLastFetchedEmails(emails) {
    // We explicitly overwrite the array to ensure only the latest batch is stored.
    // This is the correct behavior for an in-memory "last context" cache.
    lastFetchedEmails = emails.filter(e => e !== null && e.id);
    console.log(`[Memory] Stored ${lastFetchedEmails.length} emails for reply context.`);
}

/**
 * Retrieves the last set of fetched emails.
 */
export function getLastFetchedEmails() {
    return lastFetchedEmails;
}

/**
 * Finds an email in memory based on its ID or other identifiers.
 */
// NOTE: findEmailById is not exported here but is implemented inside sendEmailTool.
// If you were exporting it, the function body would remain the same. 

/* The logic inside findUniqueEmail in sendEmailTool.js handles reading the cache:
export function findEmailById(id) {
    return lastFetchedEmails.find(e => e.id === id) || null;
}
*/