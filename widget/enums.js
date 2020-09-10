'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .constant('SERVER_URL', {
            link: 'http://social.buildfire.com/src/server.js',
            secureLink: 'https://social.buildfire.com/src/server.js'
        })
        .constant('MORE_MENU_POPUP', {
            REPORT: 'Report Post',
            BLOCK: 'Delete Post'
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
        .constant('THREAD_STATUS', {
            FOLLOW: "Follow Thread",
            FOLLOWING: "Leave Thread"
        })
        .constant('GROUP_STATUS', {
            FOLLOW: "Follow Group",
            FOLLOWING: "Leave Group"
        })
        .constant('FILE_UPLOAD', {
            CANCELLED : "Cancelled",
            SIZE_EXCEED : "File Too Large",
            MAX_SIZE : 20        // upload file max size in 20 MB
        })
})(window.angular);
