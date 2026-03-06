db = db.getSiblingDB('trudesk');

// Create application user with readWrite on the trudesk DB
try {
  db.createUser({
    user: 'trudesk_app',
    pwd: 'app_pass_local',
    roles: [{ role: 'readWrite', db: 'trudesk' }]
  })
  print('Created trudesk_app user')
} catch (e) {
  print('User creation failed or user exists: ' + e)
}

// Also create an admin user in admin DB if not present (the official image creates root from env vars)
adminDB = db.getSiblingDB('admin')
try {
  adminDB.createUser({
    user: 'trudesk_admin',
    pwd: 'change_me_local_please',
    roles: [{ role: 'root', db: 'admin' }]
  })
  print('Created trudesk_admin admin user')
} catch (e) {
  print('Admin user creation failed or user exists: ' + e)
}
