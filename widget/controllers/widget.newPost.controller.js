'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('NewPostCtrl', ['$scope', '$rootScope','ProfileActivity','$timeout', '$sce', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location', function ($scope, $rootScope, ProfileActivity , $timeout, $sce, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems, Location) {

            var NewPost = this;
            NewPost.SocialItems = SocialItems.getInstance();
            let postId = $routeParams.postId;
            console.log(postId);
            $scope.errorMessage = "Test";
            NewPost.init = function () {
                NewPost.people = [];
                $scope.sendToCp([]);
    
                $scope.googlePlace;
                $scope.googlePlaceDetails;
                NewPost.loadedHashtags = [];
                Buildfire.appData.search({},"$$hashtag$$",(err, r) =>{
                    if(err) return;
                    else {
                        NewPost.handleLoadedHashtagsUpdate(r);
                    }
                });
                if(postId != 0){
                    NewPost.SocialItems.getPost(postId,(err, res) =>{
                        $scope.text = res.text  ? res.text.replace(/[#&%+!@^*()-]/g, function (match) {
                            return encodeURIComponent(match)
                        }) : '',
                        $timeout(function(){
                            NewPost.text = res.text;
                            NewPost.choosenLocationName = res.location && res.location.address ? res.location.address : "";
                            $scope.selectedHashtags = res.hashtags;
                            console.log($scope.selectedHashtags);
                            $scope.$digest();
                        });
                        $scope.post = res;
                        $scope.HsuggestionItemTemplate = function(tagData){
                            return `
                                <div ${this.getAttributes(tagData)}
                                    class='tagify__dropdown__item'
                                    tabindex="0"
                                    role="option">
                                        <span style="bold font-size-18"># ${tagData.data.name}</span>                            
                                </div>
                            `
                        }
                        $scope.suggestionItemTemplate = function(tagData){
                            return `
                                <div ${this.getAttributes(tagData)}
                                    class='tagify__dropdown__item'
                                    tabindex="0"
                                    role="option">
                                    ${ tagData.data.userDetails.imageUrl ? `
                                    <div class='tagify__dropdown__item__avatar-wrap'>
                                        <img  src="${buildfire.imageLib.cropImage(tagData.data.userDetails.imageUrl, {width: 40, height: 40})}">
                                    </div>` : 
                                    `<div class='tagify__dropdown__item__avatar-wrap'>
                                        <img  src="../../../../styles/media/avatar-placeholder.png">
                                    </div>` 
                                    }
                                    <p>${tagData.data.userDetails.displayName || "Someone"}</p>
                                </div>
                            `
                        }
                        let autoCompleteHashtagsConfig = {
                            delimiters: ",| ",
                            editTags: false,
                            dropdown:{
                                enabled: 0,
                                maxItems:3
                            },
                            templates:{
                                dropdownItem: $scope.HsuggestionItemTemplate 
                            }
                        }
        
                        
                        $scope.hashtagsAutoComplete = new buildfire.components.autoComplete("hashtagsInput", autoCompleteHashtagsConfig);
                        $scope.hashtagsAutoComplete.onItemAdded = (e) =>{
                            $scope.selectedHashtags.push(e.detail.data.value);
                        }
                        $scope.hashtagsAutoComplete.onItemRemoved = (e) =>{
                            $scope.selectedHashtags.splice($scope.selectedHashtags.findIndex(x => x === e.detail.data.value), 1);
                        }
                        $scope.selectedUsers = [];
                        if(res.taggedPeople && res.taggedPeople.length){
                            SubscribedUsersData.getUsersByIds(res.taggedPeople, (err, data) =>{
                                var updateWhitelist = (list) =>{
                                    let whitelist = list.map(item => {
                                        return {key: item.id, value: item.data.name || item.data.title || item.data.userDetails.displayName || "", data:item.data};
                                    });
                                    console.log(whitelist);
                                    return whitelist;
                                };
                                let updatedList = updateWhitelist(data); 
                                let autoCompletePeopleConfig = {
                                    whitelist: updatedList,
                                    enforceWhitelist:true,
                                    editTags: false,
                                    dropdown:{
                                        enabled: 2,
                                    },
                                    templates:{
                                        dropdownItem: $scope.suggestionItemTemplate
                                    }
                                }

                                $scope.peopleAutoComplete = new buildfire.components.autoComplete("peopleInput", autoCompletePeopleConfig);
                                $scope.configurePeopleAutoComplete($scope.peopleAutoComplete);
                                $scope.selectedUsers = updatedList;
                                $timeout(function(){
                                    $scope.$digest();
                                });   
                                
                                // for(let i = 0 ; i < data.length ; i++){
                                //     let user = data[i].data.displayName || "Someone";
                                //     $scope.selectedUserNames = [];
                                //     $scope.selectedUserNames.push(user);
                                //     if(i == data.length - 1){
                                //         console.log($scope.selectedUserNames);
                                         
                                //     }
                                // }
                
                            })
                        }
                        else{
                            $scope.selectedUserNames = [];
                            let autoCompletePeopleConfig = {
                                enforceWhitelist:true,
                                whitelist:[],
                                editTags: false,
                                dropdown:{
                                    enabled: 2,
                                },
                                templates:{
                                    dropdownItem: $scope.suggestionItemTemplate
                                }
                            }
                            $scope.peopleAutoComplete = new buildfire.components.autoComplete("peopleInput", autoCompletePeopleConfig);
                            $scope.configurePeopleAutoComplete($scope.peopleAutoComplete)    ;
                            $timeout(function(){
                                $scope.$digest();
                            });  
                        }
                        let getCroppedImage = (url) =>{
                            return Buildfire.imageLib.cropImage(url, { size: "half_width", aspect: "16:9" });
                        }
                        $scope.selectedMedia = {
                            type: res.images.length > 0 ? "image" : res.videos.length > 0 ? "video" : "image",
                            src: res.images.length > 0 ? res.images[0] : res.videos.length > 0 ? res.videos[0] : "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                            shown:  res.images.length > 0 ? getCroppedImage(res.images[0]) : res.videos.length > 0 ? res.videos[0] : "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                        }
                        $rootScope.showThread = false;
                    })
                }
                else{
                    NewPost.text = "";
                    NewPost.loadedHashtags = [];
                    $scope.selectedHashtags = [];
                    $scope.selectedUsers = [];
    
                    $scope.selectedMedia = {
                        type: "image",
                        src: "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                        shown: "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                    }
                    $scope.HsuggestionItemTemplate = function(tagData){
                        return `
                            <div ${this.getAttributes(tagData)}
                                class='tagify__dropdown__item'
                                tabindex="0"
                                role="option">
                                    <span style="bold font-size-18"># ${tagData.data.name}</span>                            
                            </div>
                        `
                    }
                    $scope.suggestionItemTemplate = function(tagData){
                        return `
                            <div ${this.getAttributes(tagData)}
                                class='tagify__dropdown__item'
                                tabindex="0"
                                role="option">
                                ${ tagData.data.userDetails.imageUrl ? `
                                <div class='tagify__dropdown__item__avatar-wrap'>
                                    <img  src="${buildfire.imageLib.cropImage(tagData.data.userDetails.imageUrl, {width: 40, height: 40})}">
                                </div>` : 
                                `<div class='tagify__dropdown__item__avatar-wrap'>
                                    <img  src="../../../../styles/media/avatar-placeholder.png">
                                </div>` 
                                }
                                <p>${tagData.data.userDetails.displayName || "Someone"}</p>
                            </div>
                        `
                    }
                    let autoCompleteHashtagsConfig = {
                        delimiters: ",| ",
                        editTags: false,
                        dropdown:{
                            enabled: 0,
                            maxItems:3
                        },
                        templates:{
                            dropdownItem: $scope.HsuggestionItemTemplate 
                        }
                    }
    
                    let autoCompletePeopleConfig = {
                        enforceWhitelist:true,
                        whitelist:this.people,
                        editTags: false,
                        dropdown:{
                            enabled: 2,
                        },
                        templates:{
                            dropdownItem: $scope.suggestionItemTemplate
                        }
                    }
                    $scope.hashtagsAutoComplete = new buildfire.components.autoComplete("hashtagsInput", autoCompleteHashtagsConfig);
                    $scope.hashtagsAutoComplete.onItemAdded = (e) =>{
                        $scope.selectedHashtags.push(e.detail.data.value);
                    }
                    $scope.hashtagsAutoComplete.onItemRemoved = (e) =>{
                        $scope.selectedHashtags.splice($scope.selectedHashtags.findIndex(x => x === e.detail.data.value), 1);
                    }
                    $scope.peopleAutoComplete = new buildfire.components.autoComplete("peopleInput", autoCompletePeopleConfig);
                    $scope.configurePeopleAutoComplete($scope.peopleAutoComplete)
    
                    $rootScope.showThread = false;
                }
            }



            $scope.configurePeopleAutoComplete = function(p){
                p.onInput = (e) =>{
                    p.tagify.loading(true);
                    if(e.detail.value.length >= 2){
                        let regexToSearch = e.detail.value;
                        Buildfire.appData.search({filter:{
                            $and:[
                                {
                                    "$json.userDetails.displayName":{"$regex":regexToSearch,"$options":"i"}
                                },
                                {
                                    "$json.userDetails.email":{$ne:NewPost.SocialItems.userDetails.email}
                                },
                                {
                                    "$json.wallId":""
                                }
                            ]
                            
                        }},"subscribedUsersData", (err, users) =>{
                            if(users){
                                p.updateWhitelist(users)
                                p.tagify.loading(false).dropdown.show(e.detail.value)
                            }
                        })
                    }
                    else{
                        console.log(e.detail.value);
                    }
                }
                p.onItemAdded = (e) =>{
                    console.log(e);
                    $scope.selectedUsers.push(e.detail.data.data.userId);
                }
                p.onItemRemoved = (e) =>{
                    console.log(e);
                    $scope.selectedUsers.splice($scope.selectedUsers.findIndex(x => x === e.detail.data.data.userId), 1);
                }
            }

            NewPost.handleLoadedHashtagsUpdate = function(arr){
                $scope.NewPost.loadedHashtags = [...$scope.NewPost.loadedHashtags, ...arr];
                if(!$scope.hashtagsAutoComplete) return;
                else {
                    $scope.hashtagsAutoComplete.updateWhitelist(arr);
                }
            }

            $scope.trustSrc = function(src) {
                return $sce.trustAsResourceUrl(src);
            };

            $scope.checkIfCanSubmit = function(){
                if($routeParams.postId == 0){
                    if($scope.selectedMedia.shown === "https://pluginserver.buildfire.com/styles/media/holder-16x9.png"){
                        Buildfire.dialog.alert({
                            message: "Post must have an image or a video.",
                        });
                    }
                    else{
                        let {type, src} = $scope.selectedMedia;
                        var postData = {
                            text: $scope.text ? $scope.text.replace(/[#&%+!@^*()-]/g, function (match) {
                                return encodeURIComponent(match)
                            }) : '',
                            images : type === 'image' && src != "https://pluginserver.buildfire.com/styles/media/holder-16x9.png" ? [src] : [],
                            videos : type === 'video'  ? [src] : [],
                            location: $scope.googlePlaceDetails,
                            taggedPeople: $scope.selectedUsers,
                            hashtags: $scope.selectedHashtags,
                            userDetails: NewPost.SocialItems.userDetails,
                            wid: NewPost.SocialItems.wid,
                            originalPost: {},
                        };
                        $scope.createPost(postData);
                    }
                }
                else{
                    if($scope.selectedMedia.shown === "https://pluginserver.buildfire.com/styles/media/holder-16x9.png"){
                        Buildfire.dialog.alert({
                            message: "Post must have an image or a video.",
                        });
                    }
                    else{
                        let {type, src} = $scope.selectedMedia;
                        var postData = $scope.post;
                        postData.text = $scope.text ? $scope.text.replace(/[#&%+!@^*()-]/g, function (match) {
                                return encodeURIComponent(match)
                            }) : '',
                        postData.images = type === 'image' && src != "https://pluginserver.buildfire.com/styles/media/holder-16x9.png" ? [src] : [],
                        postData.videos = type === 'video'  ? [src] : [],
                        postData.location =  $scope.googlePlaceDetails,
                        postData.taggedPeople =  $scope.selectedUsers,
                        postData.hashtags =  $scope.selectedHashtags,
                        $scope.updatePost(postData);
                    }
                }
            }
            $scope.updatePost = function(postData){
                console.log(postData);
                SocialDataStore.updatePost(postData).then(response => {
                    setTimeout(() => {                        
                        if(!$rootScope.wonBadge){
                            Location.go("#/singlePostView/"+response.data.id);
                        }else{
                            $rootScope.wonBadge.goToPath = "#/singlePostView/"+response.data.id;
                        }
                    }, 200);
                    NewPost.SocialItems.items.unshift(postData);
                        Buildfire.messaging.sendMessageToControl({
                            name: EVENTS.POST_CREATED,
                            status: 'Success',
                            post: response.data
                        });
                        postData.id = response.data.id;
                        postData.uniqueLink = response.data.uniqueLink;
                        

                    }, (err) => {
                        console.error("Something went wrong.", err);
                        $scope.text = '';
                    })
            }

            $scope.clear = function(){
                $scope.text = "";
                $scope.selectedMedia.src = "https://pluginserver.buildfire.com/styles/media/holder-16x9.png";
                $scope.selectedMedia.shown = "https://pluginserver.buildfire.com/styles/media/holder-16x9.png";

                $scope.selectedMedia.type = "image";
                $scope.images = [];
                $scope.videos = [];
                $scope.taggedPeople = [];
                $scope.hashtags = [];
                $scope.location = {};
                document.getElementById("text").innerHTML = $scope.text;
                NewPost.choosenLocationName = "";
                $scope.googlePlaceDetails = "";
            }

            $scope.openPostTextSection = function(){
                Buildfire.input.showTextDialog({
                    "placeholder": "Enter post text here",
                    "defaultValue": $scope.text || "",
                    "attachments": {
                        "images": { enable: false, multiple: true },
                        "gifs": { enable: false }
                    }
                }, (err, data) => {
                    if(err || !data || !data.results || !data.results.length > 0) return;
                    $scope.text = data.results[0].textValue;
                    document.getElementById("text").innerHTML = $scope.text.length > 150 ? $scope.text.substring(0,150) + "..." : $scope.text;
                    $scope.$digest();
                });
            }

            $scope.selectImage = function(){


                if(!Buildfire.isWeb()){
                    let listItems = [
                        {text: "Take a picture"},
                        {text:"Record a video"},
                    ];
                    Buildfire.components.drawer.open({ enableFilters: false, listItems:listItems}, (err, result) =>{
                        if(err) console.error(error);
                        else {
                            buildfire.components.drawer.closeDrawer();
                            if(result.text === 'Take a picture'){
                                Buildfire.spinner.show();
                                Buildfire.services.camera.getPicture({upload: true}, (err, imageData) => {
                                    Buildfire.spinner.hide();
                                    if (err || !imageData) return Buildfire.spinner.hide();
                                    else{
                                        $scope.selectedMedia.src = imageData;
                                        $scope.selectedMedia.type = "image";
                                        $scope.selectedMedia.shown  = Buildfire.imageLib.cropImage($scope.selectedMedia.src, { size: "half_width", aspect: "16:9" });
                                        Buildfire.spinner.hide();
                                        $scope.$digest();
                                    }
                                    
                                });
                            }
                            else{
                                Buildfire.spinner.show();
                                Buildfire.services.camera.getVideo({upload: true, quality: 0,duration: 30}, (err, videoData) => {
                                    Buildfire.spinner.hide();
                                    if (err || !videoData) return Buildfire.spinner.hide();
                                    else{
                                        $scope.selectedMedia.src = videoData.url;
                                        $scope.selectedMedia.type = "video";
                                        $scope.selectedMedia.shown  = videoData.localURI

                                        Buildfire.spinner.hide();
                                        $scope.$digest();
                                    }

                                })
                            }
                        }
                    });

                }
                else{
                    Buildfire.spinner.show();
                    Buildfire.services.publicFiles.showDialog(
                        { filter: ["image/jpeg", "image/png", "video/mp4"], allowMultipleFilesUpload: false },
                        (onProgress) => {
                            console.log(onProgress);
                        },
                        (onComplete) => {
                        },
                        (err, file) => {
                            Buildfire.spinner.hide();
                            if (err){ 
                                console.log(err);
                                return Buildfire.spinner.hide();
                            }
                            file = file[0];
                            let isImage = file.type.split('/')[0] === 'image'; 
                            $scope.selectedMedia.src = file.url;
                            $scope.selectedMedia.type = isImage ? "image" : "video";
                            $scope.selectedMedia.shown  = isImage ? Buildfire.imageLib.cropImage(file.url, { size: "full_width", aspect: "1:1" }) : file.url;
                            console.log($scope.selectedMedia);
                            $scope.$digest();
                        }
                      );
                }

            }

            $scope.sendToCp = function(items){
                let posts = [];
                if(items && items.length > 0) items.map(item => posts.push(item.data))
                window.buildfire.messaging.sendMessageToControl({
                    name: 'SEND_POSTS_TO_CP',
                    posts: posts,
                });
            }


            NewPost.createReactionActivity = (user, post) =>{
                let type = "taggedYouInAPost";
                let fromUser = {
                    displayName: NewPost.SocialItems.userDetails.displayName,
                    imageUrl: NewPost.SocialItems.userDetails.imageUrl,
                    userId: NewPost.SocialItems.userDetails.userId
                }
                let toUser = {
                    userId: user
                }

                NewPost.saveActivity(type, {fromUser, toUser, post: {image: post.images.length > 0 ?  post.images[0] : null, id: post.id}})
            }

            NewPost.saveActivity = function(type, data){
                let activity = {
                    type: type,
                    fromUser: data.fromUser,
                    toUser: data.toUser,
                    post: data.post,
                    createdOn: new Date(),
                    createdBy: data.fromUser.userId,
                }
                ProfileActivity.add(activity, (err, res) =>{
                    if(err) console.error(err);
                    else console.log(res);
                })
            }


            $scope.createPost = function(postData){      

                SocialDataStore.createPost(postData).then((response) => {
                    if(response.data.taggedPeople.length > 0){
                        response.data.taggedPeople.forEach(user =>{
                            NewPost.createReactionActivity(user, response.data);
                        })
                    }
                    setTimeout(() => {                        
                        if(!$rootScope.wonBadge){
                            Location.go("#/singlePostView/"+response.data.id);
                        }else{
                            $rootScope.wonBadge.goToPath = "#/singlePostView/"+response.data.id;
                        }
                    }, 200);
                    NewPost.SocialItems.items.unshift(postData);
                        Buildfire.messaging.sendMessageToControl({
                            name: EVENTS.POST_CREATED,
                            status: 'Success',
                            post: response.data
                        });
                        postData.id = response.data.id;
                        postData.uniqueLink = response.data.uniqueLink;
                        

                    }, (err) => {
                        console.error("Something went wrong.", err);
                        $scope.text = '';
                    })
            }













            NewPost.init();
        }]);
})(window.angular);

