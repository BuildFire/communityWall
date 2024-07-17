'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
    .controller('ReportCtrl', ['$scope', '$routeParams', '$location', '$anchorScroll', 'SocialDataStore', '$rootScope', 'Buildfire', 'EVENTS', 'THREAD_STATUS', 'FILE_UPLOAD', 'SocialItems', '$q', '$timeout', 'Location', 'Util', 'GROUP_STATUS', 'SubscribedUsersData', function ($scope, $routeParams, $location, $anchorScroll, SocialDataStore, $rootScope, Buildfire, EVENTS, THREAD_STATUS, FILE_UPLOAD, SocialItems, $q, $timeout, Location, Util, GROUP_STATUS, SubscribedUsersData) {
        let Report = this;
    
        Report.SocialItems = SocialItems.getInstance();
        Report.util = Util;
        Report.loading = true;
        let onDeepLinkUpdate = Buildfire.deeplink.onUpdate;
        Report.skeletonPost = new Buildfire.components.skeleton('.social-item', {
            type: 'list-item-avatar, list-item-two-line, image'
        });

        Report.init = function () {
            Report.skeletonPost.start();
            Buildfire.services.reportAbuse.triggerWidgetReadyForAdminResponse();
            getReportPost(Report.SocialItems.reportData.postId);

            Buildfire.services.reportAbuse.onAdminResponse((event) => {
                const triggerResponse = () => {
                    Buildfire.services.reportAbuse.triggerOnAdminResponseHandled({ reportId: event.report.id });
                };
                let goBack = Buildfire.navigation.onBackButtonClick;

                if (event.action != 'markAbuse') {
                    triggerResponse();
                    goBack();
                    return;
                }
                if (event.report.data.itemType == 'post') {
                    deletePost(event.report.data.deeplink.postId, (success) => {
                        if (success) triggerResponse();
                    });
                } else { // comment
                    deleteComment(event.report.data.deeplink.postId, event.report.data.deeplink.commentId, (success) => {
                        if (success) triggerResponse();
                    });
                }
            }, true);
            
            Buildfire.deeplink.onUpdate((deeplinkData) => {
                if (deeplinkData && deeplinkData.fromReportAbuse && $location.path() == '/report') {
                    Report.SocialItems.reportData = deeplinkData
                    getReportPost(Report.SocialItems.reportData.postId);
                    Buildfire.services.reportAbuse.triggerWidgetReadyForAdminResponse();
                }
            }, true);
        }

        Report.getDuration = function (timestamp) {
            if (timestamp)
                return moment(timestamp.toString()).fromNow();
        };

        const getReportPost = function (postId) {
            SocialDataStore.getPost(postId).then(
                function (data) {
                    const isEmptyObject = (obj) => {
                        return Object.keys(obj).length === 0;
                    }

                    if(!data || isEmptyObject(data)) {
                        Buildfire.dialog.toast({
                            message: "Reported item could not be fetched. It may have already been deleted.",
                            type: 'info'
                        });
                        return;
                    } else {
                        if(Report.SocialItems.reportData.commentId) {
                            let commentData =  data.comments.find(comment => comment.commentId === Report.SocialItems.reportData.commentId);
                            if(commentData) {
                                Report.post = commentData;
                                Report.post.text = Report.post.comment;
                            } else {
                                Buildfire.dialog.toast({
                                    message: "Reported item could not be fetched. It may have already been deleted.",
                                    type: 'info'
                                });
                                return;
                            }
                        } else {
                            Report.post = data;
                        }
                        Report.setupImage();

                        if (!$scope.$$phase) $scope.$digest();
                    }
                    Report.loading = false;
                    Report.skeletonPost.stop();
                },
                function (err) {
                    Buildfire.spinner.hide();
                    console.log('Error While fetching the record', err);
                }
            );
        }

        const deletePost = function (postId, callback) {
            let success = function (response) {
                let goBack = Buildfire.navigation.onBackButtonClick;
                if (response) {
                    let postToDelete = Report.SocialItems.items.find(element => element.id === postId);
                    if(postToDelete) {
                        let index = Report.SocialItems.items.indexOf(postToDelete);
                        Report.SocialItems.items.splice(index, 1);
                    }
                    callback(true);
                    goBack();
                    Buildfire.dialog.toast({
                        message: "Reported post deleted successfully",
                        type: 'info'
                    });
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

        const deleteComment = function (postId, commentId, callback) {
            SocialDataStore.deleteComment(postId, commentId).then(
                function (data) {
                    let goBack = Buildfire.navigation.onBackButtonClick;
                    Buildfire.dialog.toast({
                        message: "Reported comment deleted successfully",
                        type: 'info'
                    });

                    let postComment = Report.SocialItems.items.find(element => element.id === postId);
                    if(postComment) {
                        let indexPost = Report.SocialItems.items.indexOf(postComment);
                        let commentToDelete = Report.SocialItems.items[indexPost].comments.find(element => element.commentId === commentId)

                        if(commentToDelete){
                            let indexComment = Report.SocialItems.items[indexPost].comments.indexOf(commentToDelete);
                            Report.SocialItems.items[indexPost].comments.splice(indexComment, 1);
                        }
                    }

                    goBack();
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

        Report.setupImage = function () {
            if (Report.post.imageUrl) {
                setTimeout(function () {
                    let imageList = document.getElementById("reportPostImage");
                    imageList.images = Report.post.imageUrl;
                    imageList.addEventListener('imageSelected', (e) => {
                        let selectedImage = e.detail.filter(image => image.selected);
                        if (selectedImage && selectedImage[0] && selectedImage[0].name)
                            selectedImage[0].name = selectedImage[0].name;
                        buildfire.imagePreviewer.show({
                            images: selectedImage
                        });
                    });

                });
            }
        }

        Report.init();

    }])
})(window.angular);