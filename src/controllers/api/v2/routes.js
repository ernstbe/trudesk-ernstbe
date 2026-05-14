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
 *  Updated:    5/17/22 2:15 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const rateLimits = require('../../../middleware/rateLimits')

module.exports = function (middleware, router, controllers) {
  // Shorten Vars
  const apiv2Auth = middleware.apiv2
  const apiv2 = controllers.api.v2
  const apiv1 = controllers.api.v1
  const isAdmin = middleware.isAdmin
  const isAgentOrAdmin = middleware.isAgentOrAdmin
  const canUser = middleware.canUser

  // Common
  router.get('/api/v2/login', apiv2Auth, apiv2.accounts.sessionUser)
  router.post('/api/v2/login', rateLimits.apiLogin, controllers.api.v2.common.login)
  router.post('/api/v2/token', rateLimits.apiLogin, controllers.api.v2.common.token)
  router.get('/api/v2/viewdata', middleware.loadCommonData, controllers.api.v2.common.viewData)

  // Accounts
  router.get('/api/v2/accounts', apiv2Auth, canUser('accounts:view'), apiv2.accounts.get)
  router.post('/api/v2/accounts', apiv2Auth, canUser('accounts:create'), apiv2.accounts.create)
  router.put('/api/v2/accounts/profile', apiv2Auth, apiv2.accounts.saveProfile)
  router.post('/api/v2/accounts/profile/mfa', apiv2Auth, apiv2.accounts.generateMFA)
  router.post('/api/v2/accounts/profile/mfa/verify', apiv2Auth, apiv2.accounts.verifyMFA)
  router.post('/api/v2/accounts/profile/mfa/disable', apiv2Auth, apiv2.accounts.disableMFA)
  router.post('/api/v2/accounts/profile/update-password', apiv2Auth, apiv2.accounts.updatePassword)
  router.put('/api/v2/accounts/:username', apiv2Auth, canUser('accounts:update'), apiv2.accounts.update)

  // Ticket Info
  router.get('/api/v2/tickets/info/types', apiv2Auth, apiv2.tickets.info.types)
  router.get('/api/v2/tickets/status', apiv2Auth, apiv2.tickets.info.statuses)
  router.get('/api/v2/tickets/priorities', apiv2Auth, apiv2.tickets.info.priorities)
  router.get('/api/v2/tickets/tags', apiv2Auth, apiv2.tickets.info.tags)

  // Tickets
  router.get('/api/v2/tickets', apiv2Auth, canUser('tickets:view'), apiv2.tickets.get)
  router.post('/api/v2/tickets', apiv2Auth, canUser('tickets:create'), apiv2.tickets.create)
  router.get('/api/v2/tickets/overdue', apiv2Auth, isAgentOrAdmin, apiv2.tickets.overdue)
  // Static segments registered BEFORE /tickets/:uid so Express doesn't
  // match them as a uid. Same reason /batch and /stats below precede /:uid.
  router.get('/api/v2/tickets/search', apiv2Auth, canUser('tickets:view'), apiv1.tickets.search)
  router.get('/api/v2/tickets/group/:id', apiv2Auth, canUser('tickets:view'), apiv1.tickets.getByGroup)
  router.get('/api/v2/tickets/stats', apiv2Auth, canUser('tickets:view'), apiv2.tickets.getStats)
  router.get('/api/v2/tickets/stats/group/:group', apiv2Auth, canUser('tickets:view'), apiv2.tickets.getGroupStats)
  router.get('/api/v2/tickets/stats/user/:user', apiv2Auth, canUser('tickets:view'), apiv2.tickets.getUserStats)
  router.get('/api/v2/tickets/stats/:timespan', apiv2Auth, canUser('tickets:view'), apiv2.tickets.getStats)
  router.post('/api/v2/tickets/transfer/:uid', apiv2Auth, isAdmin, apiv2.tickets.transferToThirdParty)
  router.get('/api/v2/tickets/:uid', apiv2Auth, canUser('tickets:view'), apiv2.tickets.single)
  router.get('/api/v2/tickets/:uid/deadline', apiv2Auth, canUser('tickets:view'), apiv2.tickets.deadline)
  router.put('/api/v2/tickets/batch', apiv2Auth, canUser('tickets:update'), apiv2.tickets.batchUpdate)
  router.delete('/api/v2/tickets/batch', apiv2Auth, canUser('tickets:delete'), apiv2.tickets.batchDelete)
  router.put('/api/v2/tickets/:uid', apiv2Auth, canUser('tickets:update'), apiv2.tickets.update)
  router.put('/api/v2/tickets/:uid/metadata', apiv2Auth, canUser('tickets:update'), apiv2.tickets.updateMetadata)
  router.put('/api/v2/tickets/:uid/subscribe', apiv2Auth, canUser('tickets:view'), apiv2.tickets.subscribe)
  router.post('/api/v2/tickets/:uid/comments', apiv2Auth, canUser('comments:create'), apiv2.tickets.postComment)
  router.post('/api/v2/tickets/:uid/notes', apiv2Auth, canUser('tickets:notes'), apiv2.tickets.postNote)
  router.post('/api/v2/tickets/:uid/checklist', apiv2Auth, canUser('tickets:update'), apiv2.tickets.checklist.add)
  router.put('/api/v2/tickets/:uid/checklist/:itemId', apiv2Auth, canUser('tickets:update'), apiv2.tickets.checklist.update)
  router.delete('/api/v2/tickets/:uid/checklist/:itemId', apiv2Auth, canUser('tickets:update'), apiv2.tickets.checklist.remove)
  router.delete('/api/v2/tickets/:uid', apiv2Auth, canUser('tickets:delete'), apiv2.tickets.delete)
  router.delete('/api/v2/tickets/deleted/:id', apiv2Auth, isAdmin, apiv2.tickets.permDelete)

  // Users / notifications (v2)
  router.get('/api/v2/users/notifications', apiv2Auth, apiv2.users.getNotifications)
  router.get('/api/v2/users/notifications/count', apiv2Auth, apiv2.users.getNotificationCount)

  // Groups
  router.get('/api/v2/groups', apiv2Auth, apiv2.groups.get)
  router.post('/api/v2/groups', apiv2Auth, canUser('groups:create'), apiv2.groups.create)
  router.put('/api/v2/groups/:id', apiv2Auth, canUser('groups:update'), apiv2.groups.update)
  router.delete('/api/v2/groups/:id', apiv2Auth, canUser('groups:delete'), apiv2.groups.delete)

  // Teams
  router.get('/api/v2/teams', apiv2Auth, canUser('teams:view'), apiv2.teams.get)
  router.post('/api/v2/teams', apiv2Auth, canUser('teams:create'), apiv2.teams.create)
  router.put('/api/v2/teams/:id', apiv2Auth, canUser('teams:update'), apiv2.teams.update)
  router.delete('/api/v2/teams/:id', apiv2Auth, canUser('teams:delete'), apiv2.teams.delete)

  // Departments
  router.get('/api/v2/departments', apiv2Auth, canUser('departments:view'), apiv2.departments.get)
  router.post('/api/v2/departments', apiv2Auth, canUser('departments:create'), apiv2.departments.create)
  router.put('/api/v2/departments/:id', apiv2Auth, canUser('departments:update'), apiv2.departments.update)
  router.delete('/api/v2/departments/:id', apiv2Auth, canUser('departments:delete'), apiv2.departments.delete)

  // Notices
  router.get('/api/v2/notices', apiv2Auth, apiv2.notices.get)
  router.post('/api/v2/notices', apiv2Auth, canUser('notices:create'), apiv2.notices.create)
  // router.get('/api/v2/notices/active', apiv2Auth, apiv2.notices.getActive)
  router.put('/api/v2/notices/:id', apiv2Auth, canUser('notices:update'), apiv2.notices.update)
  router.put('/api/v2/notices/:id/activate', apiv2Auth, canUser('notices:activate'), apiv2.notices.activate)
  router.get('/api/v2/notices/clear', apiv2Auth, canUser('notices:deactivate'), apiv2.notices.clear)
  router.delete('/api/v2/notices/:id', apiv2Auth, canUser('notices:delete'), apiv2.notices.delete)

  router.get('/api/v2/messages/conversations', apiv2Auth, apiv2.messages.getConversations)
  router.get('/api/v2/messages/conversations/:id', apiv2Auth, apiv2.messages.single)
  router.delete('/api/v2/messages/conversations/:id', apiv2Auth, apiv2.messages.deleteConversation)

  // Recurring Tasks
  router.get('/api/v2/recurring-tasks', apiv2Auth, isAgentOrAdmin, apiv2.recurringTasks.get)
  router.get('/api/v2/recurring-tasks/:id', apiv2Auth, isAgentOrAdmin, apiv2.recurringTasks.single)
  router.post('/api/v2/recurring-tasks', apiv2Auth, isAdmin, apiv2.recurringTasks.create)
  router.put('/api/v2/recurring-tasks/:id', apiv2Auth, isAdmin, apiv2.recurringTasks.update)
  router.delete('/api/v2/recurring-tasks/:id', apiv2Auth, isAdmin, apiv2.recurringTasks.delete)

  // Ticket Templates
  router.get('/api/v2/ticket-templates', apiv2Auth, isAgentOrAdmin, apiv2.ticketTemplates.get)
  router.get('/api/v2/ticket-templates/:id', apiv2Auth, isAgentOrAdmin, apiv2.ticketTemplates.single)
  router.post('/api/v2/ticket-templates', apiv2Auth, isAgentOrAdmin, apiv2.ticketTemplates.create)
  router.put('/api/v2/ticket-templates/:id', apiv2Auth, isAgentOrAdmin, apiv2.ticketTemplates.update)
  router.delete('/api/v2/ticket-templates/:id', apiv2Auth, isAgentOrAdmin, apiv2.ticketTemplates.delete)

  // Assets
  router.get('/api/v2/assets', apiv2Auth, isAgentOrAdmin, apiv2.assets.get)
  router.get('/api/v2/assets/export/pdf', apiv2Auth, isAgentOrAdmin, apiv2.assets.exportPdf)
  router.get('/api/v2/assets/:id', apiv2Auth, isAgentOrAdmin, apiv2.assets.single)
  router.post('/api/v2/assets', apiv2Auth, isAdmin, apiv2.assets.create)
  router.put('/api/v2/assets/:id', apiv2Auth, isAdmin, apiv2.assets.update)
  router.delete('/api/v2/assets/:id', apiv2Auth, isAdmin, apiv2.assets.delete)
  router.post('/api/v2/assets/:id/link-ticket', apiv2Auth, isAgentOrAdmin, apiv2.assets.linkTicket)

  // Reports
  router.get('/api/v2/reports/handover', apiv2Auth, isAgentOrAdmin, apiv2.reports.handover)
  router.get('/api/v2/reports/sitzung', apiv2Auth, isAgentOrAdmin, apiv2.reports.sitzung)

  // Calendar
  router.get('/api/v2/calendar/events', apiv2Auth, isAgentOrAdmin, apiv2.calendar.getEvents)

  // Dashboard
  router.get('/api/v2/dashboard/widgets', apiv2Auth, isAgentOrAdmin, apiv2.dashboard.widgets)

  // Documents
  router.get('/api/v2/documents', apiv2Auth, isAgentOrAdmin, apiv2.documents.get)
  router.get('/api/v2/documents/:id', apiv2Auth, isAgentOrAdmin, apiv2.documents.single)
  router.post('/api/v2/documents', apiv2Auth, isAgentOrAdmin, apiv2.documents.create)
  router.put('/api/v2/documents/:id', apiv2Auth, isAgentOrAdmin, apiv2.documents.update)
  router.delete('/api/v2/documents/:id', apiv2Auth, isAdmin, apiv2.documents.delete)
  router.get('/api/v2/documents/:id/download', apiv2Auth, isAgentOrAdmin, apiv2.documents.download)

  // ElasticSearch
  router.get('/api/v2/es/search', middleware.api, apiv2.elasticsearch.search)
  router.get('/api/v2/es/rebuild', apiv2Auth, isAdmin, apiv2.elasticsearch.rebuild)
  router.get('/api/v2/es/status', apiv2Auth, isAdmin, apiv2.elasticsearch.status)

  router.get('/api/v2/mailer/check', apiv2Auth, isAdmin, apiv2.mailer.check)

  // ── Endpoints originally introduced under v1 that don't need v2-specific
  // ── reshaping: mount the same controllers under /api/v2/* so a client
  // ── that's standardized on v2 doesn't have to mix base URLs. The
  // ── controllers read `req.user` which apiv2Auth populates the same way.
  // ── Two known caveats live with this:
  //  - sessions.list/revokeOthers read `req.headers.accesstoken` to flag
  //    the current session. Under the JWT path that header is absent and
  //    the `isCurrent` flag falls back to false — degraded but functional.
  //  - The webpush + bug-report flows are header-agnostic, so they behave
  //    identically on v1 and v2.

  // Sessions
  router.get('/api/v2/account/sessions', apiv2Auth, apiv1.sessions.list)
  router.delete('/api/v2/account/sessions', apiv2Auth, apiv1.sessions.revokeOthers)
  router.delete('/api/v2/account/sessions/:deviceId', apiv2Auth, apiv1.sessions.revoke)

  // Web Push subscriptions
  router.get('/api/v2/account/push/vapid-public', apiv2Auth, apiv1.pushSubscriptions.vapidPublic)
  router.post('/api/v2/account/push/subscribe', apiv2Auth, apiv1.pushSubscriptions.subscribe)
  router.delete('/api/v2/account/push/subscribe', apiv2Auth, apiv1.pushSubscriptions.unsubscribe)

  // Bug reports
  router.post('/api/v2/bug-reports', apiv2Auth, apiv1.bugReports.submit)
  router.get('/api/v2/bug-reports', apiv2Auth, apiv1.bugReports.list)
  router.patch('/api/v2/bug-reports/:id', apiv2Auth, apiv1.bugReports.setResolved)
  router.delete('/api/v2/bug-reports/:id', apiv2Auth, apiv1.bugReports.remove)

  // Attachment remove — same path shape as v1 so the PWA can migrate
  // without rewriting the URL builder.
  router.delete('/api/v2/tickets/:tid/attachments/remove/:aid', apiv2Auth, apiv1.tickets.removeAttachment)

  // Notifications — v1 bolted these onto /users/notifications because of
  // legacy controller layout. v2 gets a cleaner /notifications root.
  router.post('/api/v2/notifications/:id/read', apiv2Auth, apiv1.users.markNotificationRead)
  router.post('/api/v2/notifications/read-all', apiv2Auth, apiv1.users.markAllNotificationsRead)
}
