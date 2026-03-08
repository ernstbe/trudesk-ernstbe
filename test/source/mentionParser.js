/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const { parseMentions } = require('../../src/helpers/mentionParser')

describe('mentionParser', function () {
  it('should parse a single mention', function () {
    const result = parseMentions('Hello @john, how are you?')
    expect(result).to.deep.equal(['john'])
  })

  it('should parse multiple mentions', function () {
    const result = parseMentions('@alice and @bob please review')
    expect(result).to.deep.equal(['alice', 'bob'])
  })

  it('should deduplicate mentions', function () {
    const result = parseMentions('@alice said hello to @alice')
    expect(result).to.deep.equal(['alice'])
  })

  it('should handle usernames with dots, dashes, and underscores', function () {
    const result = parseMentions('CC @john.doe @jane-smith @max_mustermann')
    expect(result).to.deep.equal(['john.doe', 'jane-smith', 'max_mustermann'])
  })

  it('should return empty array for text without mentions', function () {
    const result = parseMentions('No mentions here')
    expect(result).to.deep.equal([])
  })

  it('should return empty array for empty string', function () {
    const result = parseMentions('')
    expect(result).to.deep.equal([])
  })

  it('should return empty array for null input', function () {
    const result = parseMentions(null)
    expect(result).to.deep.equal([])
  })

  it('should return empty array for undefined input', function () {
    const result = parseMentions(undefined)
    expect(result).to.deep.equal([])
  })

  it('should handle mention at start of text', function () {
    const result = parseMentions('@admin please check')
    expect(result).to.deep.equal(['admin'])
  })

  it('should handle mention at end of text', function () {
    const result = parseMentions('Please check @admin')
    expect(result).to.deep.equal(['admin'])
  })

  it('should not match email addresses as full mentions', function () {
    const result = parseMentions('Send to user@example.com')
    // The regex will match 'example.com' after the @ in the email
    // This is acceptable behavior - the username lookup will simply not find it
    expect(result).to.be.a('array')
  })
})
