/**
 * Parses text for @username patterns, returns array of usernames found
 * @param {String} text - Text to parse for mentions
 * @returns {Array} - Array of unique usernames found
 */
function parseMentions (text) {
  if (!text || typeof text !== 'string') return []

  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g
  const mentions = []
  let match
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1])
  }
  return [...new Set(mentions)] // deduplicate
}

module.exports = { parseMentions }
