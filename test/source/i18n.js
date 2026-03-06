/* eslint-disable no-unused-expressions */
var expect = require('chai').expect
var i18n = require('../../src/i18n')

describe('i18n', function () {
  it('should translate ticket created subject in English', function () {
    var result = i18n.t('ticketCreated', { uid: 1001, subject: 'Test' })
    expect(result).to.equal('Ticket #1001 Created - Test')
  })

  it('should translate ticket created subject in German', function () {
    var result = i18n.t('ticketCreated', { uid: 1001, subject: 'Test', lng: 'de' })
    expect(result).to.equal('Ticket #1001 erstellt - Test')
  })

  it('should translate ticket updated subject', function () {
    var result = i18n.t('ticketUpdated', { uid: 1002, subject: 'Bug Fix' })
    expect(result).to.equal('Updated: Ticket #1002 - Bug Fix')
  })

  it('should translate account recovery subject', function () {
    var result = i18n.t('accountRecovery', { siteTitle: 'MySite' })
    expect(result).to.equal('[MySite] Account Recovery')
  })

  it('should translate welcome account subject', function () {
    var result = i18n.t('welcomeAccount', { siteTitle: 'MySite' })
    expect(result).to.equal('Welcome to MySite! - Here are your account details.')
  })

  it('should return a fixed translator for German', function () {
    var tDe = i18n.getFixedT('de')
    expect(tDe).to.be.a('function')

    var result = tDe('accountRecovery', { siteTitle: 'MeineSite' })
    expect(result).to.equal('[MeineSite] Kontowiederherstellung')
  })

  it('should fall back to English for unknown language', function () {
    var result = i18n.t('ticketCreated', { uid: 1, subject: 'X', lng: 'fr' })
    expect(result).to.equal('Ticket #1 Created - X')
  })

  it('should fall back to key for unknown translation key', function () {
    var result = i18n.t('nonExistentKey')
    expect(result).to.equal('nonExistentKey')
  })
})
