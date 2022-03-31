'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('DiscoverCtrl', ['$scope', '$rootScope','SocialUserProfile', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location','$timeout', function ($scope, $rootScope, SocialUserProfile, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems, Location, $timeout) {
            var Discover = this;
            Discover.SocialItems = SocialItems.getInstance();
            $scope.finishRender = false;
            $scope.activePageIndex = 1;
            $scope.users = [];
            $scope.shouldFetchMorePosts = true;
            Discover.isLoading = true;
            $scope.setActivePage = function(pageIndex){
                let pages = document.getElementById("navBar").children;
                let page = pages.item(pageIndex);
                pages.item(0).style.borderBottomWidth = "0px";
                pages.item(1).style.borderBottomWidth = "0px";
                pages.item(2).style.borderBottomWidth = "0px";
                page.style.borderBottomWidth = "2px";
                $scope.activePageIndex = pageIndex;
                $scope.sendToCp([]);;
                if(pageIndex === 0) $scope.sendToCp();
                else if(pageIndex === 1) $scope.sendToCp();
                else if(pageIndex === 2) $scope.sendToCp();
                
            }

            Discover.followUser = (userId) =>{
                let params = {userId, currentUser: Discover.SocialItems.userDetails.userId};
                SocialUserProfile.followUnfollowUser(params, (err, data) =>{
                    if(data){
                        console.log(data);
                        console.log($scope.users);
                        let index = $scope.users.findIndex(e => e.data.userId === data.data.userId);
                        console.log($scope.users[index]);
                        Buildfire.dialog.toast({
                            message: "Started Following " + Discover.SocialItems.getUserName($scope.users[index].data.userDetails) ,
                        });
                        $scope.users.splice( index , 1);
                        $timeout(function(){
                            $scope.$digest();
                        })
                    }
                });
            }
            
            Discover.goToFilteredPosts = (type, title) =>{
                Location.go(`#/filteredResults/${type}/${title}`)
            }
            $scope.sendToCp = function(items){
                let posts = [];
                if(items && items.length > 0) items.map(item => posts.push(item.data))
                window.buildfire.messaging.sendMessageToControl({
                    name: 'SEND_POSTS_TO_CP',
                    posts: posts,
                });
            }
            Discover.getTrendingHashtags = (callback) =>{
                let date = new Date();
                let tag = "$$$hashtags_count$$$_"+date.getDay() + "$" + date.getMonth() + "$" + date.getYear();
                console.log(tag);
                Buildfire.appData.search({},tag, (err, results) =>{
                    if(err || (results && results.length == 0)) return callback(null, null);
                    console.log(results);
                    let data = {...results[0].data};
                    const sortable = Object.entries(data)
                    .sort(([,a],[,b]) => b-a)
                    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
                    let length = Object.entries(sortable).length;
                    for(let i = 0 ; i < length ; i++){
                        Buildfire.appData.search({filter:{"$json.hashtags":Object.keys(sortable)[i]},skip:0, limit: 10, sort:{createdOn: -1}} , "wall_posts",(err, data) =>{
                            if(data){
                                sortable[Object.keys(sortable)[i]] = data;
                            }
                            if(i === length - 1){
                                return callback(null, sortable)
                            }
                        })
                    }
                })
            }
            Discover.init = function(){
                Buildfire.spinner.show();
                $scope.isBusy = true;
                $scope.trendingHashtags = {};
                Discover.getPosts({filter:{"_buildfire.index.string1":""},skip:0, limit:8, sort: {createdOn: -1}},function(err, result){
                    console.log(result);
                    $rootScope.showThread = false;
                    $rootScope.$digest();
                    $scope.setActivePage($scope.activePageIndex);
                    $scope.posts = result;
                    $scope.injectElements(result);
                    Discover.getUsersWhoIDontFollow();
                    Discover.getTrendingHashtags((err, trendingHashtagsPosts) =>{
                        $scope.trendingHashtags = trendingHashtagsPosts;
                        console.log($scope.trendingHashtags);
                        $scope.isBusy = false;
                        Buildfire.spinner.hide();
                        console.log(Discover.isLoading);
                        $scope.$digest();
                    })
                    
                    Discover.isLoading = false;
                    let container = document.getElementById("discover-posts-container");
                    container.addEventListener('scroll',() =>{
                        if( $scope.shouldFetchMorePosts && ( container.scrollTop - (container.scrollHeight - container.offsetHeight) > - 30) && !$scope.isBusy ){
                            Buildfire.spinner.show();
                            $scope.isBusy = true;
                            Discover.getPosts({filter:{"_buildfire.index.string1":""},skip:$scope.posts.length, limit:8, sort: {createdOn: -1} }, function(err, result){
                                console.log(result);
                                if(result && result.length == 8){ 
                                    $scope.posts.push(...result);
                                    $scope.injectElements(result);
                                    $scope.isBusy = false;
                                    Buildfire.spinner.hide();
                                }
                                else{
                                    $scope.shouldFetchMorePosts = false;
                                    $scope.isBusy = false;
                                    Buildfire.spinner.hide();
                                }
                            })
                        }
                    })
                })
            }

            $scope.createElement = function(type, innerHTML = "", elClass = [], id = "", post){
                let e = document.createElement(type);
                e.innerHTML = "";
                elClass.forEach(c => e.classList.add(c));
                if(id) e.id = id;
                if(!post) return e;
                e.onclick = function(){
                    $scope.openSinglePost(post.id)
                }
                return e;
            }
            $scope.createImage = function(src){
                let e = document.createElement('img');
                e.src = $scope.crop(src, {width: 100, height: 100});
                return e;
            }

            $scope.openSinglePost = function(postId){
                Location.go("#/singlePostView/"+postId);
            }
            $scope.navigateToProfile = function(userId){
                Location.go("#/profile/"+userId);
            }

            $scope.createVideo = (src, postId, parent) =>{
                parent.style.position = "relative";
                parent.style.backgroundColor = "#E5E5E5"
                let span = document.createElement("span");
                span.classList.add("material-icons");
                span.innerHTML = "play_arrow";
                span.style.fontSize = "70px";
                span.style.position = "absolute"
                let e = document.createElement('video');
                e.style.width = "100%";
                e.style.height = "100%";
                e.style.objectFit = "cover"
                e.style.borderRadius = "15px";
                let vidSrc = document.createElement("source");
                vidSrc.src = src+"#t=0.1";
                vidSrc.type = "video/mp4";
                e.appendChild(vidSrc)
                parent.appendChild(span);
                parent.appendChild(e);
            }

            $scope.injectElements = function(posts){
                let container = document.getElementById("discover-posts-container");
                if(posts.length == 0){
                    let empty = $scope.createElement("div","",["empty_state"]);
                    container.appendChild(empty)
                    return;
                }
                let lastParent;
                let lastElement;
                let lastParentType = "row";
                let img;
                for (let i = 0; i < posts.length; i++) {
                    if( parseInt(i / 5) != 0 &&  lastParentType == "grid" ){
                        lastParentType = "row";
                        lastParent = $scope.createElement("div","",["row-grid"]);
                        container.appendChild(lastParent);
                    }
                    else if(parseInt(i / 5) == 0 && lastParentType == "row"){
                        lastParentType = "grid";
                        lastParent = $scope.createElement("div","",["grid"]);
                        container.appendChild(lastParent)
                    }
                    lastElement = $scope.createElement("div","",[],"",posts[i]);
                    if(posts[i].data.images && posts[i].data.images.length > 0){
                        img = $scope.createImage(posts[i].data.images[0], posts[i].id);
                        lastElement.appendChild(img);
                    }
                    else if(posts[i].data.videos && posts[i].data.videos.length > 0){
                        let vid = $scope.createVideo(posts[i].data.videos, posts[i].id , lastElement);
                    }
                    
                    lastParent.appendChild(lastElement);
                    if(i === posts.length - 1){
                        Buildfire.spinner.hide();
                        $scope.finishRender = true;
                    }
                }
            }

            $scope.navigateToSearch = function(){
                Location.go("#/search");
            }
            Discover.getPosts = function(options, callback){                
                Buildfire.appData.search(options,"wall_posts", function (err, data) {
                    // Discover.showUserLikes();
                    return callback(err, data)
                });                       
            }


            Discover.getUsersWhoIDontFollow = () =>{
                let isUserLoggedIn = Discover.SocialItems.userDetails.userId ? true : false;
                let options = {};
                if(isUserLoggedIn){
                    SocialUserProfile.get(Discover.SocialItems.userDetails.userId, (err, socialProfile) =>{
                        if(err){
                            options.filter = {};
                        }
                        else{
                            let arrayOfIndexes = []
                            socialProfile.data.following.forEach(item =>{
                                arrayOfIndexes.push({"_buildfire.index.array1.string1":{$ne:`userId_${item}`}});
                            })
                            
                            socialProfile.data.blockedUsers.forEach(item =>{
                                arrayOfIndexes.push({"_buildfire.index.array1.string1":{$ne:`userId_${item}`}});
                            });
                            arrayOfIndexes.push({"_buildfire.index.string1":""})
                            options.filter = {
                                $and: arrayOfIndexes
                            }

                        }
                        options.filter['$and'].push({"_buildfire.index.array1.string1":{$ne:`userId_${Discover.SocialItems.userDetails.userId}`}})
                        options.skip = 0;
                        options.limit = 50;
                        SubscribedUsersData.getUsers(options, (err, data) =>{
                            console.log(data);
                            $scope.users = data;
                            $timeout(function(){
                                $scope.$digest();
                            })

                        }, Discover.SocialItems.userDetails.userId)
                    })
                }
                else{
                    SubscribedUsersData.getUsers({skip:0,limit: 50}, (err, data) =>{
                        $scope.users = data;
                        $timeout(function(){
                            $scope.$digest();
                        })

                    })
                }
            }


            $scope.getUsersWhoIdontFollow = function(){
                
                Buildfire.appData.search({filter:{"$json.userId":Discover.SocialItems.userDetails.userId}},"SocialUserProfile", (err, results) =>{
                    if(err) return;
                    else if(results){
                        let arr = [...results[0].data.following, Discover.SocialItems.userDetails.userId];
                        let options = {
                            filter:{"$json.userId":{$nin: arr}},
                            limit : 25,
                            skip: $scope.users.length
                        }
                        SubscribedUsersData.getUsers(options, function (err, data){
                            if(err) console.log(err);
                            else {
                                $scope.users = data;
                                $timeout(function(){
                                    $scope.$digest();
                                })
                            }
                        })
                    }  
                })
            }

            $scope.isObjectEmpty = function(obj){
                if(!obj) return true;
                return Object.keys(obj).length === 0;
             }

            $scope.crop = function(url, dimensions){
                return Buildfire.imageLib.cropImage(url,{ size: "half_width", aspect: "9:16" });
            }
            Discover.init();
        }]);
})(window.angular);