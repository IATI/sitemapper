const axios = require('axios');
const { aSetex, aGet, aExists } = require('../config/redis');
const config = require('../config/config');

const sitemapLimit = 25000;
const cacheSeconds = 6000;
const additionalPages = ['about', 'advanced', 'simple'];

const replaceForwardSlash = function (str) {
    return str.replace(/\//g, '-');
};

const encodeXML = function (str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

const axiosConfig = {
    auth: {
        username: config.SOLR_USER,
        password: config.SOLR_PASSWORD,
    },
};
const siteUrl = config.DDS_FRONTEND_URL;
const activityFacetBaseUrl = `${config.SOLR_API_URL}activity/select?q=*:*&facet=true&facet.field=iati_identifier&facet.mincount=1&facet.sort=index&rows=0`;

const getActivityCount = async () => {
    if ((await aExists('dss_sitemap_count')) === 0) {
        const countUrl = `${activityFacetBaseUrl}&facet.limit=0`;
        const activityCount = await axios
            .get(countUrl, axiosConfig)
            .then((result) => result.data.response.numFound);
        await aSetex('dss_sitemap_count', cacheSeconds, activityCount);
        return activityCount;
    }
    const activityCount = await aGet('dss_sitemap_count');
    return activityCount;
};

const getActivitySlice = async (chunkIndex) => {
    if ((await aExists(`dss_sitemap_chunk_${chunkIndex}`)) === 0) {
        const sliceUrl = `${activityFacetBaseUrl}&facet.limit=${sitemapLimit}&facet.offset=${
            chunkIndex * sitemapLimit
        }`;
        const activitySlice = await axios
            .get(sliceUrl, axiosConfig)
            .then((result) =>
                result.data.facet_counts.facet_fields.iati_identifier.filter((d, i) => i % 2 === 0)
            );
        await aSetex(
            `dss_sitemap_chunk_${chunkIndex}`,
            cacheSeconds,
            JSON.stringify(activitySlice)
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
        .map(
            (d) =>
                `<url><loc>${siteUrl}activity/${encodeXML(
                    encodeURIComponent(replaceForwardSlash(d))
                )}</loc></url>`
        )
        .join('');
    if (activities.length < sitemapLimit && sitemapLimit < 50000) {
        sitemapString += additionalPages
            .map((d) => `<url><loc>${siteUrl}${encodeXML(encodeURIComponent(d))}</loc></url>`)
            .join('');
    }
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
