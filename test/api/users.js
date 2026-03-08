/* eslint-disable no-unused-expressions */
const async = require('async')
const expect = require('chai').expect
let request = require('supertest')

describe('api/users.js', function () {
  const tdapikey = 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
  request = request('http://localhost:3111')

  it('should return users', function (done) {
    request
      .get('/api/v1/users?limit=10&page=0&search=trudesk')
      .set('accesstoken', tdapikey)
      .set('Accept', 'application/json')
      .expect(function (res) {
        if (res.body.count !== 1) throw new Error('Could not get users')
      })
      .expect(200, done)
  })

  it('should return a user', function (done) {
    request
      .get('/api/v1/users/trudesk')
      .set('accesstoken', tdapikey)
      .set('Accept', 'application/json')
      .expect(function (res) {
        if (res.body.user.username !== 'trudesk') throw new Error('Invalid User')
      })
      .expect(200, done)
  })

  it('should create new user', function (done) {
    const user = {
      aUsername: 'new.user.1',
      aPass: 'SecureP@ssW0rd',
      aPassConfirm: 'SecureP@ssW0rd',
      aFullname: 'New User',
      aEmail: 'new.user.1@trudesk.io',
      aRole: global.userRoleId,
      aTitle: 'My New Title',
      aGrps: []
    }

    async.series(
      [
        function (cb) {
          request
            .post('/api/v1/users/create')
            .set('accesstoken', tdapikey)
            .set('Content-Type', 'application/json')
            .send(user)
            .set('Accept', 'application/json')
            .expect(200, cb)
        },
        function (cb) {
          user.aGrps = undefined
          request
            .post('/api/v1/users/create')
            .set('accesstoken', tdapikey)
            .set('Content-Type', 'application/json')
            .send(user)
            .set('Accept', 'application/json')
            .expect(
              400,
              {
                success: false,
                error: 'Invalid Group Array'
              },
              cb
            )
        },
        function (cb) {
          // password mismatch
          user.aPass = '2222'
          user.aGrps = []
          request
            .post('/api/v1/users/create')
            .set('accesstoken', tdapikey)
            .set('Content-Type', 'application/json')
            .send(user)
            .set('Accept', 'application/json')
            .expect(
              400,
              {
                success: false,
                error: 'Invalid Password Match'
              },
              cb
            )
        },
        function (cb) {
          request
            .post('/api/v1/users/create')
            .set('accesstoken', tdapikey)
            .expect(
              400,
              {
                success: false,
                error: 'Invalid Post Data'
              },
              cb
            )
        }
      ],
      function (err) {
        if (err) throw err

        done()
      }
    )
  })

  it('should update user', async function () {
    const userSchema = require('../../src/models/user')
    // eslint-disable-next-line no-unused-vars
    const _user = await userSchema.getUserByUsername('fake.user')

    const u = {
      aTitle: 'The Title',
      aRole: global.userRoleId
    }

    await new Promise(function (resolve, reject) {
      request
        .put('/api/v1/users/fake.user')
        .set('accesstoken', tdapikey)
        .set('Content-Type', 'application/json')
        .send(u)
        .set('Accept', 'application/json')
        .expect(function (res) {
          if (res.body.success !== true) throw new Error('Unable to update user')
        })
        .expect(200, function (err) {
          if (err) return reject(err)
          resolve()
        })
    })
  })

  it('should add user to group', async function () {
    const groupSchema = require('../../src/models/group')
    const userSchema = require('../../src/models/user')

    const group = await groupSchema.getGroupByName('TEST')
    expect(group).to.not.be.null

    const user = await userSchema.getUserByUsername('trudesk')
    expect(user).to.not.be.null

    const u = {
      aFullname: user.fullname,
      aEmail: user.email,
      aGrps: [group._id],
      saveGroups: true
    }

    await new Promise(function (resolve, reject) {
      request
        .put('/api/v1/users/trudesk')
        .set('accesstoken', tdapikey)
        .set('Content-Type', 'application/json')
        .send(u)
        .set('Accept', 'application/json')
        .expect(200, async function (err) {
          if (err) return reject(err)
          try {
            const grp = await groupSchema.getGroupByName('TEST')
            expect(grp.isMember(user._id)).to.equal(true)
            resolve()
          } catch (e) {
            reject(e)
          }
        })
    })
  })

  it('should remove user from group', async function () {
    const groupSchema = require('../../src/models/group')
    const userSchema = require('../../src/models/user')

    const group = await groupSchema.getGroupByName('TEST')
    expect(group).to.not.be.null

    const user = await userSchema.getUserByUsername('trudesk')
    expect(user).to.not.be.null

    const u = {
      aId: user._id,
      aFullname: user.fullname,
      aEmail: user.email,
      aGrps: [],
      saveGroups: true
    }

    await new Promise(function (resolve, reject) {
      request
        .put('/api/v1/users/trudesk')
        .set('accesstoken', tdapikey)
        .set('Content-Type', 'application/json')
        .send(u)
        .set('Accept', 'application/json')
        .expect(200)
        .expect(function (res) {
          if (res.body.success !== true) throw new Error('Expected success to be true')
        })
        .end(async function (err) {
          if (err) return reject(err)
          try {
            const grp = await groupSchema.getGroupByName('TEST')
            expect(grp.isMember(user._id)).to.equal(false)
            resolve()
          } catch (e) {
            reject(e)
          }
        })
    })
  })

  it('should update user preference', function (done) {
    const data = {
      preference: 'autoRefreshTicketGrid',
      value: false
    }

    request
      .put('/api/v1/users/trudesk/updatepreferences')
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send(data)
      .set('Accept', 'application/json')
      .expect(function (res) {
        if (res.body.success !== true || res.body.user.preferences.autoRefreshTicketGrid !== false) { throw new Error('Unable to update user') }
      })
      .expect(200, done)
  })

  // it('POST /api/v1/public/account/create - should create public account', function(done) {
  //     request.post('/api/v1/public/account/create')
  //         .set('accesstoken', tdapikey)
  //         .set('Content-Type', 'application/json')
  //         .send({user: {email: 'public.user@trudesk.io', password: 'password', fullname: 'public.user@trudesk.io'}})
  //         .expect(function(res) {
  //             console.log(res);
  //             expect(res.body.success).to.eq(true);
  //         })
  //         .expect(200, done);
  // });

  it('should delete user', function (done) {
    request
      .delete('/api/v1/users/deleted.user')
      .set('accesstoken', tdapikey)
      .set('Accept', 'application/json')
      .expect(
        200,
        {
          success: true,
          disabled: false
        },
        done
      )
  })
})
