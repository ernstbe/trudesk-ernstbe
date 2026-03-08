const i18next = require('i18next')

const enEmail = require('./locales/en/email.json')
const deEmail = require('./locales/de/email.json')

const i18n = i18next.createInstance()

i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['email'],
  defaultNS: 'email',
  resources: {
    en: { email: enEmail },
    de: { email: deEmail }
  },
  interpolation: {
    escapeValue: false
  }
})

/**
 * Get a translated email string.
 * @param {string} key - Translation key (e.g. 'ticketCreated')
 * @param {object} [options] - Interpolation variables and optional lng override
 * @returns {string}
 */
function t (key, options) {
  return i18n.t(key, options)
}

/**
 * Get a translator function fixed to a specific language.
 * @param {string} lng - Language code (e.g. 'de')
 * @returns {function}
 */
function getFixedT (lng) {
  return i18n.getFixedT(lng || 'en')
}

module.exports = { t, getFixedT, i18n }
