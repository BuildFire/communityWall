'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('CurrentProfileCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire','Location', 'EVENTS', 'SubscribedUsersData','SocialUserProfile', 'SocialItems', 'ProfileActivity', '$timeout', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, Location, EVENTS, SubscribedUsersData, SocialUserProfile, SocialItems , ProfileActivity, $timeout) {
            var t = this;
            t.SocialItems = SocialItems.getInstance();
            t.user = {
                userId: t.SocialItems.userDetails.userId,
                isCurrentUser:true
            }
            t.posts = {
                ownPosts:{
                    shouldFetchMore: true,
                    items: [],
                    container: document.getElementById("profile-posts-container")
                },
                taggedPosts:{
                    shouldFetchMore: true,
                    items: [],
                    container: document.getElementById("profile-tagged-posts-container")
                }
            }
            t.currentPage = "posts";
            t.strings = t.SocialItems.socialLanguages;
            t.currentPage = 'posts';
            t.isLoading = true;
            


            t.initProfile = (callback) =>{
                if(t.user.isCurrentUser){
                    t.user.userDetails = t.SocialItems.userDetails;
                    SocialUserProfile.search({filter:{
                        "_buildfire.index.string1":t.SocialItems.userDetails.userId
                    }},(err, data) =>{
                        console.log(t.user);
                        t.user.socialProfile = data[0];
                        return callback(true)
                    })
                }
                else{
                    console.log("no");
                }
 
            }



            t.shouldShowSwitch = (callback) =>{
                if(t.user.isBlocked) return false;
                else return true;
            }

            t.shouldShowPosts = () =>{
                if(t.user.isCurrentUser) return true;
                else if(t.user.isPublicProfile) return true;
                else if(t.user.amIFollowing) return true;
                else return false;
            }

            t.init = () =>{
                $rootScope.showThread = false;
                t.initProfile(finished =>{
                    if(finished){
                        t.initPosts(finished =>{
                            if(finished){
                                t.initTaggedPosts(finished =>{
                                    if(finished){
                                        
                                        $timeout(function(){
                                            t.isLoading = false;
                                            $scope.$digest();
                                        })
                                    }
                                })
                            }
                        })                        
                    }
                });
            }



            t.initPosts = (callback) =>{
                t.attachListener(t.posts.ownPosts.container,"ownPosts");
                t.getPosts("ownPosts",(err, posts) =>{
                    t.posts.ownPosts.items.push(...posts);
                    t.injectElementsss(posts, t.posts.ownPosts.container, finished =>{
                        if(finished){
                            return callback(true);
                        }
                    })
                })
            }

            t.initTaggedPosts = (callback) =>{
                t.attachListener(t.posts.taggedPosts.container,"taggedPosts");
                t.getPosts("taggedPosts",(err, posts) =>{
                    t.posts.taggedPosts.items.push(...posts);
                    t.injectElementsss(posts, t.posts.taggedPosts.container, finished =>{
                        if(finished){
                            return callback(true);
                        }
                    })
                })
            }

            t.getPosts = (type, callback) =>{
                let options = {
                    skip: t.posts[type].items.length, 
                    limit: 8, 
                    sort:{createdOn: -1}
                }
                if(type === 'ownPosts'){
                    options.filter = {"_buildfire.index.array1.string1":`userId_${t.user.userId}`}
                }
                else{
                    options.filter = {"_buildfire.index.array1.string1":`tagged_${t.user.userId}`};
                }
                Buildfire.appData.search(options,"wall_posts",(err, data) =>{
                    if(err) return callback(err);
                    else{
                        if(data && data.length != 8) t.posts[type].shouldFetchMore = false;
                        return callback(null, data)
                    } 
                })
            }

            t.attachListener = (container, type) =>{
                container.addEventListener('scroll',() =>{
                    if( t.posts[type].shouldFetchMore && ( container.scrollTop - (container.scrollHeight - container.offsetHeight) > - 30) && !t.isCurrentlyFetching ){
                        Buildfire.spinner.show();
                        t.isCurrentlyFetching = true;
                        t.getPosts(type,(err, posts) =>{
                            t.posts[type].items.push(...posts);
                            t.injectElementsss(posts, t.posts[type].container, finished =>{
                                if(finished){
                                    t.isCurrentlyFetching = false;
                                    Buildfire.spinner.hide();
                                }
                            })
                        })
                    }
                });
            }

            t.loadPage = function(title){
                if(title === t.currentPage) return;
                else{
                    var oldPage = t.currentPage + "";
                    t.currentPage = title;
                    document.getElementById("profile-"+oldPage).classList.add("no-bottom-border");
                    document.getElementById("profile-"+oldPage).classList.remove("has-bottom-border");
                    document.getElementById("profile-"+title).classList.add('has-bottom-border');
                    document.getElementById("profile-"+title).classList.remove('no-bottom-border');
                    $timeout(function(){
                        $scope.$digest();
                    })

                }
            }

            t.openSinglePost = (postId) =>{
                Location.go("#/singlePostView/"+postId)
            }

            t.createElement = function(type, innerHTML = "", elClass = [], id = "", post){
                let e = document.createElement(type);
                e.innerHTML = "";
                elClass.forEach(c => e.classList.add(c));
                if(id) e.id = id;
                if(!post) return e;
                e.onclick = function(){
                    console.log(post);
                    t.openSinglePost(post.id)
                }
                return e;
            }
            t.createImage = function(src, postId){
                let e = document.createElement('img');
                e.src = Buildfire.imageLib.cropImage(src, {width: 100, height: 100});
                e.onclick = () =>{
                    console.log(postId);
                    t.openSinglePost(postId)
                }
                return e;
            }

            t.injectElementsss = function(posts, container, callback){
                console.log("injecting");
                console.log(posts);
                console.log(container);
                if(!container) return;
                let lastParent;
                let lastElement;
                let lastParentType = "row";
                let img;
                for (let i = 0; i < posts.length; i++) {
                    console.log("injecting");
                    console.log(i);
                    if( parseInt(i / 5) != 0 &&  lastParentType == "grid" ){
                        lastParentType = "row";
                        lastParent = t.createElement("div","",["row-grid"]);
                        container.appendChild(lastParent);
                    }
                    else if(parseInt(i / 5) == 0 && lastParentType == "row"){
                        lastParentType = "grid";
                        lastParent = t.createElement("div","",["grid"]);
                        container.appendChild(lastParent)
                    }
                    lastElement = t.createElement("div","",[],"",posts[i]);
                    if(posts[i].data.images){
                        img = t.createImage(posts[i].data.images[0], posts[i].id);
                        lastElement.appendChild(img);
                    }
                    
                    lastParent.appendChild(lastElement);
                    if(i == posts.length - 1){

                        $timeout(function(){
                            $scope.$digest();
                        },100)
                        return callback(true);
                    }
                }
            }

            t.init();
        }]);
})(window.angular);