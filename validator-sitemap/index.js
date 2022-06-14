const fetch = require('node-fetch');
const config = require('../config/config');

const additionalPages = ['', 'about', 'validate', 'organisations'];

const encodeXML = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const fetchConfig = {
    headers: {
        [`${config.VALIDATOR_SERVICES_API_KEY_NAME}`]: config.VALIDATOR_SERVICES_API_KEY_VALUE,
    },
};

const siteUrl = config.VALIDATOR_FRONTEND_URL;
const publisherUrl = `${config.VALIDATOR_SERVICES_API_URL}pvt/publishers`;

const getPublishers = async () => {
    const response = await fetch(publisherUrl, fetchConfig);
    const publishers = await response.json();
    return publishers;
};

const getSitemap = async () => {
    let sitemapString =
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';
    const publishers = await getPublishers();
    sitemapString += publishers
        .map(
            (d) =>
                `<url><loc>${siteUrl}organisation/${encodeXML(
                    encodeURIComponent(d.name)
                )}</loc></url>`
        )
        .join('');
    sitemapString += additionalPages
        .map((d) => `<url><loc>${siteUrl}${encodeXML(encodeURIComponent(d))}</loc></url>`)
        .join('');
    sitemapString += '</urlset>';
    return sitemapString;
};

module.exports = async (context) => {
    const responseMessage = await getSitemap();

    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
        body: responseMessage,
    };
};
