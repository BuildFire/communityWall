'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('FilteredCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location','$timeout', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems,  Location, $timeout) {
            var Filtered = this;
            Filtered.SocialItems = SocialItems.getInstance();
            Filtered.init = function(){
                $scope.type = $routeParams.type;
                $scope.title = $routeParams.title;
                let options = {
                    skip: 0,
                    limit: 8,
                    sort: {createdOn: -1}
                }
                if($scope.type === 'hashtag'){
                    options.filter = {
                        "$json.hashtags":$scope.title
                    };
                }
                else{
                    options.filter = {
                        "$json.location.address":$scope.title
                    }
                }
                Filtered.getPosts(options,function(err, result){
                    if(result){
                        $scope.injectElements(result)
                        $rootScope.showThread = false;
                    }
                    else{
                        $rootScope.showThread = false;
                    }

                });



            }
            Filtered.getPosts = function(options, callback){                
                Buildfire.publicData.search(options,"wall_posts", function (err, data) {
                    return callback(err, data)
                });                       
            }
            $scope.openSinglePost = function(postId){
                Location.go("#/singlePostView/"+postId);
            }
            $scope.injectElements = function(posts){

                let container = document.getElementById("filtered-posts-container");
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
                        console.log(posts[i]);
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
            $scope.createElement = function(type, innerHTML = "", elClass = [], id = "", post){
                let e = document.createElement(type);
                e.innerHTML = "";
                elClass.forEach(c => e.classList.add(c));
                if(id) e.id = id;
                if(!post) return e;
                e.onclick = function(){
                    console.log(post);
                    $scope.openSinglePost(post.id)
                }
                return e;
            }
            $scope.createImage = function(src){
                let e = document.createElement('img');
                e.src = src;
                return e;
            }
            Filtered.init();
        }]);
})(window.angular);