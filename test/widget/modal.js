describe('socialPluginWidget: Services', function () {

    var Buildfire,$modal,Modals, $q, scope, MoreOptionsModalPopupCtrl,$modalInstance,Info,$rootScope,SocialDataStore,Buildfire;
    beforeEach(module('socialModals'));

    beforeEach(inject(function ($rootScope,$controller,_Modals_ ,_$modal_,_$q_,$injector) {
        console.log('@@@@@@@@@@@@@@@',_Modals_);
        scope=$rootScope.$new();
        Modals=$injector.get('Modals');
        console.log('@@@@@@@@@@@@@@@',Modals);
       $modal = _$modal_;
        $q = _$q_;
     /*   MoreOptionsModalPopupCtrl = $controller('MoreOptionsModalPopupCtrl', {
            scope : scope
        });*/

        $modalInstance = { // Create a mock object using spies
            close: jasmine.createSpy('modalInstance.close'),
            dismiss: jasmine.createSpy('modalInstance.dismiss'),
            result: {
                then: jasmine.createSpy('modalInstance.result.then')
            }
        };

        SocialDataStore = jasmine.createSpyObj('SocialDataStore',['getPosts','getUsers','deletePost','deleteComment','banUser','getCommentsOfAPost']);

        Buildfire = {

        }

        Buildfire.messaging = jasmine.createSpyObj('messaging', ['onReceivedMessage', '.sendMessageToWidget', '']);


        MoreOptionsModalPopupCtrl = $controller('MoreOptionsModalPopupCtrl', {
            $scope: scope,
            $modalInstance:$modalInstance,
            Info:{postId:123123},
            $rootScope:$rootScope,
            SocialDataStore:SocialDataStore,
            Buildfire:Buildfire
        });

        console.log('@@@@@@@@@@@@@@@MoreOptionsModalPopupCtrl',MoreOptionsModalPopupCtrl);

    }));


    describe('Modals service', function () {

        it('Modals should exists', function () {
            expect(Modals).toBeDefined();
        });
       it('Modals.showMoreOptionsModal should exists', function () {
            expect(Modals.showMoreOptionsModal).toBeDefined();
        });
    });

    describe('Modals: showMoreOptionsModal Controller', function () {


        it('MoreOptionsModalPopupCtrl should be called', function () {
            Modals.showMoreOptionsModal();
        });

        it('MoreOptionsModalPopupCtrl should exists', function () {
            expect(MoreOptionsModalPopupCtrl).toBeDefined();
        });



        it('scope.cancel should exists', function () {
            console.log('$$$$$$$$$$$$',scope.cancel);
            scope.cancel();
            expect(scope.cancel).toBeDefined();
        });
        it('scope.ok should exists', function () {
            scope.ok();
            expect(scope.ok).toBeDefined();
        });


        it('scope.block should exists', function () {
            scope.block();
            expect(scope.block).toBeDefined();
        });



        describe('scope.deletePost should be called with success', function () {

            beforeEach(function(){
                SocialDataStore.deletePost.and.callFake(function () {
                    var deferred = $q.defer();
                    deferred.resolve({data: {result: [{_id: 2, userId: 0}]}});
                    return deferred.promise;
                });
            })

            it('scope.deletePost should be called ',function(){
                var promise= scope.deletePost();
                scope.$digest();
                expect(scope.deletePost).toBeDefined();
            })


        });

        describe('scope.deletePost should be called with failure', function () {

            beforeEach(function(){
                SocialDataStore.deletePost.and.callFake(function () {
                    var deferred = $q.defer();
                    deferred.reject({data: {result: [{_id: 2, userId: 0}]}});
                    return deferred.promise;
                });
            })

            it('scope.deletePost should be called ',function(){
                var promise= scope.deletePost();
                scope.$digest();
                expect(scope.deletePost).toBeDefined();
            })


        });

    });
});