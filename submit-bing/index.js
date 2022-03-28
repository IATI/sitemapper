const axios = require('axios');
const { aSetex, aGet, aExists } = require('../config/redis');
const config = require('../config/config');

const apiQuota = 500;
const dailyAttempts = 20;
const dailyCache = 172800;
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
    const urlList = activities.map((d) => `${siteUrl}activity/${encodeURI(d)}`);
    if (activities.length < apiQuota && apiQuota < 50000) {
        additionalPages.map((d) => `${siteUrl}${encodeURI(d)}`).forEach((d) => urlList.push(d));
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

const isValid = (status) => status === 200;

module.exports = async (context, req) => {
    const apiKey = req.query.api_key;
    if (apiKey === undefined) {
        context.res = {
            status: 403,
            body: 'Forbidden. Please provide API key.',
        };
        return;
    }
    let bookmark = 0;
    const extent = await getJsonExtent();

    if ((await aExists(`dss_bing_bookmark`)) !== 0) {
        bookmark = await aGet(`dss_bing_bookmark`);
        bookmark = parseInt(bookmark, 10);
    }

    if (bookmark > extent) {
        bookmark = 0;
    }

    const resultPromises = [];
    for (let attempt = 0; attempt < dailyAttempts; attempt += 1) {
        const attemptedIndex = bookmark + attempt;
        if (attemptedIndex > extent) {
            break;
        }
        const resultPromise = submitSingleJson(attemptedIndex, apiKey);
        resultPromises.push(resultPromise);
    }

    const results = await Promise.all(resultPromises);
    const statusCodes = results.map((d) => d.status);
    if (statusCodes.every(isValid)) {
        await aSetex(`dss_bing_bookmark`, dailyCache, bookmark + dailyAttempts);
        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: results,
        };
    } else {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: results,
        };
    }
};
