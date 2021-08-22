const { resolve } = require('url');
const cheerio = require('cheerio');
const got = require('@/utils/got');
const LZString = require('lz-string');

const getChapters = ($) =>
    $('.chapter-list > ul')
        .toArray()
        .reverse()
        .reduce((acc, curr) => acc.concat($(curr).children('li').toArray()), [])
        .map((ele) => {
            const a = $(ele).children('a');
            return {
                link: resolve('https://www.manhuagui.com/', a.attr('href')),
                title: a.attr('title'),
                num: a.find('i').text(),
            };
        });

module.exports = async (ctx) => {
    const { id } = ctx.params;

    ctx.state.data = {
        title: `看漫画 - ${id}`,
        link: `https://www.manhuagui.com/comic/${id}/`,
        description: '',
        item: [],
        allowEmpty: true,
    };

    let resp = ctx.cache.get(`https://www.manhuagui.com/comic/${id}/`);
    if (!resp) {
        if (await ctx.cache.get('https://www.manhuagui.com')) {
            return;
        } else {
            ctx.cache.set('https://www.manhuagui.com', true, 60);
        }

        resp = await got.get(`https://www.manhuagui.com/comic/${id}/`);
        ctx.cache.set(`https://www.manhuagui.com/comic/${id}/`, 60 * 5);
    }

    const { data } = resp;
    const $ = cheerio.load(data);

    if ($('#__VIEWSTATE').length > 0) {
        const n = LZString.decompressFromBase64($('#__VIEWSTATE').val());
        if (n) {
            $('#erroraudit_show').replaceWith(n);
            $('#__VIEWSTATE').remove();
        }
    }

    const bookTitle = $('.book-title > h1').text();
    const bookIntro = $('#intro-all').text();
    const coverImgSrc = $('.book-cover img').attr('src');
    const chapters = getChapters($);

    const genResult = (chapter) => ({
        link: chapter.link,
        title: chapter.title,
        description: `
            <h1>${chapter.num}</h1>
            <img src="${coverImgSrc}" />
        `.trim(),
    });

    (ctx.state.data.title = `看漫画 - ${bookTitle}`), (ctx.state.data.description = bookIntro);
    ctx.state.data.item = chapters.map(genResult);
};
