require('dotenv').config();
const { version } = require('../package.json');

module.exports = {
    APP_NAME: 'IATI sitemapper',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
    NS_PER_SEC: 1e9,
    DDS_API_URL: process.env.DDS_API_URL,
    DDS_FRONTEND_URL: process.env.DDS_FRONTEND_URL,
    DSS_API_KEY: process.env.DSS_API_KEY,
    REDIS_PORT: process.env.REDIS_PORT || 6379,
    REDIS_CACHE_SEC: process.env.REDIS_CACHE_SEC || 86400,
    REDIS_KEY: process.env.REDIS_KEY,
    REDIS_HOSTNAME: process.env.REDIS_HOSTNAME,
    BING_API_KEY: process.env.BING_API_KEY,
};
