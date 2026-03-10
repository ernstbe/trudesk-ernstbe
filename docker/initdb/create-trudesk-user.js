/* eslint-disable no-undef, no-global-assign */
// The mongo init container runs this script as the root user created
// from MONGO_INITDB_ROOT_USERNAME / MONGO_INITDB_ROOT_PASSWORD env vars.
// Grant that root user readWrite on the trudesk database so the app can connect.

db = db.getSiblingDB('trudesk')

// Create a collection so the database is actually initialized
try {
  db.createCollection('init')
  print('Initialized trudesk database')
} catch (e) {
  print('Database init skipped: ' + e)
}
