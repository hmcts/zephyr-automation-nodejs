// CJS wrapper for Cypress/Mocha
const reporter = require('../dist/cypress/ZephyrReporter.js');
module.exports = reporter.default || reporter;

