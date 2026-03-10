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
 *  Updated:    3/14/19 12:14 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { withTranslation } from 'react-i18next'

import { fetchTeams, unloadTeams, deleteTeam } from 'actions/teams'
import { showModal } from 'actions/common'

import PageTitle from 'components/PageTitle'
import PageContent from 'components/PageContent'

import helpers from 'lib/helpers'
import Avatar from 'components/Avatar/Avatar'
import Button from 'components/Button'
import UIKit from 'uikit'
import Table from 'components/Table'
import TableRow from 'components/Table/TableRow'
import TableCell from 'components/Table/TableCell'
import TableHeader from 'components/Table/TableHeader'
import ButtonGroup from 'components/ButtonGroup'

function TeamsContainer ({
  teamsState,
  fetchTeams: fetchTeamsAction,
  unloadTeams: unloadTeamsAction,
  deleteTeam: deleteTeamAction,
  showModal: showModalAction,
  t
}) {
  useEffect(() => {
    fetchTeamsAction({ page: 0, limit: 1000 })
  }, [])

  useEffect(() => {
    helpers.resizeFullHeight()
  })

  useEffect(() => {
    return () => {
      unloadTeamsAction()
    }
  }, [unloadTeamsAction])

  const onCreateTeamClick = useCallback((e) => {
    e.preventDefault()
    showModalAction('CREATE_TEAM')
  }, [showModalAction])

  const onEditTeamClick = useCallback((team) => {
    if (team.members) {
      team.members = team.members.map(m => {
        return m._id
      })
    } else {
      team.members = []
    }

    showModalAction('EDIT_TEAM', { team })
  }, [showModalAction])

  const onDeleteTeamClick = useCallback((_id) => {
    UIKit.modal.confirm(
      `<h2>${t('modals.areYouSure')}</h2>
        <p style="font-size: 15px;">
            <span class="uk-text-danger" style="font-size: 15px;">${t('common.permanentAction')}</span>
        </p>
        <p style="font-size: 12px;">
            ${t('teams.deleteWarning')}
        </p>
        `,
      () => {
        deleteTeamAction({ _id })
      },
      {
        labels: { Ok: t('common.yes'), Cancel: t('common.no') },
        confirmButtonClass: 'md-btn-danger'
      }
    )
  }, [t, deleteTeamAction])

  const tableItems = teamsState.teams.map(team => {
    return (
      <TableRow key={team.get('_id')} className='vam nbb'>
        <TableCell style={{ fontWeight: 500, padding: '18px 15px' }}>{team.get('name')}</TableCell>
        <TableCell style={{ padding: '13px 8px 8px 8px' }}>
          {team.get('members') &&
            team.get('members').size > 0 &&
            team
              .get('members')
              .filter(user => {
                return !user.get('deleted')
              })
              .map(user => {
                const profilePic = user.get('image') || 'defaultProfile.jpg'
                return (
                  <div
                    key={user.get('_id')}
                    className='uk-float-left uk-position-relative mb-10'
                    data-uk-tooltip='{pos: "bottom"}'
                    title={user.get('fullname')}
                  >
                    <Avatar image={profilePic} userId={user.get('_id')} size={25} style={{ marginRight: 5 }} />
                  </div>
                )
              })}
        </TableCell>
        <TableCell style={{ textAlign: 'right', paddingRight: 15 }}>
          <ButtonGroup>
            {helpers.canUser('teams:update', true) && (
              <Button text={t('common.edit')} small waves onClick={() => onEditTeamClick(team.toJS())} />
            )}
            {helpers.canUser('teams:delete', true) && (
              <Button
                text={t('common.delete')}
                style='danger'
                small
                waves
                onClick={() => onDeleteTeamClick(team.get('_id'))}
              />
            )}
          </ButtonGroup>
        </TableCell>
      </TableRow>
    )
  })

  return (
    <div>
      <PageTitle
        title={t('teams.title')}
        shadow
        rightComponent={
          <div className='uk-grid uk-grid-collapse'>
            <div className='uk-width-1-1 mt-15 uk-text-right'>
              <Button
                text={t('common.create')}
                flat={false}
                small
                waves={false}
                extraClass='hover-accent'
                onClick={e => onCreateTeamClick(e)}
              />
            </div>
          </div>
        }
      />
      <PageContent id='teams-page-content' padding={0} paddingBottom={0}>
        <Table
          headers={[
            <TableHeader key={0} width='25%' height={40} text={t('common.name')} padding='8px 8px 8px 15px' />,
            <TableHeader key={1} width='50%' text={t('teams.teamMembers')} />,
            <TableHeader key={2} width={130} text={t('teams.teamActions')} />
          ]}
        >
          {teamsState.teams.size < 1 && (
            <TableRow>
              <TableCell colSpan={3}>
                <h5 style={{ paddingLeft: 8 }}>{t('teams.noTeams')}</h5>
              </TableCell>
            </TableRow>
          )}
          {tableItems}
        </Table>
      </PageContent>
    </div>
  )
}

TeamsContainer.propTypes = {
  teamsState: PropTypes.object.isRequired,
  fetchTeams: PropTypes.func.isRequired,
  unloadTeams: PropTypes.func.isRequired,
  deleteTeam: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  teamsState: state.teamsState
})

export default withTranslation()(connect(mapStateToProps, { fetchTeams, unloadTeams, deleteTeam, showModal })(TeamsContainer))
