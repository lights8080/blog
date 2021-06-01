/**
* Thumbnail Helper
* @description Get the thumbnail url from a post
* @example
*     <%- thumbnail(post) %>
*/
hexo.extend.helper.register('oss', function (post) {
    return post.thumbnail || post.banner || '';
});
hexo.extend.tag.register('oss', function ( args ) {
    // return '![](https://gitee.com/lights8080/lights8080-oss/raw/master/'+args[0]+')';
    return '<img src="https://gitee.com/lights8080/lights8080-oss/raw/master/'+args[0]+'" alt="IMAGE"/>';
});