'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('DiscoverCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location','$timeout', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems, Location, $timeout) {
            var Discover = this;
            Discover.SocialItems = SocialItems.getInstance();
            $scope.finishRender = false;
            $scope.activePageIndex = 1;
            $scope.users = [];
            $scope.shouldFetchMorePosts = true;
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
                Discover.getPosts({skip:0, limit:8, sort: {createdOn: -1}},function(err, result){
                    $rootScope.showThread = false;
                    $rootScope.$digest();
                    $scope.setActivePage($scope.activePageIndex);
                    $scope.posts = result;
                    $scope.injectElements(result);
                    $scope.getUsersWhoIdontFollow();
                    Discover.getTrendingHashtags((err, trendingHashtagsPosts) =>{
                        $scope.trendingHashtags = trendingHashtagsPosts;
                        $scope.isBusy = false;
                        Buildfire.spinner.hide();
                        $scope.$digest();
                    })
                    
                    let container = document.getElementById("discover-posts-container");
                    container.addEventListener('scroll',() =>{
                        if( $scope.shouldFetchMorePosts && ( container.scrollTop - (container.scrollHeight - container.offsetHeight) > - 30) && !$scope.isBusy ){
                            Buildfire.spinner.show();
                            $scope.isBusy = true;
                            Discover.getPosts({skip:$scope.posts.length, limit:8, sort: {createdOn: -1} }, function(err, result){
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
                    if(posts[i].data.images){
                        img = $scope.createImage(posts[i].data.images[0]);
                        lastElement.appendChild(img);
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
                                console.log("gonna log users");
                                $scope.users.forEach(user => console.log(user.data.userId))
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
                return Buildfire.imageLib.cropImage(url, {width: dimensions.width, height: dimensions.height});
            }
            Discover.init();
        }]);
})(window.angular);