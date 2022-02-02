const axios = require('axios');
const { aSetex, aGet, aExists } = require('../config/redis');
const config = require('../config/config');

const sitemapLimit = 25000;
const cacheSeconds = 6000;

const encodeXML = function (str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

const axiosConfig = {
    headers: {
        'Ocp-Apim-Subscription-Key': config.DSS_API_KEY,
    },
};
const siteUrl = 'https://dev-ds-search.iatistandard.org/';
const baseUrlSitemap =
    'https://dev-api.iatistandard.org/dss/activity/select?q=*:*&facet=true&facet.field=iati_identifier&facet.sort=index&facet.limit=-1';

const getAllActivities = async () => {
    const activities = await axios.get(baseUrlSitemap, axiosConfig).then((result) => result.data.facet_counts.facet_fields.iati_identifier.filter((d, i) => i % 2 === 0));
    const cachePromises = [];
    cachePromises.push(aSetex('dss_sitemap_count', cacheSeconds, activities.length));
    const numChunks = Math.ceil(activities.length / sitemapLimit);
    Array.from(Array(numChunks).keys()).forEach((chunkIndex) => {
        const activitySlice = activities.slice(
            chunkIndex * sitemapLimit,
            (chunkIndex + 1) * sitemapLimit
        );
        cachePromises.push(
            aSetex(`dss_sitemap_chunk_${chunkIndex}`, cacheSeconds, JSON.stringify(activitySlice))
        );
    });
    await Promise.all(cachePromises);
    return activities;
};

const getActivityCount = async () => {
    if ((await aExists('dss_sitemap_count')) === 0) {
        const activities = await getAllActivities();
        return activities.length;
    } 
        const activityCount = await aGet('dss_sitemap_count');
        return activityCount;
    
};

const getActivitySlice = async (chunkIndex) => {
    if ((await aExists(`dss_sitemap_chunk_${chunkIndex}`)) === 0) {
        const activities = await getAllActivities();
        const activitySlice = activities.slice(
            chunkIndex * sitemapLimit,
            (chunkIndex + 1) * sitemapLimit
        );
        return activitySlice;
    } 
        const activitySlice = await aGet(`dss_sitemap_chunk_${chunkIndex}`);
        return JSON.parse(activitySlice);
    
};

const getSitemapIndex = async () => {
    let sitemapIndexString =
        '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    const activityCount = await getActivityCount();
    const sitemapExtent = Math.ceil(activityCount / sitemapLimit);
    sitemapIndexString += Array.from(Array(sitemapExtent).keys())
        .map((i) => `<sitemap><loc>${siteUrl}sitemap-${i}.xml</loc></sitemap>`)
        .join('');
    sitemapIndexString += '</sitemapindex>';
    return sitemapIndexString;
};

const getSingleSitemap = async (sitemapNumber) => {
    let sitemapString =
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';
    const activities = await getActivitySlice(sitemapNumber);
    sitemapString += activities
        .map((d) => `<url><loc>${siteUrl}activity/${encodeXML(encodeURI(d))}</loc></url>`)
        .join('');
    sitemapString += '</urlset>';
    return sitemapString;
};

module.exports = async (context, req) => {
    const sitemapId = req.params.id;
    let responseMessage = '';

    if (sitemapId === 'index') {
        responseMessage = await getSitemapIndex();
    } else {
        const sitemapNumber = parseInt(sitemapId, 10);
        responseMessage = await getSingleSitemap(sitemapNumber);
    }

    context.res = {
        status: 200 /* Defaults to 200 */,
        headers: { 'Content-Type': 'application/xml' },
        body: responseMessage,
    };
};
