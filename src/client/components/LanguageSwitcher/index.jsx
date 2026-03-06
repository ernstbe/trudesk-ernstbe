import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

const LanguageSwitcher = ({ className }) => {
  const { i18n, t } = useTranslation()

  const changeLanguage = lng => {
    i18n.changeLanguage(lng)
  }

  const currentLang = i18n.language?.substring(0, 2) || 'en'

  return (
    <div className={`language-switcher ${className || ''}`}>
      <button
        className={`btn btn-lang ${currentLang === 'de' ? 'active' : ''}`}
        onClick={() => changeLanguage('de')}
        title={t('language.de')}
      >
        DE
      </button>
      <button
        className={`btn btn-lang ${currentLang === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        title={t('language.en')}
      >
        EN
      </button>
    </div>
  )
}

LanguageSwitcher.propTypes = {
  className: PropTypes.string
}

export default LanguageSwitcher
