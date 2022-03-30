const axios = require('axios');
const { aSetex, aGet, aExists } = require('../config/redis');
const config = require('../config/config');

const apiQuota = 500;
const dailyAttempts = 20;
const weeklyCache = 604800;
const additionalPages = ['about', 'advanced', 'simple'];

const axiosConfig = {
    headers: {
        'Ocp-Apim-Subscription-Key': config.DSS_API_KEY,
    },
};
const siteUrl = config.DDS_FRONTEND_URL;
const activityFacetBaseUrl = `${config.DDS_API_URL}activity/select?q=*:*&facet=true&facet.field=iati_identifier&facet.mincount=1&facet.sort=index&rows=0`;

const bingSubmissionUrl = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=';

const getActivityCount = async () => {
    const countUrl = `${activityFacetBaseUrl}&facet.limit=0`;
    const activityCount = await axios
        .get(countUrl, axiosConfig)
        .then((result) => result.data.response.numFound);
    return activityCount;
};

const getActivitySlice = async (chunkIndex) => {
    const sliceUrl = `${activityFacetBaseUrl}&facet.limit=${apiQuota}&facet.offset=${
        chunkIndex * apiQuota
    }`;
    const activitySlice = await axios
        .get(sliceUrl, axiosConfig)
        .then((result) =>
            result.data.facet_counts.facet_fields.iati_identifier.filter((d, i) => i % 2 === 0)
        );
    return activitySlice;
};

const getJsonExtent = async () => {
    const activityCount = await getActivityCount();
    const sitemapExtent = Math.ceil(activityCount / apiQuota);
    return sitemapExtent;
};

const submitSingleJson = async (sitemapNumber, apiKey) => {
    const activities = await getActivitySlice(sitemapNumber);
    const urlList = activities.map((d) => `${siteUrl}activity/${encodeURIComponent(d)}`);
    if (activities.length < apiQuota && apiQuota < 50000) {
        additionalPages
            .map((d) => `${siteUrl}${encodeURIComponent(d)}`)
            .forEach((d) => urlList.push(d));
    }
    const sitemapJson = {
        siteUrl: siteUrl.slice(0, -1),
        urlList,
    };
    const result = await axios
        .post(`${bingSubmissionUrl}${apiKey}`, sitemapJson)
        .then((res) => ({
            status: res.status,
            message: res.data,
            funcMessage: `Attempted Bing Submission of ${apiQuota} URLs for index ${sitemapNumber}`,
        }))
        .catch((error) => ({
            status: error.response.status,
            message: error.response.data,
            funcMessage: `Attempted Bing Submission of ${apiQuota} URLs for index ${sitemapNumber}`,
        }));
    return result;
};

module.exports = async (context, bingTimer) => {
    if (bingTimer.isPastDue) {
        context.log('Timer function is running late');
    }
    if (siteUrl !== 'https://datastore.iatistandard.org/') {
        context.log('Skipping run... Not production URL...');
        return;
    }
    const apiKey = config.BING_API_KEY;
    let bookmark = 0;
    const extent = await getJsonExtent();

    if ((await aExists(`dss_bing_bookmark`)) !== 0) {
        bookmark = await aGet(`dss_bing_bookmark`);
        bookmark = parseInt(bookmark, 10);
    }

    if (bookmark > extent) {
        bookmark = 0;
    }

    const results = [];
    let attempt = 0;
    for (attempt; attempt < dailyAttempts; attempt += 1) {
        const attemptedIndex = bookmark + attempt;
        if (attemptedIndex > extent) {
            break;
        }
        /* eslint-disable no-await-in-loop */
        const result = await submitSingleJson(attemptedIndex, apiKey);
        /* eslint-enable no-await-in-loop */
        results.push(result);
        if (result.status !== 200) {
            break;
        }
    }

    const lastStatus = results[results.length - 1].status;
    if (lastStatus === 200) {
        await aSetex(`dss_bing_bookmark`, weeklyCache, bookmark + attempt + 1);
    } else {
        await aSetex(`dss_bing_bookmark`, weeklyCache, bookmark + attempt);
    }

    context.log(results);
};
