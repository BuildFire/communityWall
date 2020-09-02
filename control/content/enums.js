'use strict';

(function (angular) {
    angular.module('socialPluginContent')
        .constant('SERVER_URL', {
            link: 'https://social.buildfire.com/src/server.js'
        })
        .constant('EVENTS',{
            COMMENT_DELETED:"COMMENT_DELETED",
            POST_DELETED:"POST_DELETED",
            BAN_USER:"BAN_USER",
            POST_UNLIKED:"POST_UNLIKED",
            POST_LIKED:"POST_LIKED",
            POST_CREATED:"POST_CREATED",
            COMMENT_ADDED:"COMMENT_ADDED",
            COMMENT_LIKED: "COMMENT_LIKED",
            COMMENT_UNLIKED: "COMMENT_UNLIKED",
            APP_RESET: "APP_RESET"
        })
        .constant('API_KEY', {
            value: '26a6036a9df5c1acabacfG7gInHY3x1K5nuX5d8'
        })
})(window.angular);

