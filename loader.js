import Cheerio from "cheerio";

const SKIPPED_ELEMENTS = ['html', 'script', 'head', 'link', 'meta', 'body'];

export async function getLongestWallOfTextFromURL(url) {
    const html = await fetch(url.trim()).then(res => res.text());

    const $ = Cheerio.load(html);

    let maxText = '';

    // Ensure we don't read the contents of a script tag as text when doing this search
    $('nav, svg, script, link, meta, head').replaceWith('<a></a>');

    $('*').each(function () {
        if (SKIPPED_ELEMENTS.includes(this.tagName)) return;

        const text = $(this).text().trim();

        if (text.length > maxText.length) {
            maxText = text;
        }
    });

    maxText = maxText.replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');

    return maxText;
}