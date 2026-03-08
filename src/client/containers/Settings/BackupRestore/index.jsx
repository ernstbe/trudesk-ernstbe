/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    2/8/19 1:36 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import {
  fetchMongoDBTools,
  fetchBackups,
  backupNow,
  fetchDeletedTickets,
  restoreDeletedTicket,
  permDeleteTicket,
  changeDeletedTicketsPage
} from 'actions/settings'
import Log from '../../../logger'

import { BACKUP_RESTORE_SHOW_OVERLAY, BACKUP_RESTORE_COMPLETE } from 'serverSocket/socketEventConsts'

import $ from 'jquery'
import UIKit from 'uikit'
import axios from 'axios'
import helpers from 'lib/helpers'

import ButtonGroup from 'components/ButtonGroup'
import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import Zone from 'components/ZoneBox/zone'
import ZoneBox from 'components/ZoneBox'

const BackupRestoreSettingsContainer = ({
  socket,
  active,
  fetchMongoDBTools,
  fetchBackups,
  fetchDeletedTickets,
  changeDeletedTicketsPage,
  backupNow,
  restoreDeletedTicket,
  permDeleteTicket,
  settings,
  t
}) => {
  const deletedTicketsPaginationRef = useRef(null)
  const backupUploadProgressbarRef = useRef(null)
  const backupUploadSelectRef = useRef(null)
  const backupUploadBtnRef = useRef(null)

  const initBackupUpload = useCallback(() => {
    const $progressBar = $(backupUploadProgressbarRef.current)
    const $uploadSelect = $(backupUploadSelectRef.current)
    const $uploadButton = $(backupUploadBtnRef.current)
    const bar = $progressBar.find('.uk-progress-bar')

    if ($progressBar.length < 1 || $uploadSelect.length < 1 || $uploadButton.length < 1) return

    const settings2 = {
      action: '/api/v1/backup/upload',
      allow: '*.zip',
      type: 'json',

      loadstart: function () {
        bar.css('width', '0%').text('0%')
        $progressBar.removeClass('hide')
        $uploadButton.addClass('hide')
      },
      notallowed: function () {
        helpers.UI.showSnackbar('Invalid File Type. Please upload a Zip file.', true)
      },
      error: function (err) {
        Log.error(err)
        helpers.UI.showSnackbar('An unknown error occurred. Check Console', true)
      },
      progress: function (percent) {
        percent = Math.ceil(percent)
        bar.css('width', percent + '%').text(percent + '%')
      },

      allcomplete: function (response) {
        Log.debug(response)
        if (!response.success) {
          helpers.UI.showSnackbar(response.error, true)
        }

        bar.css('width', '100%').text('100%')

        setTimeout(() => {
          $progressBar.addClass('hide')
          $uploadButton.removeClass('hide')
          $uploadSelect.val(null)
          fetchBackups()
          helpers.UI.playSound('success')
        }, 1500)
      }
    }

    UIKit.uploadSelect($uploadSelect, settings2)
  }, [fetchBackups])

  useEffect(() => {
    fetchMongoDBTools()
    fetchBackups()
    fetchDeletedTickets()
  }, [])

  useEffect(() => {
    initBackupUpload()
    if (!deletedTicketsPaginationRef.current) {
      const $deletedTicketPagination = $('.deletedTicketPagination')
      if ($deletedTicketPagination.length > 0) {
        deletedTicketsPaginationRef.current = UIKit.pagination($deletedTicketPagination, {
          items: settings.deletedTicketsCount,
          itemsOnPage: 15
        })
        $deletedTicketPagination.on('select.uk.pagination', (e, pageIndex) => {
          changeDeletedTicketsPage(pageIndex)
        })
      }
    }
  })

  useEffect(() => {
    if (deletedTicketsPaginationRef.current) {
      deletedTicketsPaginationRef.current.pages = Math.ceil(settings.deletedTicketsCount / 15)
        ? Math.ceil(settings.deletedTicketsCount / 15)
        : 1
      deletedTicketsPaginationRef.current.render()
      if (deletedTicketsPaginationRef.current.currentPage > deletedTicketsPaginationRef.current.pages - 1) { deletedTicketsPaginationRef.current.selectPage(deletedTicketsPaginationRef.current.pages - 1) }
    }
  }, [settings.deletedTicketsCount])

  useEffect(() => {
    return () => {
      if (deletedTicketsPaginationRef.current) {
        deletedTicketsPaginationRef.current.element.off('select.uk.pagination')
        deletedTicketsPaginationRef.current = null
      }
    }
  }, [])

  const onBackupNowClicked = useCallback(
    e => {
      e.preventDefault()
      backupNow()
    },
    [backupNow]
  )

  const oneRestoreClicked = useCallback(
    (e, backup) => {
      if (!backup) return

      const filename = backup.get('filename')
      UIKit.modal.confirm(
        `<h2>Are you sure?</h2>
        <p style="font-size: 15px;">
            <span class="uk-text-danger" style="font-size: 15px;">This is a permanent action.</span>
            This will earse the database and restore it with the selected backup file: <strong>${filename}</strong>
        </p>
        <p style="font-size: 12px;">
            Any users currently logged in will be presented with a blocking restore page. Preventing any further actions.
            Once complete all users are required to log in again.</p><br />
        <p style="font-size: 12px; font-style: italic;">
            This process may take a while depending on the size of the backup.
        </p>`,
        () => {
          socket.emit(BACKUP_RESTORE_SHOW_OVERLAY)

          axios
            .post('/api/v1/backup/restore', { file: filename })
            .then(() => {
              helpers.UI.showSnackbar('Restore Complete. Logging all users out...')
              setTimeout(() => {
                socket.emit(BACKUP_RESTORE_COMPLETE)
              }, 2000)
            })
            .catch(err => {
              Log.error(err)
              helpers.UI.showSnackbar('An error occurred. Check console.', true)
            })
        },
        {
          labels: { Ok: 'Yes', Cancel: 'No' },
          confirmButtonClass: 'md-btn-danger'
        }
      )
    },
    [socket]
  )

  const onDeleteBackupClicked = useCallback(
    (e, backup) => {
      UIKit.modal.confirm(
        `<h2 class="text-light">Are you sure?</h2>
        <p style="font-size: 14px;">This action is permanent and will destroy the backup file:
            <strong>${backup.get('filename')}</strong>
        </p>`,
        () => {
          axios
            .delete(`/api/v1/backup/${backup.get('filename')}`)
            .then(res => {
              if (res.data && res.data.success) {
                fetchBackups()
                helpers.UI.showSnackbar('Backup successfully deleted')
              } else {
                helpers.UI.showSnackbar('Unable to delete backup', true)
              }
            })
            .catch(err => {
              Log.error(err)
              helpers.UI.showSnackbar(`Error: ${err.response.data.error}`, true)
            })
        },
        {
          labels: { Ok: 'Yes', Cancel: 'No' },
          confirmButtonClass: 'md-btn-danger'
        }
      )
    },
    [fetchBackups]
  )

  const onRestoreTicketClicked = useCallback(
    (e, ticket) => {
      if (!ticket) return

      restoreDeletedTicket({ _id: ticket.get('_id') })
    },
    [restoreDeletedTicket]
  )

  const onDeleteTicketClicked = useCallback(
    (e, ticket) => {
      if (!ticket) return

      permDeleteTicket({ _id: ticket.get('_id') })
    },
    [permDeleteTicket]
  )

  return (
    <div className={active ? 'active' : 'hide'}>
      {!settings.hasMongoDBTools && (
        <SettingItem
          title={t('settings.mongoDbToolsNotFound')}
          subtitle={t('settings.mongoDbToolsHint')}
        >
          <div>
            <h4>{t('settings.installingMongoDbTools')}</h4>
            <p style={{ margin: '0 0 5px 0', fontSize: '13px' }}>
              {t('settings.mongoDbToolsRequired')}
            </p>
            <h5>
              <strong>Ubuntu 18.04</strong>
            </h5>
            <pre style={{ whiteSpace: 'pre-line' }}>sudo apt install -y mongo-tools</pre>
            <br />
            <h5>
              <strong>ArchLinux</strong>
            </h5>
            <pre style={{ whiteSpace: 'pre-line' }}>yay -S mongodb-tools-bin</pre>
            <br />
            <h5>
              <strong>Fedora 29</strong>
            </h5>
            <pre>dnf install -y mongo-tools</pre>
            <br />
            <h5>
              <strong>Alpine Linux</strong>
            </h5>
            <pre>apk add mongodb-tools</pre>
          </div>
        </SettingItem>
      )}
      {settings.hasMongoDBTools && (
        <div>
          <SettingItem
            title={t('settings.backupNow')}
            subtitle={t('settings.backupNowHint')}
            component={
              <div className='uk-float-right mt-10'>
                <div
                  className={
                    'uk-progress uk-progress-success uk-progress-striped uk-active' +
                    (!settings.backingup ? ' hide ' : '')
                  }
                  style={{ height: '31px', background: 'transparent' }}
                >
                  <div
                    className='uk-progress-bar uk-float-right'
                    style={{ width: '115px', fontSize: '11px', textTransform: 'uppercase', lineHeight: '31px' }}
                  >
                    {t('settings.pleaseWait')}
                  </div>
                </div>
                {!settings.backingup && (
                  <Button
                    text={t('settings.backupNow')}
                    style='success'
                    small
                    styleOverride={{ width: '115px' }}
                    onClick={e => onBackupNowClicked(e)}
                  />
                )}
              </div>
            }
          />
          <SettingItem
            title={t('settings.backups')}
            subtitle={t('settings.backupsHint')}
            component={
              <div className='uk-float-right mt-10' style={{ width: '85px' }}>
                <div
                  className='uk-progress hide'
                  style={{ height: '31px' }}
                  ref={backupUploadProgressbarRef}
                >
                  <div className='uk-progress-bar' style={{ width: 0, lineHeight: '31px', fontSize: '11px' }}>
                    0%
                  </div>
                </div>
                <form className='uk-form-stacked'>
                  <button
                    className='md-btn md-btn-small md-btn-primary uk-form-file no-ajaxy'
                    style={{ width: '85px' }}
                    ref={backupUploadBtnRef}
                  >
                    {t('settings.upload')}
                    <input ref={backupUploadSelectRef} type='file' name='backupUploadSelect' />
                  </button>
                </form>
              </div>
            }
          >
            {settings.backups.size < 1 && (
              <Zone>
                <ZoneBox>
                  <h2 className='uk-text-muted uk-text-center'>{t('settings.noBackups')}</h2>
                </ZoneBox>
              </Zone>
            )}
            {settings.backups.size > 0 && (
              <table className='uk-table mt-0'>
                <thead>
                  <tr>
                    <th>{t('settings.filename')}</th>
                    <th>{t('settings.size')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {settings.backups.map(backup => {
                    return (
                      <tr key={backup.get('filename')}>
                        <td className='valign-middle' style={{ width: '60%', height: '60px' }}>
                          {backup.get('filename')}
                        </td>
                        <td className='valign-middle'>{backup.get('sizeFormat')}</td>
                        <td className='uk-text-right valign-middle'>
                          <ButtonGroup>
                            <a
                              href={`/backups/${backup.get('filename')}`}
                              className='md-btn md-btn-small md-btn-wave no-ajaxy'
                              download={backup.get('filename')}
                            >
                              {t('settings.download')}
                            </a>
                            <Button
                              text={t('settings.restore')}
                              small
                              waves
                              onClick={e => oneRestoreClicked(e, backup)}
                            />
                            <Button
                              text={t('common.delete')}
                              small
                              style='danger'
                              waves
                              onClick={e => onDeleteBackupClicked(e, backup)}
                            />
                          </ButtonGroup>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </SettingItem>
        </div>
      )}
      <SettingItem title={t('settings.deletedTickets')} subtitle={t('settings.deletedTicketsHint')}>
        {settings.deletedTickets.size < 1 && (
          <Zone>
            <ZoneBox>
              <h2 className='uk-text-muted uk-text-center'>{t('settings.noDeletedTickets')}</h2>
            </ZoneBox>
          </Zone>
        )}
        {settings.deletedTickets.size > 0 && (
          <div>
            <table className='uk-table mt-0 mb-5'>
              <thead>
                <tr>
                  <th>{t('settings.uid')}</th>
                  <th>{t('common.subject')}</th>
                  <th>{t('common.group')}</th>
                  <th>{t('common.date')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {settings.deletedTickets.map(ticket => {
                  return (
                    <tr key={ticket.get('_id')}>
                      <td className='valign-middle' style={{ width: '10%', height: '60px' }}>
                        {ticket.get('uid')}
                      </td>
                      <td className='valign-middle' style={{ width: '30%' }}>
                        {ticket.get('subject')}
                      </td>
                      <td className='valign-middle' style={{ width: '30%' }}>
                        {ticket.getIn(['group', 'name'])}
                      </td>
                      <td className='valign-middle' style={{ width: '30%' }}>
                        {ticket.get('date')}
                      </td>
                      <td className='uk-text-right valign-middle'>
                        <ButtonGroup>
                          <Button
                            text={t('common.delete')}
                            style='danger'
                            small
                            waves
                            onClick={e => onDeleteTicketClicked(e, ticket)}
                          />
                          <Button
                            text={t('settings.restore')}
                            small
                            waves
                            onClick={e => onRestoreTicketClicked(e, ticket)}
                          />
                        </ButtonGroup>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className='uk-pagination deletedTicketPagination' />
          </div>
        )}
      </SettingItem>
    </div>
  )
}

BackupRestoreSettingsContainer.propTypes = {
  socket: PropTypes.object.isRequired,
  active: PropTypes.bool.isRequired,
  fetchMongoDBTools: PropTypes.func.isRequired,
  fetchBackups: PropTypes.func.isRequired,
  fetchDeletedTickets: PropTypes.func.isRequired,
  changeDeletedTicketsPage: PropTypes.func.isRequired,
  backupNow: PropTypes.func.isRequired,
  restoreDeletedTicket: PropTypes.func.isRequired,
  permDeleteTicket: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  socket: state.shared.socket,
  settings: state.settings
})

export default withTranslation()(connect(mapStateToProps, {
  fetchBackups,
  fetchMongoDBTools,
  backupNow,
  fetchDeletedTickets,
  restoreDeletedTicket,
  permDeleteTicket,
  changeDeletedTicketsPage
})(BackupRestoreSettingsContainer))
