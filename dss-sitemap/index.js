const axios = require('axios');
const config = require('../config/config');

const axiosConfig = {
    headers: {
        'Ocp-Apim-Subscription-Key': config.DSS_API_KEY,
    },
};
const siteUrl = 'https://dev-ds-search.iatistandard.org/';
const baseUrlSitemap =
    'https://dev-api.iatistandard.org/dss/activity/select?q=*:*&facet=true&facet.field=iati_identifier&facet.sort=index&facet.limit=-1';

const getAllActivities = async () =>
    axios
        .get(baseUrlSitemap, axiosConfig)
        .then((result) =>
            result.data.facet_counts.facet_fields.iati_identifier.filter((d, i) => i % 2 === 0)
        );

const sitemapLimit = 50000;

const getSitemapIndex = async () => {
    let sitemapIndexString =
        '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    const activities = await getAllActivities();
    const activityCount = activities.length;
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
    const activities = await getAllActivities();
    sitemapString += activities
        .slice(sitemapNumber * sitemapLimit, (sitemapNumber + 1) * sitemapLimit)
        .map((d) => `<url><loc>${siteUrl}activity/${encodeURI(d)}</loc></url>`)
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
