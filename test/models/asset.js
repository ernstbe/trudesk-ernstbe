/* eslint-disable no-unused-expressions */
var expect = require('chai').expect
var assetSchema = require('../../src/models/asset')

describe('asset.js', function () {
  var testAssetId

  it('should create an asset', async function () {
    var asset = await assetSchema.create({
      name: 'GKW 1',
      assetTag: 'THW-FZ-001',
      category: 'Fahrzeug',
      location: 'Fahrzeughalle',
      description: 'Gerätekraftwagen 1'
    })

    expect(asset).to.be.a('object')
    expect(asset._doc).to.include.keys('_id', 'name', 'assetTag', 'category', 'location')
    expect(asset.name).to.equal('GKW 1')
    expect(asset.assetTag).to.equal('THW-FZ-001')
    testAssetId = asset._id
  })

  it('should not create asset with duplicate assetTag', async function () {
    try {
      await assetSchema.create({
        name: 'GKW 2',
        assetTag: 'THW-FZ-001',
        category: 'Fahrzeug'
      })
      throw new Error('Should have thrown')
    } catch (err) {
      expect(err).to.exist
      expect(err.code).to.equal(11000)
    }
  })

  it('should get all assets', async function () {
    var assets = await assetSchema.getAll()
    expect(assets).to.be.a('array')
    expect(assets).to.have.length(1)
    expect(assets[0].name).to.equal('GKW 1')
  })

  it('should get asset by id', async function () {
    var asset = await assetSchema.getById(testAssetId)
    expect(asset).to.be.a('object')
    expect(asset.name).to.equal('GKW 1')
  })

  it('should get asset by assetTag', async function () {
    var asset = await assetSchema.getByAssetTag('THW-FZ-001')
    expect(asset).to.be.a('object')
    expect(asset.name).to.equal('GKW 1')
  })

  it('should return null for non-existent assetTag', async function () {
    var asset = await assetSchema.getByAssetTag('NONEXISTENT')
    expect(asset).to.not.exist
  })

  it('should update asset fields', async function () {
    var asset = await assetSchema.findById(testAssetId)
    asset.location = 'Werkstatt'
    var saved = await asset.save()
    expect(saved.location).to.equal('Werkstatt')
    expect(saved.updatedAt).to.exist
  })

  it('should create a second asset', async function () {
    var asset = await assetSchema.create({
      name: 'Laptop S6-01',
      assetTag: 'THW-IT-001',
      category: 'IT-Geraet',
      location: 'Büro'
    })
    expect(asset).to.be.a('object')
    expect(asset.assetTag).to.equal('THW-IT-001')
  })

  it('should get all assets sorted by name', async function () {
    var assets = await assetSchema.getAll()
    expect(assets).to.have.length(2)
    expect(assets[0].name).to.equal('GKW 1')
    expect(assets[1].name).to.equal('Laptop S6-01')
  })
})
