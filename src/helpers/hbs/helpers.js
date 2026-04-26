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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

/*
 * Handlebars Comparison Helpers
 * Copyright (c) 2013 Jon Schlinkert, Brian Woodward, contributors
 * Licensed under the MIT License (MIT).
 */
'use strict'

// node_modules
const dayjs = require('../dayjs')

// The module to be exported
const helpers = {
  concat: function (a, b, space, comma) {
    if (space && (comma === false || (typeof comma === 'object' && comma !== null))) {
      return a.toString() + ' ' + b.toString()
    }

    if (comma === true) {
      return a.toString() + ', ' + b.toString()
    }

    return a.toString() + b.toString()
  },

  contains: function (str, pattern, options) {
    if (str.indexOf(pattern) !== -1) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  stringify: function (s) {
    return JSON.stringify(s)
  },

  and: function (a, b, options) {
    if (a && b) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  gt: function (value, test, options) {
    if (value > test) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  gte: function (value, test, options) {
    if (value >= test) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  is: function (value, test, options) {
    if (value === null || value === 'undefined') {
      return options.inverse(this)
    }

    if (value === test) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  isAsString: function (value, test, options) {
    if (value === null || value === 'undefined') {
      return options.inverse(this)
    }

    if (value.toString() === test.toString()) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  isnot: function (value, test, options) {
    if (value !== test) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  isNotAsString: function (value, test, options) {
    if (value === null || value === 'undefined') {
      return options.inverse(this)
    }

    if (value.toString() !== test.toString()) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  lt: function (value, test, options) {
    if (value < test) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  lte: function (value, test, options) {
    if (value <= test) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /*
   * Or
   * Conditionally render a block if one of the values is truthy.
   */
  or: function (a, b, options) {
    if (a || b) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /*
   * ifNth
   * Conditionally render a block if mod(nr, v) is 0
   */
  ifNth: function (nr, v, options) {
    v = v + 1
    if (v % nr === 0) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /**
   * {{#compare}}...{{/compare}}
   *
   * @credit: OOCSS
   * @param left value
   * @param operator The operator, must be between quotes ">", "=", "<=", etc...
   * @param right value
   * @param options option object sent by handlebars
   * @return {String} formatted html
   *
   * @example:
   *   {{#compare unicorns "<" ponies}}
   *     I knew it, unicorns are just low-quality ponies!
   *   {{/compare}}
   *
   *   {{#compare value ">=" 10}}
   *     The value is greater or equal than 10
   *     {{else}}
   *     The value is lower than 10
   *   {{/compare}}
   */
  compare: function (left, operator, right, options) {
    /* jshint eqeqeq: false */

    if (arguments.length < 3) {
      throw new Error('Handlebars Helper "compare" needs 2 parameters')
    }

    if (options === undefined) {
      options = right
      right = operator
      operator = '==='
    }

    const operators = {
      '==': function (l, r) {
        return l === r
      },
      '===': function (l, r) {
        return l === r
      },
      '!=': function (l, r) {
        return l !== r
      },
      '!==': function (l, r) {
        return l !== r
      },
      '<': function (l, r) {
        return l < r
      },
      '>': function (l, r) {
        return l > r
      },
      '<=': function (l, r) {
        return l <= r
      },
      '>=': function (l, r) {
        return l >= r
      },
      typeof: function (l, r) {
        // eslint-disable-next-line
        return typeof l === r
      }
    }

    if (!operators[operator]) {
      throw new Error('Handlebars Helper "compare" doesn\'t know the operator ' + operator)
    }

    const result = operators[operator](left, right)

    if (result) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /**
   * {{if_eq}}
   *
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{if_eq this compare=that}}
   */
  if_eq: function (context, options) {
    if (context === options.hash.compare) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /**
   * {{unless_eq}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{unless_eq this compare=that}}
   */
  unless_eq: function (context, options) {
    if (context === options.hash.compare) {
      return options.inverse(this)
    }

    return options.fn(this)
  },

  /**
   * {{if_gt}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{if_gt this compare=that}}
   */
  if_gt: function (context, options) {
    if (context > options.hash.compare) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /**
   * {{unless_gt}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{unless_gt this compare=that}}
   */
  unless_gt: function (context, options) {
    if (context > options.hash.compare) {
      return options.inverse(this)
    }

    return options.fn(this)
  },

  /**
   * {{if_lt}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{if_lt this compare=that}}
   */
  if_lt: function (context, options) {
    if (context < options.hash.compare) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /**
   * {{unless_lt}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{unless_lt this compare=that}}
   */
  unless_lt: function (context, options) {
    if (context < options.hash.compare) {
      return options.inverse(this)
    }

    return options.fn(this)
  },

  /**
   * {{if_gteq}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{if_gteq this compare=that}}
   */
  if_gteq: function (context, options) {
    if (context >= options.hash.compare) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /**
   * {{unless_gteq}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{unless_gteq this compare=that}}
   */
  unless_gteq: function (context, options) {
    if (context >= options.hash.compare) {
      return options.inverse(this)
    }

    return options.fn(this)
  },

  /**
   * {{if_lteq}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{if_lteq this compare=that}}
   */
  if_lteq: function (context, options) {
    if (context <= options.hash.compare) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /**
   * {{unless_lteq}}
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{unless_lteq this compare=that}}
   */
  unless_lteq: function (context, options) {
    if (context <= options.hash.compare) {
      return options.inverse(this)
    }

    return options.fn(this)
  },

  /**
   * {{ifAny}}
   * Similar to {{#if}} block helper but accepts multiple arguments.
   * @author: Dan Harper <http://github.com/danharper>
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{ifAny this compare=that}}
   */
  ifAny: function () {
    const argLength = arguments.length - 2
    const content = arguments[argLength + 1]
    let success = true
    let i = 0
    while (i < argLength) {
      if (!arguments[i]) {
        success = false
        break
      }
      i += 1
    }
    if (success) {
      return content(this)
    }

    return content.inverse(this)
  },

  /**
   * {{ifEven}}
   * Determine whether or not the @index is an even number or not
   * @author: Stack Overflow Answer <http://stackoverflow.com/questions/18976274/odd-and-even-number-comparison-helper-for-handlebars/18993156#18993156>
   * @author: Michael Sheedy <http://github.com/sheedy> (found code and added to repo)
   *
   * @param  context
   * @param  options
   * @return {Boolean}
   *
   * @example: {{ifEven @index}}
   */
  ifEven: function (conditional, options) {
    if (conditional % 2 === 0) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  /**
   * {{forEach}}
   * Credit: http://bit.ly/14HLaDR
   *
   * @param  {Array}   array
   * @param  {Function} fn
   *
   * @example:
   *   var accounts = [
   *     {'name': 'John', 'email': 'john@example.com'},
   *     {'name': 'Malcolm', 'email': 'malcolm@example.com'},
   *     {'name': 'David', 'email': 'david@example.com'}
   *   ];
   *
   *   {{#forEach accounts}}
   *     <a href="mailto:{{ email }}" title="Send an email to {{ name }}">
   *       {{ name }}
   *     </a>{{#unless isLast}}, {{/unless}}
   *   {{/forEach}}
   */
  forEach: function (array, fn) {
    const total = array.length
    let buffer = ''
    // Better performance: http://jsperf.com/for-vs-forEach/2
    let i = 0
    while (i < total) {
      // stick an index property onto the item, starting
      // with 1, may make configurable later
      const item = array[i]
      item.index = i + 1
      item._total = total
      item.isFirst = i === 0
      item.isLast = i === total - 1
      // show the inside of the block
      buffer += fn.fn(item)
      i++
    }
    // return the finished buffer
    return buffer
  },

  formatNumber: function (num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  },

  now: function () {
    return dayjs.utc()
  },

  formatDate: function (date, format, timezone) {
    if (!date) return ''
    return dayjs
      .utc(date)
      .tz(typeof timezone === 'string' ? timezone : global.timezone)
      .format(format)
  },

  formatDateParse: function (date, parseFormat, returnFormat) {
    return dayjs
      .utc(date, parseFormat)
      .tz(global.timezone)
      .format(returnFormat)
  },

  durationFormat: function (duration, parseFormat) {
    const dur = dayjs.duration(duration, parseFormat)
    const parts = []
    const y = Math.floor(dur.asYears())
    const mo = dur.months()
    const d = dur.days()
    const h = dur.hours()
    const m = dur.minutes()
    if (y) parts.push(y + ' year')
    if (mo) parts.push(mo + ' month')
    if (d) parts.push(d + ' day')
    if (h) parts.push(h + ' hour')
    if (m) parts.push(m + ' min')
    return parts.length > 0 ? parts.join(', ') : '0 min'
  },

  calendarDate: function (date, fallback) {
    return dayjs
      .utc(date)
      .tz(global.timezone)
      .calendar(null, {
        sameDay: '[Today at] h:mm A',
        lastDay: '[Yesterday at] h:mm A',
        nextDay: '[Tomorrow at] h:mm A',
        lastWeek: '[Last] ddd [at] h:mm A',
        nextWeek: 'ddd [at] h:mm A',
        sameElse: 'MMM D, YYYY [at] h:mm A'
      })
  },

  fromNow: function (date) {
    if (date === undefined) {
      return 'Never'
    }

    return dayjs
      .utc(date)
      .tz(global.timezone)
      .fromNow()
  },

  firstCap: function (str) {
    if (str === undefined) return ''
    if (str.length > 0) {
      if (str[0] === str[0].toUpperCase()) {
        return str
      }

      return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      })
    }
  },

  lowercase: function (str) {
    return str.toLowerCase()
  },

  substring: function (start, len, options) {
    return options
      .fn(this)
      .toString()
      .substr(start, len)
  },

  isNotNull: function (obj, options) {
    if (!(obj === undefined || obj === null)) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  isNotTrue: function (obj, options) {
    if (obj === true || (typeof obj.toLowerCase === 'function' && obj.toLowerCase() === 'true')) { return options.inverse(this) }

    return options.fn(this)
  },

  split: function (arr, sep) {
    let str = ''
    arr.forEach(function (obj) {
      str += obj + ' ' + sep + ' '
    })

    return str
  },

  trim: function (string) {
    if (string === undefined || string === null || string.length < 1 || typeof string === 'object') {
      return ''
    }
    return string.trim()
  },

  isNull: function (obj, options) {
    if (obj === undefined || obj === null) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  isOwner: function (user, owner, options) {
    if (user._id.toString() === owner._id.toString()) return options.fn(this)

    return options.inverse(this)
  },

  hasPermOverRole: function (ownerRole, userRole, perm, options) {
    if (ownerRole === undefined || userRole === undefined || perm === undefined) return options.inverse(this)
    if (
      typeof ownerRole !== 'object' ||
      typeof userRole !== 'object' ||
      ownerRole._id === undefined ||
      userRole._id === undefined
    ) {
      throw new Error('Invalid Type sent to hasPermOverRole. Should be role object')
    }

    const p = require('../../permissions')
    if (!p.canThis(userRole, perm)) return options.inverse(this)
    if (ownerRole._id.toString() === userRole._id.toString()) return options.fn(this)

    if (userRole.isAdmin) return options.fn(this)
    if (userRole.isAgent) return options.fn(this)
    const hasHierarchyEnabled = p.hasHierarchyEnabled(userRole._id)
    if (hasHierarchyEnabled && p.hasPermOverRole(ownerRole._id, userRole._id)) return options.fn(this)

    return options.inverse(this)
  },

  checkPerm: function (user, perm, options) {
    const P = require('../../permissions')
    if (user === undefined) return options.inverse(this)

    if (P.canThis(user.role, perm)) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  checkPermOrAdmin: function (user, perm, options) {
    if (user === undefined) return options.inverse(this)
    if (user.role.isAdmin) return options.fn(this)

    const p = require('../../permissions')
    if (p.canThis(user.role, perm)) return options.fn(this)

    return options.inverse(this)
  },

  checkRole: function (role, perm, options) {
    const P = require('../../permissions')
    if (P.canThis(role, perm)) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  checkPlugin: function (user, permissions, options) {
    if (user === undefined || permissions === undefined) {
      return options.inverse(this)
    }
    const pluginPermissions = permissions.split(' ')
    let result = false
    for (let i = 0; i < pluginPermissions.length; i++) {
      if (pluginPermissions[i] === user.role) {
        result = true
      }
    }

    if (result) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  checkEditSelf: function (user, owner, perm, options) {
    const P = require('../../permissions')
    if (P.canThis(user.role, perm + ':editSelf')) {
      if (user._id.toString() === owner._id.toString()) {
        return options.fn(this)
      }

      return options.inverse(this)
    }

    return options.inverse(this)
  },

  hasGroup: function (arr, value, options) {
    const result = arr.some(function (i) {
      if (i === undefined || value === undefined) return false
      return i._id.toString() === value.toString()
    })
    if (result) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  isSubscribed: function (arr, value) {
    return arr.some(function (i) {
      if (i === undefined || value === undefined) return false
      return i._id.toString() === value.toString()
    })
  },

  match_id: function (_id1, _id2, options) {
    const result = _id1.toString() === _id2.toString()
    if (result) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  json: function (str) {
    return JSON.stringify(str)
  },

  size: function (arr) {
    if (Array.isArray(arr) || typeof arr === 'string') return arr.length
    if (typeof arr === 'object' && arr !== null) return Object.keys(arr).length
    return 0
  },

  add: function (num1, num2) {
    return num1 + num2
  },

  overdue: function (showOverdue, date, updated, overdueIn, options) {
    if (!showOverdue) return ''
    const now = dayjs()
    if (updated) {
      updated = dayjs(updated)
    } else {
      updated = dayjs(date)
    }

    const timeout = updated.add(overdueIn, 'm')
    const result = now.isAfter(timeout)

    if (result) {
      return options.fn(this)
    }

    return options.inverse(this)
  },

  statusName: function (status) {
    let str = ''
    switch (status) {
      case 0:
        str = 'New'
        break
      case 1:
        str = 'Open'
        break
      case 2:
        str = 'Pending'
        break
      case 3:
        str = 'Closed'
        break
      default:
        str = 'New'
    }

    return str
  },

  randomNum: function () {
    return Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000
  },

  shouldShowCommentSection: function (user, options) {
    const p = require('../../permissions')
    const hasComments = p.canThis(user.role, 'comments:create')
    const hasNotes = p.canThis(user.role, 'tickets:notes')

    if (hasComments || hasNotes) return options.fn(this)
    return options.inverse(this)
  }
}

// Aliases
helpers.ifeq = helpers.if_eq
helpers.unlessEq = helpers.unless_eq
helpers.ifgt = helpers.if_gt
helpers.unlessGt = helpers.unless_gt
helpers.iflt = helpers.if_lt
helpers.unlessLt = helpers.unless_lt
helpers.ifgteq = helpers.if_gteq
helpers.unlessGtEq = helpers.unless_gteq
helpers.ifLtEq = helpers.if_lteq
helpers.unlessLtEq = helpers.unless_lteq
helpers.foreach = helpers.forEach
helpers.canUser = helpers.checkPerm
helpers.canUserOrAdmin = helpers.checkPermOrAdmin
helpers.canUserRole = helpers.checkRole
helpers.canEditSelf = helpers.checkEditSelf // This will go away
helpers.hasPluginPerm = helpers.checkPlugin
helpers.inArray = helpers.hasGroup

// Export helpers
module.exports.helpers = helpers
module.exports.register = function (Handlebars) {
  for (const helper in helpers) {
    if (Object.prototype.hasOwnProperty.call(helpers, helper)) {
      Handlebars.registerHelper(helper, helpers[helper])
    }
  }
}
