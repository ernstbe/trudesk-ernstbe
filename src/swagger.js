const swaggerJsdoc = require('swagger-jsdoc')
const packagejson = require('../package.json')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trudesk API',
      version: packagejson.version,
      description: 'Trudesk Helpdesk API Documentation'
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        accessToken: {
          type: 'apiKey',
          in: 'header',
          name: 'accesstoken',
          description: 'User access token'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie'
        }
      }
    },
    security: [{ accessToken: [] }]
  },
  apis: [
    './src/controllers/api/v1/*.js',
    './src/controllers/api/v2/*.js',
    './src/swagger-docs/*.yaml'
  ]
}

module.exports = swaggerJsdoc(options)
