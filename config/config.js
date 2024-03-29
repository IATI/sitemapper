import 'dotenv/config';
import { readFile } from 'fs/promises';

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));

const config = {
    APP_NAME: 'IATI sitemapper',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
    NS_PER_SEC: 1e9,
    SOLR_API_URL: process.env.SOLR_API_URL,
    SOLR_USER: process.env.SOLR_USER,
    SOLR_PASSWORD: process.env.SOLR_PASSWORD,
    DDS_FRONTEND_URL: process.env.DDS_FRONTEND_URL,
    REDIS_PORT: process.env.REDIS_PORT || 6380,
    REDIS_CACHE_SEC: process.env.REDIS_CACHE_SEC || 86400,
    REDIS_KEY: process.env.REDIS_KEY,
    REDIS_HOSTNAME: process.env.REDIS_HOSTNAME,
    BING_API_KEY: process.env.BING_API_KEY,
    VALIDATOR_FRONTEND_URL: process.env.VALIDATOR_FRONTEND_URL,
    VALIDATOR_SERVICES_API_URL: process.env.VALIDATOR_SERVICES_API_URL,
    VALIDATOR_SERVICES_API_KEY_VALUE: process.env.VALIDATOR_SERVICES_API_KEY_VALUE,
    VALIDATOR_SERVICES_API_KEY_NAME: process.env.VALIDATOR_SERVICES_API_KEY_NAME,
};

export default config;
