import * as cheerio from 'cheerio';

function extractLinks(html) {
  const $ = cheerio.load(html);
  const links = [];
  $('a').each((_, el) => {
    links.push($(el).attr('href'));
  });
  return links.slice(0, 1);
}

export { extractLinks };