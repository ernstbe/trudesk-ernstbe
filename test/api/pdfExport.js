/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

describe('api/pdfExport.js', function () {
  const agent = superagent.agent()
  let testGroupId
  const baseUrl = 'http://localhost:3111'

  before(async function () {
    await new Promise(function (resolve, reject) {
      agent
        .post(baseUrl + '/login')
        .type('json')
        .send({
          'login-username': 'trudesk',
          'login-password': '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW'
        })
        .end(function (_err, res) {
          if (_err) return reject(_err)
          resolve()
        })
    })

    const groupSchema = require('../../src/models/group')
    const group = await groupSchema.getGroupByName('TEST')
    testGroupId = group._id.toString()
  })

  it('should export handover report as PDF', async function () {
    const res = await agent
      .get(baseUrl + '/api/v2/reports/handover?groupId=' + testGroupId + '&format=pdf')
      .responseType('arraybuffer')

    expect(res.status).to.equal(200)
    expect(res.headers['content-type']).to.contain('application/pdf')
    expect(res.body).to.be.an.instanceOf(Buffer)
  })

  it('should export sitzung report as PDF', async function () {
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const res = await agent
      .get(baseUrl + '/api/v2/reports/sitzung?since=' + since.toISOString() + '&format=pdf')
      .responseType('arraybuffer')

    expect(res.status).to.equal(200)
    expect(res.headers['content-type']).to.contain('application/pdf')
    expect(res.body).to.be.an.instanceOf(Buffer)
  })

  it('should export asset list as PDF', async function () {
    const res = await agent
      .get(baseUrl + '/api/v2/assets/export/pdf')
      .responseType('arraybuffer')

    expect(res.status).to.equal(200)
    expect(res.headers['content-type']).to.contain('application/pdf')
    expect(res.body).to.be.an.instanceOf(Buffer)
  })
})
