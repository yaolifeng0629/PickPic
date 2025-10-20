这是我之前写的一个工具，用于抓取微信公众号文章详情的逻辑，在实现该插件的时候，可以参考

```js
͜async function copyMpArticle(url) {
    let res = await Axios.get(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Referer: 'https://mp.weixin.qq.com/'
        }
    });
    let html = res.data;
    let $ = Cheerio.load(html);
    // 提取需要的信息
    let title = $('meta[property="og:title"]').attr('content');
    let author = $('#js_profile_qrcode .profile_nickname').text();
    let shareDesc = $('meta[property="og:description"]').attr('content');
    let shareImg = $('meta[property="og:image"]').attr('content');
    let params = getUrlParams(shareImg);
    shareImg = await uploadToCFS(shareImg, params.wx_fmt);

    // 清空冗余部分
    $('#activity-name').html('');
    $('#meta_content').html('');
    $('#preview_bar').remove();
    $('#js_tags').remove();
    $('#js_tags_preview_toast').remove();
    $('#js_pc_qr_code').remove();
    $('#wx_stream_article_slide_tip').remove();
    // 微信公众号文章默认为滚动加载，导致图片不能正常展示 ，此处禁止
    $('#js_content').attr('style', 'visibility: visible;');
    // 某次更新之后，公众号文章加入了一个隐藏的图片，暂时无效，隐藏
    // $('.wx_follow_avatar_pic').attr('style', 'display:none');
    $('#js_row_immersive_stream_wrap').remove();

    // 转存图片
    let pics = $('img');
    await (async () => {
        for (let index = 0; index < pics.length; index++) {
            const pic = pics[index];
            await copySrc($(pic), 'src');
            await copySrc($(pic), 'data-src', 'src');
        }
    })();

    // 转存背景图片
    let bgPics = $('[style*="background-image"]');
    console.log('bgPics', bgPics.length);
    await (async () => {
        for (let index = 0; index < bgPics.length; index++) {
            const bgPicDom = bgPics[index];
            let bg = $(bgPicDom).css('background-image');
            bg = bg.slice(5, -2);
            let params = getUrlParams(bg);
            let fileName = await uploadToCFS(bg, params.wx_fmt);
            $(bgPicDom).css('background-image', `url(${fileName})`);
        }
    })();

    let content = $('#js_article').html();

    return {
        title,
        author,
        share_desc: shareDesc,
        share_img: shareImg,
        content
    };
}

// 替换 image 标签的 src 属性
async function copySrc(pic, attribute, targetAttribute) {
    let src = pic.attr(attribute);
    if (src) {
        let params = getUrlParams(src);
        let fileName = await uploadToCFS(src, params.wx_fmt);
        pic.attr(attribute, fileName);
        if (targetAttribute) {
            pic.attr(targetAttribute, fileName);
        }
    }
}

function getUrlParams(url) {
    let params = {};

    while (true) {
        let r = url.match(/[\?&#](\w+)=([^&^#]*)(&|#|$)/i);
        if (r) {
            params[r[1]] = r[2];
            url = url.slice(r.index + 1);
        } else {
            break;
        }
    }

    return params;
}
```
