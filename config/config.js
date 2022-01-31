require('dotenv').config();
const { version } = require('../package.json');

module.exports = {
    APP_NAME: 'IATI sitemapper',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
    NS_PER_SEC: 1e9,
    DSS_API_KEY: process.env.DSS_API_KEY,
};
