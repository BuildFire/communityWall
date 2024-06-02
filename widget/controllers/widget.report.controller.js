'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
    .controller('ReportCtrl', ['$scope', '$routeParams', '$location', '$anchorScroll', 'SocialDataStore', 'Modals', '$rootScope', 'Buildfire', 'EVENTS', 'THREAD_STATUS', 'FILE_UPLOAD', 'SocialItems', '$q', '$timeout', 'Location', 'Util', 'GROUP_STATUS', 'SubscribedUsersData', function ($scope, $routeParams, $location, $anchorScroll, SocialDataStore, Modals, $rootScope, Buildfire, EVENTS, THREAD_STATUS, FILE_UPLOAD, SocialItems, $q, $timeout, Location, Util, GROUP_STATUS, SubscribedUsersData) {
        let Report = this;
    
        Report.SocialItems = SocialItems.getInstance();
        Report.util = Util;
        Report.loading = true;

        Report.init = function () {
            Buildfire.services.reportAbuse.triggerWidgetReadyForAdminResponse();
            getReportPost();

            Buildfire.services.reportAbuse.onAdminResponse((event) => {
                const triggerResponse = () => {
                    Buildfire.services.reportAbuse.triggerOnAdminResponseHandled({ reportId: event.report.id });
                };

                if (event.action != 'markAbuse') return triggerResponse();

                if (event.report.data.itemType == 'post') {
                    deletePost(event.report.data.deeplink.postId, (success) => {
                        if(success) triggerResponse();
                    });
                } else { // comment
                    deleteComment(event.report.data.deeplink.postId, event.report.data.deeplink.commentId, (success) => {
                        if(success) triggerResponse();
                    });
                }
              }, true);
        }

        Report.getDuration = function (timestamp) {
            if (timestamp)
                return moment(timestamp.toString()).fromNow();
        };

        const getReportPost = function (postId) {
            Buildfire.spinner.show();
            SocialDataStore.getPost(postId).then(
                function (data) {
                    Buildfire.spinner.hide();
                    if (data) {
                        if(Report.SocialItems.reportData.commentId) {
                            Report.post = data.comments.find(comment => comment.commentId === Report.SocialItems.reportData.commentId);
                            Report.post.text = Report.post.comment;
                        } else {
                            Report.post = data;
                        }
                        
                        if (!$scope.$$phase) $scope.$digest();
                    }
                    Report.loading = false;
                },
                function (err) {
                    Buildfire.spinner.hide();
                    Location.goToHome();
                    console.log('Error While fetching the record', err);
                }
            );
        }

        const deletePost = function (postId, callback) {
            let success = function (response) {
                if (response) {
                    let postToDelete = Report.SocialItems.items.find(element => element.id === postId)
                    let index = Report.SocialItems.items.indexOf(postToDelete);
                    Report.SocialItems.items.splice(index, 1);
                    Location.goToHome();
                    callback(true);
                    if (!$scope.$$phase)
                        $scope.$digest();
                }
            };
            let error = function (err) {
                console.log('Error while deleting post ', err);
                callback(false);
            };
            SocialDataStore.deletePost(postId).then(success, error);
        };

        const deleteComment = function (postId, comment, callback) {
            SocialDataStore.deleteComment(postId, comment).then(
                function (data) {
                    let commentToDelete = Report.post.comments.find(element => element.commentId === comment.commentId)
                    let index = Report.post.comments.indexOf(commentToDelete);
                    Report.post.comments.splice(index, 1);
                    Location.goToHome();
                    callback(true);
                    if (!$scope.$$phase)
                        $scope.$digest();
                },
                function (err) {
                    console.log('Error while deleting Comment', err);
                    callback(false);
                }
            );
        }

        Report.init();

    }])
})(window.angular);