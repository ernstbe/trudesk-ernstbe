import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import {
  fetchDashboardData,
  fetchDashboardTopGroups,
  fetchDashboardTopTags,
  fetchDashboardOverdueTickets
} from 'actions/dashboard'

import Grid from 'components/Grid'
import GridItem from 'components/Grid/GridItem'
import PageTitle from 'components/PageTitle'
import PageContent from 'components/PageContent'
import TruCard from 'components/TruCard'
import SingleSelect from 'components/SingleSelect'
import CountUp from 'components/CountUp'
import PeityBar from 'components/Peity/peity-bar'
import PeityPie from 'components/Peity/peity-pie'
import PeityLine from 'components/Peity/peity-line'
import MGraph from 'components/MGraph'
import D3Pie from 'components/D3/d3pie'

import moment from 'moment-timezone'
import helpers from 'lib/helpers'

function DashboardContainer ({
  fetchDashboardData: fetchDashboardDataAction,
  fetchDashboardTopGroups: fetchDashboardTopGroupsAction,
  fetchDashboardTopTags: fetchDashboardTopTagsAction,
  fetchDashboardOverdueTickets: fetchDashboardOverdueTicketsAction,
  dashboardState,
  t
}) {
  const [timespan, setTimespan] = useState(30)

  useEffect(() => {
    helpers.UI.setupPeity()

    fetchDashboardDataAction({ timespan: 30 })
    fetchDashboardTopGroupsAction({ timespan: 30 })
    fetchDashboardTopTagsAction({ timespan: 30 })
    fetchDashboardOverdueTicketsAction()
  }, [])

  const onTimespanChange = useCallback((e) => {
    e.preventDefault()
    setTimespan(e.target.value)
    fetchDashboardDataAction({ timespan: e.target.value })
    fetchDashboardTopGroupsAction({ timespan: e.target.value })
    fetchDashboardTopTagsAction({ timespan: e.target.value })
  }, [fetchDashboardDataAction, fetchDashboardTopGroupsAction, fetchDashboardTopTagsAction])

  const formatString = helpers.getLongDateFormat() + ' ' + helpers.getTimeFormat()
  const tz = helpers.getTimezone()
  const lastUpdatedFormatted = dashboardState.lastUpdated
    ? moment(dashboardState.lastUpdated, 'MM/DD/YYYY hh:mm:ssa')
      .tz(tz)
      .format(formatString)
    : t('dashboard.cacheLoading')

  const closedPercent = dashboardState.closedCount
    ? Math.round((dashboardState.closedCount / dashboardState.ticketCount) * 100).toString()
    : '0'

  return (
    <div>
      <PageTitle
        title={t('dashboard.title')}
        rightComponent={
          <div>
            <div className='uk-float-right' style={{ minWidth: 250 }}>
              <div style={{ marginTop: 8 }}>
                <SingleSelect
                  items={[
                    { text: t('dashboard.last30Days'), value: '30' },
                    { text: t('dashboard.last60Days'), value: '60' },
                    { text: t('dashboard.last90Days'), value: '90' },
                    { text: t('dashboard.last180Days'), value: '180' },
                    { text: t('dashboard.last365Days'), value: '365' }
                  ]}
                  defaultValue='30'
                  onSelectChange={e => onTimespanChange(e)}
                />
              </div>
            </div>
            <div className='uk-float-right uk-text-muted uk-text-small' style={{ margin: '23px 25px 0 0' }}>
              <strong>{t('dashboard.lastUpdated')}: </strong>
              <span>{lastUpdatedFormatted}</span>
            </div>
          </div>
        }
      />
      <PageContent>
        <Grid>
          <GridItem width='1-3'>
            <TruCard
              content={
                <div>
                  <div className='right uk-margin-top uk-margin-small-right'>
                    <PeityBar values='5,3,9,6,5,9,7' />
                  </div>
                  <span className='uk-text-muted uk-text-small'>
                    {t('dashboard.totalTickets', { days: timespan.toString() })}
                  </span>

                  <h2 className='uk-margin-remove'>
                    <CountUp startNumber={0} endNumber={dashboardState.ticketCount || 0} />
                  </h2>
                </div>
              }
            />
          </GridItem>
          <GridItem width='1-3'>
            <TruCard
              content={
                <div>
                  <div className='right uk-margin-top uk-margin-small-right'>
                    <PeityPie type='donut' value={(closedPercent !== 'NaN' ? closedPercent : '0') + '/100'} />
                  </div>
                  <span className='uk-text-muted uk-text-small'>{t('dashboard.ticketsCompleted')}</span>

                  <h2 className='uk-margin-remove'>
                    <span>{closedPercent !== 'NaN' ? closedPercent : '0'}</span>%
                  </h2>
                </div>
              }
            />
          </GridItem>
          <GridItem width='1-3'>
            <TruCard
              content={
                <div>
                  <div className='right uk-margin-top uk-margin-small-right'>
                    <PeityLine values='5,3,9,6,5,9,7,3,5,2' />
                  </div>
                  <span className='uk-text-muted uk-text-small'>{t('dashboard.avgResponseTime')}</span>

                  <h2 className='uk-margin-remove'>
                    <CountUp endNumber={dashboardState.ticketAvg || 0} extraText={t('dashboard.hours')} />
                  </h2>
                </div>
              }
            />
          </GridItem>
          <GridItem width='1-1' extraClass='uk-margin-medium-top'>
            <TruCard
              header={
                <div className='uk-text-left'>
                  <h6 style={{ padding: 15, margin: 0, fontSize: '14px' }}>{t('dashboard.ticketBreakdown')}</h6>
                </div>
              }
              fullSize
              hover={false}
              extraContentClass='nopadding'
              content={
                <div className='mGraph mGraph-panel' style={{ minHeight: 200, position: 'relative' }}>
                  <MGraph
                    height={250}
                    x_accessor='date'
                    y_accessor='value'
                    data={dashboardState.ticketBreakdownData.toJS() || []}
                  />
                </div>
              }
            />
          </GridItem>
          <GridItem width='1-2' extraClass='uk-margin-medium-top'>
            <TruCard
              loaderActive={dashboardState.loadingTopGroups}
              animateLoader
              style={{ minHeight: 256 }}
              header={
                <div className='uk-text-left'>
                  <h6 style={{ padding: 15, margin: 0, fontSize: '14px' }}>{t('dashboard.top5Groups')}</h6>
                </div>
              }
              content={
                <div>
                  <D3Pie data={dashboardState.topGroups.toJS()} />
                </div>
              }
            />
          </GridItem>
          <GridItem width='1-2' extraClass='uk-margin-medium-top'>
            <TruCard
              loaderActive={dashboardState.loadingTopTags}
              animateLoader
              animateDelay={800}
              style={{ minHeight: 256 }}
              header={
                <div className='uk-text-left'>
                  <h6 style={{ padding: 15, margin: 0, fontSize: '14px' }}>{t('dashboard.top10Tags')}</h6>
                </div>
              }
              content={
                <div>
                  <D3Pie type='donut' data={dashboardState.topTags.toJS()} />
                </div>
              }
            />
          </GridItem>
          <GridItem width='1-2' extraClass='uk-margin-medium-top'>
            <TruCard
              style={{ minHeight: 250 }}
              header={
                <div className='uk-text-left'>
                  <h6 style={{ padding: 15, margin: 0, fontSize: '14px' }}>{t('dashboard.overdueTickets')}</h6>
                </div>
              }
              content={
                <div className='uk-overflow-container'>
                  <table className='uk-table'>
                    <thead>
                      <tr>
                        <th className='uk-text-nowrap'>{t('dashboard.ticket')}</th>
                        <th className='uk-text-nowrap'>{t('common.status')}</th>
                        <th className='uk-text-nowrap'>{t('dashboard.subject')}</th>
                        <th className='uk-text-nowrap uk-text-right'>{t('dashboard.lastUpdatedCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardState.overdueTickets.map(ticket => {
                        return (
                          <tr key={ticket.get('_id')} className='uk-table-middle'>
                            <td className='uk-width-1-10 uk-text-nowrap'>
                              <a href={`/tickets/${ticket.get('uid')}`}>T#{ticket.get('uid')}</a>
                            </td>
                            <td className='uk-width-1-10 uk-text-nowrap'>
                              <span className='uk-badge ticket-status-open uk-width-1-1 ml-0'>{t('dashboard.open')}</span>
                            </td>
                            <td className='uk-width-6-10'>{ticket.get('subject')}</td>
                            <td className='uk-width-2-10 uk-text-right uk-text-muted uk-text-small'>
                              {moment
                                .utc(ticket.get('updated'))
                                .tz(helpers.getTimezone())
                                .format(helpers.getShortDateFormat())}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              }
            />
          </GridItem>
          <GridItem width='1-2' extraClass='uk-margin-medium-top'>
            <TruCard
              header={
                <div className='uk-text-left'>
                  <h6 style={{ padding: 15, margin: 0, fontSize: '14px' }}>{t('dashboard.quickStatsLast365')}</h6>
                </div>
              }
              content={
                <div className='uk-overflow-container'>
                  <table className='uk-table'>
                    <thead>
                      <tr>
                        <th className='uk-text-nowrap'>{t('dashboard.stat')}</th>
                        <th className='uk-text-nowrap uk-text-right'>{t('dashboard.value')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className='uk-table-middle'>
                        <td className='uk-width-6-10 uk-text-nowrap uk-text-muted uk-text-small'>
                          {t('dashboard.mostTicketsBy')}
                        </td>
                        <td id='mostRequester' className='uk-width-4-10 uk-text-right  uk-text-small'>
                          {dashboardState.mostRequester
                            ? `${dashboardState.mostRequester.get(
                                'name'
                              )} (${dashboardState.mostRequester.get('value')})`
                            : '--'}
                        </td>
                      </tr>

                      <tr className='uk-table-middle'>
                        <td className='uk-width-6-10 uk-text-nowrap uk-text-muted uk-text-small'>
                          {t('dashboard.mostCommentsBy')}
                        </td>
                        <td id='mostCommenter' className='uk-width-4-10 uk-text-right  uk-text-small'>
                          {dashboardState.mostCommenter
                            ? `${dashboardState.mostCommenter.get(
                                'name'
                              )} (${dashboardState.mostCommenter.get('value')})`
                            : '--'}
                        </td>
                      </tr>

                      <tr className='uk-table-middle'>
                        <td className='uk-width-6-10 uk-text-nowrap uk-text-muted uk-text-small'>
                          {t('dashboard.mostAssignedTo')}
                        </td>
                        <td id='mostAssignee' className='uk-width-4-10 uk-text-right  uk-text-small'>
                          {dashboardState.mostAssignee
                            ? `${dashboardState.mostAssignee.get(
                                'name'
                              )} (${dashboardState.mostAssignee.get('value')})`
                            : '--'}
                        </td>
                      </tr>

                      <tr className='uk-table-middle'>
                        <td className='uk-width-6-10 uk-text-nowrap uk-text-muted uk-text-small'>
                          {t('dashboard.mostActiveTicket')}
                        </td>
                        <td className='uk-width-4-10 uk-text-right  uk-text-small'>
                          <a id='mostActiveTicket' href='#'>
                            {dashboardState.mostActiveTicket
                              ? `T#${dashboardState.mostActiveTicket.get('uid')}`
                              : '--'}
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              }
            />
          </GridItem>
        </Grid>
      </PageContent>
    </div>
  )
}

DashboardContainer.propTypes = {
  fetchDashboardData: PropTypes.func.isRequired,
  fetchDashboardTopGroups: PropTypes.func.isRequired,
  fetchDashboardTopTags: PropTypes.func.isRequired,
  fetchDashboardOverdueTickets: PropTypes.func.isRequired,
  dashboardState: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  dashboardState: state.dashboardState
})

export default withTranslation()(connect(mapStateToProps, {
  fetchDashboardData,
  fetchDashboardTopGroups,
  fetchDashboardTopTags,
  fetchDashboardOverdueTickets
})(DashboardContainer))
