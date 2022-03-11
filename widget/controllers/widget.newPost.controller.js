'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('NewPostCtrl', ['$scope', '$rootScope', '$sce', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location', function ($scope, $rootScope, $sce, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems, Location) {

            var NewPost = this;
            NewPost.SocialItems = SocialItems.getInstance();
            NewPost.text = "";
            NewPost.loadedHashtags = [];
            $scope.selectedMedia = {
                type: "image",
                src: "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                shown: "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
            }
            NewPost.people = ["user1", "user2", "user3", "user4"];
            $scope.errorMessage = "Test";
            NewPost.init = function () {
                $scope.sendToCp([]);
                $rootScope.showThread = false;
                let autoCompleteHashtagsConfig = {
                    dropdown:{
                        enabled: 0,
                        maxItems:3
                    }
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
                let autoCompletePeopleConfig = {
                    enforceWhitelist:true,
                    whitelist:this.people,
                    dropdown:{
                        enabled: 2,
                    },
                    templates:{
                        dropdownItem: $scope.suggestionItemTemplate
                    }
                }
    
                $scope.selectedHashtags = [];
                $scope.selectedUsers = [];
                $scope.googlePlace;
                $scope.googlePlaceDetails;
                $scope.hashtagsAutoComplete = new buildfire.components.autoComplete("hashtagsInput", autoCompleteHashtagsConfig);
                $scope.hashtagsAutoComplete.onItemAdded = (e) =>{
                    $scope.selectedHashtags.push(e.detail.data.value);
                }
                $scope.hashtagsAutoComplete.onItemRemoved = (e) =>{
                    $scope.selectedHashtags.splice($scope.selectedHashtags.findIndex(x => x === e.detail.data.value), 1);
                }
                $scope.peopleAutoComplete = new buildfire.components.autoComplete("peopleInput", autoCompletePeopleConfig);
                $scope.configurePeopleAutoComplete($scope.peopleAutoComplete)
                Buildfire.social.Hashtags.search({},(err, r) =>{
                    if(err) return;
                    else {
                        NewPost.handleLoadedHashtagsUpdate(r);
                    }
                });
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
                    $scope.selectedUsers.push(e.detail.data.data.userId);
                }
                p.onItemRemoved = (e) =>{
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
                $scope.hashtagsAutoComplete.tagify.removeAllTags();
                $scope.peopleAutoComplete.tagify.removeAllTags();

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




            $scope.createPost = function(postData){      

                SocialDataStore.createPost(postData).then((response) => {
                    Location.goToHome();
                    // buildfire.histo
                    console.log("POST ###");
                    console.log(response);
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

