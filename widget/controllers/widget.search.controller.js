'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('SearchCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location','$timeout', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems,  Location, $timeout) {
            var Search = this;
            Search.SocialItems = SocialItems.getInstance();
            $scope.isBusy = true;
            $scope.results = [];
            $scope.tasksFinished = 0;
            Search.init = function(){
                $rootScope.showThread = false;
                $scope.searchInput = document.getElementById("searchInput");

                $scope.searchInput.addEventListener('input',$scope.debounce(() =>{
                    Buildfire.spinner.show();
                    var val = $scope.searchInput.value;
                    if(val.length >= 1){
                        $scope.isBusy = true;
                        $scope.results = [];
                        $scope.$digest();
                        let interval = setInterval(() => {
                            if($scope.tasksFinished === 3){
                                
                                $scope.isBusy = false;
                                $scope.results = $scope.results.sort((a,b) => a.position - b.position)
                                $scope.tasksFinished = 0;
                                Buildfire.spinner.hide();
                                $scope.$digest();
                                clearInterval(interval)
                            }
                        }, 300);
                        $scope.searchUsers(val, (err, users) =>{
                            if(err) $scope.tasksFinished += 1;
                            else if(users.length > 0){
                                $scope.results.push(...users.map((user) =>{
                                    return {type:"user", position: 0,data:user}
                                }))
                                $scope.tasksFinished += 1;
                            }
                            else{
                                $scope.tasksFinished += 1;
                            }

                            
                        })
                        $scope.searchHashtags(val, (err, hashtags) =>{
                            if(err) $scope.tasksFinished += 1;
                            else if(hashtags.length > 0){
                                Buildfire.spinner.hide();
                                $scope.results.push(...hashtags.map(tag =>{
                                    return {type:"hashtag",position: 1, data:tag}
                                }));
                                $scope.tasksFinished += 1;
                            }
                            else{
                                $scope.tasksFinished += 1;
                            }

                        })
                        $scope.getLocations(val, (results, state) =>{
                            if(state === "OK" && results.length > 0){
                                $scope.results.push(...results.map(loc =>{
                                    return {type:"location", position: 2, data:loc}
                                }))
                                $scope.tasksFinished += 1;
                            }
                            else{
                                $scope.tasksFinished += 1;
                            }
                        })
                    }
                    else if(val.length == 0){
                        $scope.results = [];
                        Buildfire.spinner.hide();
                        $scope.$digest();
                    }
                    else Buildfire.spinner.hide();
                }));
            }

            $scope.navigateToUserProfile = function(userId){
                Location.go("#/profile/"+userId)
            }

            $scope.navigateToFilteredResults = function(type, title){
                Location.go(`#/filteredResults/${type}/${title}`)
            }
            

            $scope.debounce = function(func, timeout = 300){
                let timer;
                return (...args) => {
                  clearTimeout(timer);
                  timer = setTimeout(() => { 
                      func.apply(this, args);

                    }, timeout);
                };
            }
            $scope.searchUsers = function(val, callback){
                let options = {
                    filter : {
                        $and:[
                            {
                                "_buildfire.index.array1.string1":{$ne:`userId_${Search.SocialItems.userDetails.userId}`}
                            },
                            {
                                "_buildfire.index.string1":""
                            },
                            {
                                $or:[
                                    {"$json.userDetails.displayName":{"$regex":val,"$options":"i"}},
                                ]
                            }
                        ]

                    },
                    limit : 25,
                    skip: 0
                }
                SubscribedUsersData.getUsers(options, function (err, data){
                    if(err) return callback(err);
                    else {
                        console.log(data);
                        return callback(null, data);
                    }
                }, Search.SocialItems.userDetails.userId)
            }

            $scope.cropImage = function(image){
                return Buildfire.imageLib.cropImage(image, {width: 45, height: 45});
            }


            $scope.searchHashtags = function(val , callback){
                let options = {
                    filter : {"$json.name":{"$regex":val,"$options":"i"}},
                    limit : 25,
                    skip: 0
                }
                Buildfire.publicData.search(options, "$$hashtag$$",(err, data) =>{
                    err ? callback(err) : callback(null, data);
                })
            }
            $scope.getLocations = function(val, callback) {
                const service = new google.maps.places.AutocompleteService();
                service.getQueryPredictions({
                    input: val
                }, (results, status) =>{
                    if(!results) return callback([], "NOT OK");
                    if(results.length > 3) return callback(results.splice(0,3), status);
                    else callback(results, status)
                });
                }
            Search.init();
        }]);
})(window.angular);