app.controller('ReportsCtrl', ['$scope','$timeout','$q', function ($scope, $timeout, $q) {

    $scope.data = {};
    $scope.event = event;
    let searchTableHelper = null;
    window.buildfire.messaging.sendMessageToWidget({
        name: 'ASK_FOR_WALLID'
    });

    window.buildfire.messaging.onReceivedMessage = function (event) {
        if (event.name === "SEND_WALLID" || event.name === "POST_REPORTED") return loadTable(event);
    }


    $scope.banUser = function (userId, threadId, username) {

        
        window.buildfire.dialog.confirm(
            {
                title: "Ban User",
                message: `Are you sure you want to ban this user? This action will delete all 
                posts and comments made by this user. User will not be able to post 
                again`,

                confirmButton: {
                    text: "Ban User",
                    type: "danger",
                },
            },
            (err, isConfirmed) => {
                if (err) console.error(err);

                if (isConfirmed) {
                    // Called when getting success from SocialDataStore banUser method
                    var success = function (response) {
                        console.log(
                            "User successfully banned and response is :",
                            response
                        );
                        window.location.reload();

                    };
                    // Called when getting error from SocialDataStore banUser method
                    var error = function (err) {
                        console.log("Error while banning a user ", err);
                    };
                    // Calling SocialDataStore banUser method for banning a user
                    banUser(userId).then(
                        success,
                        error
                    );
                }
            }
        );
    };



    $scope.deleteReport = function(index){
        $scope.reports.splice(index, 1);
        $timeout(function(){
            $scope.$digest();
        });
        window.buildfire.appData.save($scope.reports, 'reports_' + $scope.event.wid, (error, result) => {
            if (error) return console.log(error);
            $scope.reports = result.data;
            console.log($scope.reports);
            $scope.$digest();
        });
    }

        $scope.deletePost = function (postId) {

            console.log(postId);
            var deletePost = function(postId) {
                var deferred = $q.defer();
                window.buildfire.appData.delete(postId, 'wall_posts', function (err, status) {
                    if (err) return deferred.reject(err);
                    else return deferred.resolve(status);
                })
                return deferred.promise;
            }


            window.buildfire.dialog.confirm(
                {
                    title: "Delete Post",
                    message: `Are you sure you want to delete this post?`,
                    confirmButton: {
                        text: "Delete",
                        type: "danger",
                    },
                },
                (err, isConfirmed) => {
                    if (err) console.error(err);
                    if (isConfirmed) {
                        // Called when getting success from SocialDataStore.deletePost method
                        var success = function (response) {
                            console.log('inside success of delete post', response);
                            if (response) {
                                window.buildfire.messaging.sendMessageToWidget({ 'name': "POST_DELETED", 'id': postId });
                                $scope.deleteReport($scope.reports.findIndex(e => e.post.id === postId));
                            }
                        };
                        // Called when getting error from SocialDataStore.deletePost method
                        var error = function (err) {
                            $scope.deleteReport($scope.reports.findIndex(e => e.post.id === postId));

                        };

                        // Deleting post having id as postId
                        deletePost(postId).then(success, error);
                    }
                }
            );

            console.log('delete post method called', postId);
            
        };


    var banUser = function (userId, wallId) {
        var deferred = $q.defer();

        let searchOptions = {
            filter: {
                $and: [
                    { "$json.userId": userId },
                    { '$json.wid': wallId }
                ]
            }
        }

        let searchOptions2 = {
            filter: {
                $and: [
                    { "$json.comments.userId": userId },
                    { '$json.wid': wallId }
                ]
            }
        }

        window.buildfire.appData.search(searchOptions2, 'wall_posts', (error, data) => {
            if (error) return deferred.reject(error);
            let count = 0;
            if (data && data.length) {
                data.map(post => {
                    post.data.comments.map((comment, index) => {
                        if (comment.userId === userId) {
                            post.data.comments.splice(index, 1)
                        }
                    })
                    window.buildfire.appData.update(post.id, post.data, 'wall_posts', (error, data) => {
                        if (error) return deferred.reject(error);
                    })
                })
            }
            window.buildfire.appData.search(searchOptions, 'wall_posts', (error, data) => {
                if (error) return deferred.reject(error);
                if (data && data.length) {
                    data.map(post => {
                        window.buildfire.appData.delete(post.id, 'wall_posts', function (err, status) {
                            if (error) return deferred.reject(error);
                            return deferred.resolve(status);
                        })
                    })
                }
            });
        });
        return deferred.promise;
    };


    $scope.usersData = [];
    $scope.getUserName = function (userDetails) {
        var userName = '';
        userName = userDetails.displayName || "Someone";
        return userName;
    };
    $scope.getDuration = function (timestamp) {
        return moment(timestamp.toString()).fromNow();
    };

    function loadTable(event) {
        $scope.event = event;
        window.buildfire.appData.get('reports_' + event.wid, (error, result) => {
            if (error) return console.log(error);
            $scope.reports = result.data;
            console.log($scope.reports);
            $scope.$digest();
        });
    }

    function banUser(data) {
        window.buildfire.spinner.show();

        let searchOptions = {
            filter: { "_buildfire.index.string1": data.wid, $and: [{ "$json.userId": data.reportedUserID }] },
            pageSize: 50,
            page: 0,
            recordCount: true
        }

        let searchOptions2 = {
            filter: {
                "_buildfire.index.string1": data.wid,
                $and: [{ "$json.comments.userId": data.reportedUserID }]
            },
            pageSize: 50,
            page: 0,
            recordCount: true
        }

        window.buildfire.appData.get('reports_' + data.wid, (error, result) => {
            if (error) return console.log(error);
            result.data = result.data.filter(el => el.reportedUserID !== data.reportedUserID);
            window.buildfire.appData.update(result.id, result.data, 'reports_' + data.wid, () => {});
        });

        let allPosts = [], allComments = [];
        window.buildfire.spinner.show();


        let getPosts = function () {
            function requestBan() {
                window.buildfire.messaging.sendMessageToWidget({
                    name: 'BAN_USER', reported: data.reportedUserID, wid: data.wid
                });
                loadTable({ wid: data.wid })
            }
            function fetchPosts() {
                window.buildfire.appData.search(searchOptions, 'wall_posts', (error, posts) => {
                    if (error) return console.log(error);
                    allPosts = allPosts.concat(posts.result)
                    if (posts.totalRecord > allPosts.length) {
                        searchOptions.page++;
                        fetchPosts();
                    } else {
                        let count = 0;
                        allPosts.map(post => {
                            window.buildfire.appData.delete(post.id, 'wall_posts', function (error, status) {
                                if (error) return console.log(error);
                                count++;
                                if (count === allPosts.length) {
                                    requestBan();
                                }
                            });
                        });
                    }
                });
            }
            fetchPosts();
        }
        getPosts();
    }
}]);