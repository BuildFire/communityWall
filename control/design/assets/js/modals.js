(function (angular, buildfire) {
    'use strict';
    if (!buildfire) {
        throw ("buildfire not found");
    }
    angular
        .module('socialModals', ['ui.bootstrap'])
        .factory('Modals', ['$modal', '$q', '$modalStack', function ($modal, $q, $modalStack) {
            return {
                removePopupModal: function (info) {
                    var removePopupDeferred = $q.defer();
                    var removePopupModal = $modal
                        .open({
                            templateUrl: 'templates/modals/rm-post-modal.html',
                            controller: 'RemovePopupCtrl',
                            controllerAs: 'RemovePopup',
                            size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    removePopupModal.result.then(function (imageInfo) {
                        removePopupDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        removePopupDeferred.reject(err);
                    });
                    return removePopupDeferred.promise;
                },
                banPopupModal: function (info) {
                    var banPopupDeferred = $q.defer();
                    var banPopupModal = $modal
                        .open({
                            templateUrl: 'templates/modals/ban-user-modal.html',
                            controller: 'BanPopupCtrl',
                            controllerAs: 'BanPopup',
                            size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    banPopupModal.result.then(function (imageInfo) {
                        banPopupDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        banPopupDeferred.reject(err);
                    });
                    return banPopupDeferred.promise;
                },
                resetAppPopupModal: function (info) {
                    var resetAppPopupDeferred = $q.defer();
                    var resetAppPopupModal = $modal
                        .open({
                            templateUrl: 'templates/modals/reset-app-modal.html',
                            controller: 'ResetAppPopupCtrl',
                            controllerAs: 'ResetAppPopup',
                            size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    resetAppPopupModal.result.then(function (imageInfo) {
                        resetAppPopupDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        resetAppPopupDeferred.reject(err);
                    });
                    return resetAppPopupDeferred.promise;
                },
                exportThreadsModal: function (info) {
                    var exportThreadsDeferred = $q.defer();
                    var exportThreadsModal = $modal
                        .open({
                            templateUrl: 'templates/modals/export-threads-modal.html',
                            controller: 'exportThreadsPopupCtrl',
                            controllerAs: 'ExportThreadsPopup',
                            size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    exportThreadsModal.result.then(function (imageInfo) {
                        exportThreadsDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        exportThreadsDeferred.reject(err);
                    });
                    return exportThreadsDeferred.promise;
                },
                close: function(reason) {
                    $modalStack.dismissAll(reason);
                }
            };
        }])
        .controller('RemovePopupCtrl', ['$scope', '$modalInstance', 'Info', function ($scope, $modalInstance, Info) {
            console.log('RemovePopup Controller called-----');
            $scope.value=Info.name;
            $scope.ok = function () {
                $modalInstance.close('yes');
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('no');
            };
        }])
        .controller('BanPopupCtrl', ['$scope', '$modalInstance', 'Info', function ($scope, $modalInstance, Info) {
            console.log('Ban Popup Controller called-----');
            $scope.ok = function () {
                $modalInstance.close('yes');
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('no');
            };
        }])
        .controller('ResetAppPopupCtrl', ['$scope', '$modalInstance', 'Info', function ($scope, $modalInstance, Info) {
            console.log('ResetApp Popup Controller called-----');
            $scope.ok = function () {
                $modalInstance.close('yes');
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('no');
            };
        }])
        .controller('exportThreadsPopupCtrl', ['$scope', '$modalInstance', 'Info', function ($scope, $modalInstance, Info) {
            console.log('Export Threads Popup Controller called-----');

            $scope.infinteScrollOptions = {
                skip : 0
            };

            $scope.privateThreads = [];

            function getThreads(query,callback) {
                if (!query)
                    query = {};

                buildfire.publicData.search(query, 'mainThreads', function (err, data) {
                    if(callback)
                        callback(err,data);
                });
            }
           
            $scope.search = function (option) {
                if(!option)
                    option ={};

                var query={
                    "skip": option.skip ? parseInt(option.skip) : 0,
                    "limit": option.limit ? parseInt(option.limit) : 10
                };

                $scope.noMore = true;
                buildfire.spinner.show();

                if($scope.txtSearch) {
                    query.filter= {"$json.threadTitle":{"$regex":$scope.txtSearch,"$options" : "i"}};
                }

                getThreads(query,function (err,data) {
                    if (err)
                        alert('there was a problem retrieving your data');
                    else{
                        if(!option.skip || option.skip == 0){
                            $scope.privateThreads = [];
                        }

                        if(data && data.length > 0){
                            $scope.noMore = false;
                            $scope.privateThreads= $scope.privateThreads.concat(data);
                        }else{
                            $scope.noMore = true;
                        }
                    }
                    if (!$scope.$$phase)$scope.$digest();
                    buildfire.spinner.hide();
                });
            };
            $scope.export = function (thread) {
                // return thread id for home controller to start exporting
                $modalInstance.close(thread);
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('no');
            };
            $scope.init = function () {
                $scope.search();
            };
            $scope.getMoreThreads = function () {
                $scope.infinteScrollOptions.skip +=10;
                $scope.search($scope.infinteScrollOptions);
            };
            $scope.keypress = function($event) {
                //enter key event
                if($event.charCode == 13){
                    $scope.search();
                }
            };

            $scope.init();
        }])
})(window.angular, window.buildfire);
