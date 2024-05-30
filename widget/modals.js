(function (angular, buildfire) {
    'use strict';
    if (!buildfire) {
        throw ("buildfire not found");
    }
    angular
        .module('socialModals', ['ui.bootstrap'])
        .factory('Modals', ['$modal', '$q', '$modalStack', function ($modal, $q, $modalStack) {
            return {
                showMoreOptionsModal: function (info, callback) {
                    var moreOptionsPopupDeferred = $q.defer();
                    var showMoreOptionModal = $modal
                        .open({
                            templateUrl: 'templates/modals/more-options-modal.html',
                            controller: 'MoreOptionsModalPopupCtrl',
                            controllerAs: 'MoreOptionsPopup',
                            size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    showMoreOptionModal.result.then(function (imageInfo) {
                        moreOptionsPopupDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        moreOptionsPopupDeferred.reject(err);
                    });
                    return moreOptionsPopupDeferred.promise;
                },
                showMoreOptionsCommentModal: function (info, callback) {
                    var moreOptionsPopupDeferred = $q.defer();
                    var showMoreOptionModal = $modal
                        .open({
                            templateUrl: 'templates/modals/more-options-comment-modal.html',
                            controller: 'MoreOptionsCommentModalPopupCtrl',
                            controllerAs: 'MoreOptionsPopup',
                            size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    showMoreOptionModal.result.then(function (imageInfo) {
                        moreOptionsPopupDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        moreOptionsPopupDeferred.reject(err);
                    });
                    return moreOptionsPopupDeferred.promise;
                },
                close: function(reason) {
                    $modalStack.dismissAll(reason);
                }
            };
        }])
        .controller('MoreOptionsModalPopupCtrl', ['$scope', '$modalInstance', 'Info','$rootScope','SocialDataStore','Buildfire', function ($scope, $modalInstance, Info,$rootScope,SocialDataStore,Buildfire) {
            var MoreOptionsPopup=this;
            MoreOptionsPopup.option='';
            MoreOptionsPopup.options = []
            $scope.postId=Info.postId;
            $scope.userId=Info.userId;
            $scope.socialItemUserId=Info.socialItemUserId;
            $scope.languages = Info.languages;
            let reportPost =Info.languages.reportPost;
            let blockUser =Info.languages.blockUser;
            
            if($scope.socialItemUserId != $scope.userId)  MoreOptionsPopup.options.push(reportPost);
            if($scope.socialItemUserId != $scope.userId)  MoreOptionsPopup.options.push(blockUser);

            $scope.ok = function (option) {
                $modalInstance.close(option);
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('no');
            };

            $scope.block = function () {
                console.log('block called');
            };

            $scope.deletePost=function(postId){
                $modalInstance.close("delete");
            }
        }])
        .controller('MoreOptionsCommentModalPopupCtrl', ['$scope', '$modalInstance', 'Info','$rootScope','SocialDataStore','Buildfire', function ($scope, $modalInstance, Info,$rootScope,SocialDataStore,Buildfire) {
            console.log('MoreOptionsModalPopup Controller called-----');
            var MoreOptionsPopup=this;

            $scope.comment=Info.comment;
            $scope.threadId=Info.threadId;
            $scope.userId=Info.userId;
            $scope.commentUserId=Info.commentUserId;            
            $scope.languages = Info.languages;

            $scope.ok = function (option) {
                $modalInstance.close(option);
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('no');
            };

            $scope.block = function () {
                console.log('block called');

            };

            $scope.reportComment=function(comment){
                $rootScope.$emit('Report-Comment',comment)
                $modalInstance.close();
            }

            $scope.deleteComment=function(comment){
                $rootScope.$emit('Delete-Comment', comment)
                $modalInstance.close();
            }
        }])

})(window.angular, window.buildfire);
