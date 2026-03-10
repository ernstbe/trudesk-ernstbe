/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const i18n = require('../../src/i18n')

describe('i18n', function () {
  it('should translate ticket created subject in English', function () {
    const result = i18n.t('ticketCreated', { uid: 1001, subject: 'Test' })
    expect(result).to.equal('Ticket #1001 Created - Test')
  })

  it('should translate ticket created subject in German', function () {
    const result = i18n.t('ticketCreated', { uid: 1001, subject: 'Test', lng: 'de' })
    expect(result).to.equal('Ticket #1001 erstellt - Test')
  })

  it('should translate ticket updated subject', function () {
    const result = i18n.t('ticketUpdated', { uid: 1002, subject: 'Bug Fix' })
    expect(result).to.equal('Updated: Ticket #1002 - Bug Fix')
  })

  it('should translate account recovery subject', function () {
    const result = i18n.t('accountRecovery', { siteTitle: 'MySite' })
    expect(result).to.equal('[MySite] Account Recovery')
  })

  it('should translate welcome account subject', function () {
    const result = i18n.t('welcomeAccount', { siteTitle: 'MySite' })
    expect(result).to.equal('Welcome to MySite! - Here are your account details.')
  })

  it('should return a fixed translator for German', function () {
    const tDe = i18n.getFixedT('de')
    expect(tDe).to.be.a('function')

    const result = tDe('accountRecovery', { siteTitle: 'MeineSite' })
    expect(result).to.equal('[MeineSite] Kontowiederherstellung')
  })

  it('should fall back to English for unknown language', function () {
    const result = i18n.t('ticketCreated', { uid: 1, subject: 'X', lng: 'fr' })
    expect(result).to.equal('Ticket #1 Created - X')
  })

  it('should fall back to key for unknown translation key', function () {
    const result = i18n.t('nonExistentKey')
    expect(result).to.equal('nonExistentKey')
  })
})
