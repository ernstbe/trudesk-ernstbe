/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const assetSchema = require('../../src/models/asset')

describe('asset.js', function () {
  let testAssetId
  let initialCount = 0

  before(async function () {
    await assetSchema.ensureIndexes()
    const existing = await assetSchema.getAll()
    initialCount = existing.length
  })

  it('should create an asset', async function () {
    const asset = await assetSchema.create({
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
    const assets = await assetSchema.getAll()
    expect(assets).to.be.a('array')
    expect(assets).to.have.length(initialCount + 1)
  })

  it('should get asset by id', async function () {
    const asset = await assetSchema.getById(testAssetId)
    expect(asset).to.be.a('object')
    expect(asset.name).to.equal('GKW 1')
  })

  it('should get asset by assetTag', async function () {
    const asset = await assetSchema.getByAssetTag('THW-FZ-001')
    expect(asset).to.be.a('object')
    expect(asset.name).to.equal('GKW 1')
  })

  it('should return null for non-existent assetTag', async function () {
    const asset = await assetSchema.getByAssetTag('NONEXISTENT')
    expect(asset).to.not.exist
  })

  it('should update asset fields', async function () {
    const asset = await assetSchema.findById(testAssetId)
    asset.location = 'Werkstatt'
    const saved = await asset.save()
    expect(saved.location).to.equal('Werkstatt')
    expect(saved.updatedAt).to.exist
  })

  it('should create a second asset', async function () {
    const asset = await assetSchema.create({
      name: 'Laptop S6-01',
      assetTag: 'THW-IT-001',
      category: 'IT-Geraet',
      location: 'Büro'
    })
    expect(asset).to.be.a('object')
    expect(asset.assetTag).to.equal('THW-IT-001')
  })

  it('should get all assets sorted by name', async function () {
    const assets = await assetSchema.getAll()
    expect(assets).to.have.length(initialCount + 2)
    // Verify our created assets exist and are sorted
    const names = assets.map(a => a.name)
    expect(names).to.include('GKW 1')
    expect(names).to.include('Laptop S6-01')
  })
})
