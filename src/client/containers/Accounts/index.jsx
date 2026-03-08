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
 *  Updated:    2/22/19 11:18 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { showModal } from 'actions/common'
import { fetchAccounts, deleteAccount, enableAccount, unloadAccounts } from 'actions/accounts'

import Avatar from 'components/Avatar/Avatar'
import TruCard from 'components/TruCard'
import PageTitle from 'components/PageTitle'
import Grid from 'components/Grid'
import GridItem from 'components/Grid/GridItem'
import PageContent from 'components/PageContent'
import DropdownItem from 'components/Dropdown/DropdownItem'
import ButtonGroup from 'components/ButtonGroup'
import Button from 'components/Button'
import InfiniteScroll from 'react-infinite-scroller'

import helpers from 'lib/helpers'

function AccountsContainer ({
  title = 'Accounts',
  view = 'customers',
  fetchAccounts: fetchAccountsAction,
  deleteAccount: deleteAccountAction,
  enableAccount: enableAccountAction,
  unloadAccounts: unloadAccountsAction,
  showModal: showModalAction,
  common,
  shared,
  accountsState,
  t
}) {
  const [initialLoad, setInitialLoad] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  // eslint-disable-next-line no-unused-vars
  const [pageStart, setPageStart] = useState(-1)

  useEffect(() => {
    setInitialLoad(false)
  }, [])

  useEffect(() => {
    helpers.resizeFullHeight()
  })

  useEffect(() => {
    return () => {
      unloadAccountsAction()
    }
  }, [unloadAccountsAction])

  const onEditAccountClicked = useCallback((e, user) => {
    e.preventDefault(e)
    const canEditAccount = helpers.hasHierarchyOverRole(user.getIn(['role', '_id']))
    showModalAction('EDIT_ACCOUNT', {
      edit: canEditAccount,
      user: user.toJS(),
      roles: common.roles,
      groups: common.groups
    })
  }, [showModalAction, common])

  const onDeleteAccountClicked = useCallback((e, user) => {
    e.preventDefault()
    deleteAccountAction({ username: user.get('username') })
  }, [deleteAccountAction])

  const onEnableAccountClicked = useCallback((e, user) => {
    e.preventDefault()
    enableAccountAction({ username: user.get('username') })
  }, [enableAccountAction])

  const getUsersWithPage = useCallback((page) => {
    setHasMore(false)
    fetchAccountsAction({ page, limit: 25, type: view, showDeleted: true }).then(({ response }) => {
      setHasMore(response.count >= 25)
    })
  }, [fetchAccountsAction, view])

  const items =
    accountsState.accounts &&
    accountsState.accounts.map(user => {
      const userImage = user.get('image') || 'defaultProfile.jpg'
      const actionMenu = [<DropdownItem key={0} text={t('common.edit')} onClick={e => onEditAccountClicked(e, user)} />]
      if (user.get('deleted')) { actionMenu.push(<DropdownItem key={2} text={t('accounts.enableAccount')} onClick={e => onEnableAccountClicked(e, user)} />) } else {
        actionMenu.push(
          <DropdownItem
            key={1}
            text={t('common.delete')}
            extraClass='uk-text-danger'
            onClick={e => onDeleteAccountClicked(e, user)}
          />
        )
      }
      const isAdmin = user.getIn(['role', 'isAdmin']) || false
      const isAgent = user.getIn(['role', 'isAgent']) || false
      const customer = !isAdmin && !isAgent
      const isDeleted = user.get('deleted') || false
      return (
        <GridItem key={user.get('_id')} width='1-5' xLargeWidth='1-6' extraClass='mb-25'>
          <TruCard
            loaderActive={user.get('loading')}
            menu={actionMenu}
            extraHeadClass={
              (isAdmin ? 'tru-card-head-admin' : '') +
              (!isAdmin && isAgent ? 'tru-card-head-agent' : '') +
              (isDeleted ? ' tru-card-head-deleted' : '')
            }
            header={
              <div>
                <div className='account-image relative uk-display-inline-block'>
                  <Avatar
                    size={82}
                    userId={user.get('_id')}
                    image={userImage}
                    style={{ marginTop: 10 }}
                    showBorder
                    borderColor='#ffffff'
                    showLargerBubble
                  />
                </div>
                <h3 className='tru-card-head-text uk-text-center'>
                  {user.get('fullname')}
                  <span className='uk-text-truncate'>{user.get('title')}</span>
                </h3>
              </div>
            }
            content={
              <ul className='tru-list'>
                <li>
                  <div className='tru-list-content'>
                    <span className='tru-list-heading'>{t('accounts.role')}</span>
                    <span className='uk-text-small uk-text-muted'>{user.getIn(['role', 'name'])}</span>
                  </div>
                </li>
                <li>
                  <div className='tru-list-content'>
                    <span className='tru-list-heading'>{t('common.email')}</span>
                    <span className='uk-text-small uk-text-muted'>
                      <a href={`mailto:${user.get('email')}`}>{user.get('email')}</a>
                    </span>
                  </div>
                </li>
                <li>
                  {customer && user.get('groups') && (
                    <div className='tru-list-content'>
                      <span className='tru-list-heading'>{t('accounts.groups')}</span>
                      <span className='uk-text-small uk-text-muted uk-text-truncate'>
                        {user.get('groups').map(group => {
                          return group.get('name') + (user.get('groups').toArray().length > 1 ? ', ' : '')
                        })}
                      </span>
                    </div>
                  )}
                  {!customer && user.get('teams') && (
                    <div className='tru-list-content'>
                      <span className='tru-list-heading'>{t('teams.title')}</span>
                      <span className='uk-text-small uk-text-muted uk-text-truncate'>
                        {user.get('teams').map(team => {
                          return team.get('name') + (user.get('teams').toArray().length > 1 ? ', ' : '')
                        })}
                      </span>
                    </div>
                  )}
                </li>
                {!customer && user.get('departments') && (
                  <li>
                    <div className='tru-list-content'>
                      <span className='tru-list-heading'>{t('departments.title')}</span>
                      <span className='uk-text-small uk-text-muted uk-text-truncate'>
                        {user.get('departments').map(department => {
                          return department.get('name') + (user.get('departments').toArray().length > 1 ? ', ' : '')
                        })}
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            }
          />
        </GridItem>
      )
    })

  return (
    <div>
      <PageTitle
        title={title}
        rightComponent={
          <div className='uk-grid uk-grid-collapse'>
            {/* <div className={'uk-width-3-4 pr-10'}> */}
            {/*  <div className='md-input-wrapper' style={{ marginTop: '10px' }}> */}
            {/*    <label className={'uk-form-label'}>Find Account</label> */}
            {/*    <input type='text' className={'md-input uk-margin-remove'} onKeyUp={e => onSearchKeyUp(e)} /> */}
            {/*    <div className='md-input-bar' /> */}
            {/*  </div> */}
            {/* </div> */}
            <div className='uk-width-1-4 mt-15 pr-20 uk-clearfix'>
              <ButtonGroup classNames='uk-clearfix uk-float-right'>
                <Button
                  text={t('common.create')}
                  hasDropdown={false}
                  flat={false}
                  small
                  waves={false}
                  extraClass='hover-accent'
                  onClick={() => showModalAction('CREATE_ACCOUNT')}
                />
                {/* {helpers.canUser('accounts:import', true) && ( */}
                {/*  <DropdownTrigger mode={'click'} pos={'bottom-right'} offset={5} extraClass={'uk-float-right'}> */}
                {/*    <Button */}
                {/*      text={''} */}
                {/*      hasDropdown={true} */}
                {/*      small={true} */}
                {/*      waves={false} */}
                {/*      styleOverride={{ padding: '0 5px 0 0' }} */}
                {/*      extraClass={'pr-5 no-border-radius nbl bg-accent md-color-white hover-accent'} */}
                {/*    /> */}
                {/*    <Dropdown small={true}> */}
                {/*      <DropdownHeader text={'Account Actions'} /> */}
                {/*      <DropdownItem text={'Import'} href={'/accounts/import'} /> */}
                {/*    </Dropdown> */}
                {/*  </DropdownTrigger> */}
                {/* )} */}
              </ButtonGroup>
            </div>
          </div>
        }
      />
      <PageContent id='accounts-page-content'>
        <InfiniteScroll
          pageStart={pageStart}
          loadMore={getUsersWithPage}
          hasMore={hasMore}
          initialLoad={initialLoad}
          threshold={25}
          loader={
            <div className='uk-width-1-1 uk-text-center' key={0}>
              <i className='uk-icon-refresh uk-icon-spin' />
            </div>
          }
          useWindow={false}
          getScrollParent={() => document.getElementById('accounts-page-content')}
        >
          <Grid gutterSize='medium'>{items}</Grid>
        </InfiniteScroll>
      </PageContent>
    </div>
  )
}

AccountsContainer.propTypes = {
  title: PropTypes.string.isRequired,
  view: PropTypes.string.isRequired,
  fetchAccounts: PropTypes.func.isRequired,
  deleteAccount: PropTypes.func.isRequired,
  enableAccount: PropTypes.func.isRequired,
  unloadAccounts: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  common: PropTypes.object.isRequired,
  shared: PropTypes.object.isRequired,
  accountsState: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  shared: state.shared,
  accountsState: state.accountsState,
  common: state.common
})

export default withTranslation()(connect(mapStateToProps, { fetchAccounts, deleteAccount, enableAccount, unloadAccounts, showModal })(
  AccountsContainer
))
