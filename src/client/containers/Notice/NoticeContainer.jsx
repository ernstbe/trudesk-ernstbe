import React, { useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import Log from '../../logger'
import axios from 'axios'
import { fetchNotices, deleteNotice, unloadNotices } from 'actions/notices'
import { showModal } from 'actions/common'

import { NOTICE_SHOW, NOTICE_CLEAR } from 'serverSocket/socketEventConsts'

import PageTitle from 'components/PageTitle'
import PageContent from 'components/PageContent'
import Table from 'components/Table'
import TableHeader from 'components/Table/TableHeader'
import TableCell from 'components/Table/TableCell'
import TableRow from 'components/Table/TableRow'
import ButtonGroup from 'components/ButtonGroup'
import Button from 'components/Button'

import helpers from 'lib/helpers'
import UIKit from 'uikit'

function NoticeContainer ({
  socket,
  notices,
  loading,
  fetchNotices: fetchNoticesAction,
  deleteNotice: deleteNoticeAction,
  unloadNotices: unloadNoticesAction,
  showModal: showModalAction
}) {
  useEffect(() => {
    fetchNoticesAction()
  }, [])

  useEffect(() => {
    helpers.resizeAll()
  })

  useEffect(() => {
    return () => {
      unloadNoticesAction()
    }
  }, [unloadNoticesAction])

  const onActivateNotice = useCallback((noticeId) => {
    if (!helpers.canUser('notices:activate')) {
      helpers.UI.showSnackbar('Unauthorized', true)
      return
    }

    axios
      .put('/api/v2/notices/' + noticeId + '/activate', { active: true })
      .then(() => {
        socket.emit(NOTICE_SHOW, { noticeId })
      })
      .catch(err => {
        Log.error(err)
        helpers.UI.showSnackbar(err, true)
      })
  }, [socket])

  const onDeactivateNotice = useCallback(() => {
    axios
      .get('/api/v1/notices/clearactive')
      .then(() => {
        socket.emit(NOTICE_CLEAR)

        helpers.UI.showSnackbar('Notice has been deactivated', false)
      })
      .catch(err => {
        Log.error(err)
        helpers.UI.showSnackbar(err, true)
      })
  }, [socket])

  const onEditNotice = useCallback((notice) => {
    showModalAction('EDIT_NOTICE', { notice })
  }, [showModalAction])

  const onDeleteNotice = useCallback((noticeId) => {
    UIKit.modal.confirm(
      `<h2>Are you sure?</h2>
        <p style="font-size: 15px;">
            <span class="uk-text-danger" style="font-size: 15px;">This is a permanent action.</span>
        </p>
        `,
      () => {
        deleteNoticeAction({ _id: noticeId })
      },
      {
        labels: { Ok: 'Yes', Cancel: 'No' },
        confirmButtonClass: 'md-btn-danger'
      }
    )
  }, [deleteNoticeAction])

  const tableItems = notices.map(notice => {
    const formattedDate =
      helpers.formatDate(notice.get('date'), helpers.getShortDateFormat()) +
      ', ' +
      helpers.formatDate(notice.get('date'), helpers.getTimeFormat())
    return (
      <TableRow key={notice.get('_id')} className='vam nbb' clickable={false}>
        <TableCell style={{ padding: '18px 15px' }}>
          <span style={{ display: 'block', width: 15, height: 15, backgroundColor: notice.get('color') }} />
        </TableCell>
        <TableCell style={{ fontWeight: 500, padding: '18px 5px' }}>{notice.get('name')}</TableCell>
        <TableCell style={{ padding: '18px 5px' }}>{notice.get('message')}</TableCell>
        <TableCell style={{ padding: '18px 5px' }}>{formattedDate}</TableCell>
        <TableCell>
          <ButtonGroup>
            <Button
              icon='spatial_audio_off'
              style='success'
              small
              waves
              onClick={() => onActivateNotice(notice.get('_id'))}
            />
            <Button
              icon='edit'
              extraClass='hover-primary'
              small
              waves
              onClick={() => onEditNotice(notice.toJS())}
            />
            <Button
              icon='delete'
              extraClass='hover-danger'
              small
              waves
              onClick={() => onDeleteNotice(notice.get('_id'))}
            />
          </ButtonGroup>
        </TableCell>
      </TableRow>
    )
  })
  return (
    <div>
      <PageTitle
        title='Notices'
        shadow={false}
        rightComponent={
          <div className='uk-grid uk-grid-collapse'>
            <div className='uk-width-1-1 mt-15 uk-text-right'>
              {helpers.canUser('notices:deactivate') && (
                <Button
                  text='Deactivate'
                  flat={false}
                  small
                  waves={false}
                  extraClass='hover-accent'
                  onClick={() => onDeactivateNotice()}
                />
              )}
              {helpers.canUser('notices:create') && (
                <Button
                  text='Create'
                  flat={false}
                  small
                  waves={false}
                  extraClass='hover-success'
                  onClick={() => {
                    showModalAction('CREATE_NOTICE')
                  }}
                />
              )}
            </div>
          </div>
        }
      />
      <PageContent padding={0} paddingBottom={0} extraClass='uk-position-relative'>
        <Table
          style={{ margin: 0 }}
          extraClass='pDataTable'
          stickyHeader
          striped
          headers={[
            <TableHeader key={0} width={45} height={50} text='' />,
            <TableHeader key={1} width='20%' text='Name' />,
            <TableHeader key={2} width='60%' text='Message' />,
            <TableHeader key={3} width='10%' text='Date' />,
            <TableHeader key={4} width={150} text='' />
          ]}
        >
          {!loading && notices.size < 1 && (
            <TableRow clickable={false}>
              <TableCell colSpan={10}>
                <h5 style={{ margin: 10 }}>No Notices Found</h5>
              </TableCell>
            </TableRow>
          )}
          {tableItems}
        </Table>
      </PageContent>
    </div>
  )
}

NoticeContainer.propTypes = {
  socket: PropTypes.object.isRequired,
  notices: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,

  fetchNotices: PropTypes.func.isRequired,
  deleteNotice: PropTypes.func.isRequired,
  unloadNotices: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  socket: state.shared.socket,
  notices: state.noticesState.notices,
  loading: state.noticesState.loading
})

export default connect(mapStateToProps, {
  fetchNotices,
  deleteNotice,
  unloadNotices,

  showModal
})(NoticeContainer)
