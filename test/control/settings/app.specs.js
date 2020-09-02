describe('socialPluginSettings: App', function () {
    beforeEach(module('socialPluginSettings'));
    var location, route, rootScope;

    beforeEach(inject(
        function (_$location_, _$route_, _$rootScope_) {
            location = _$location_;
            route = _$route_;
            rootScope = _$rootScope_;
        }));
    describe('main settings route', function () {
        beforeEach(inject(
            function ($httpBackend) {
                $httpBackend.expectGET('views/mainSettings.html')
                    .respond(200);
                $httpBackend.expectGET('/')
                    .respond(200);
            }));

        it('should load the main settings page as default page on successful load of /', function () {
            location.path('/');
            rootScope.$digest();
            expect(route.current.controller).toBe('MainSettingsCtrl');
        });

    });
});
