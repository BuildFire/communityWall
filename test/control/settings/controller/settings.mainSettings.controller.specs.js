"use strict";
describe('Unit : Controller - MainSettingsCtrl', function () {

// load the controller's module
    var $scope, $controller;

    beforeEach(module('socialPluginSettings'));
    beforeEach(inject(function (_$controller_) {
        $controller = _$controller_;
    }));

    beforeEach(inject(function ($rootScope) {
        //new a $scope
        $scope = $rootScope.$new();
        $controller = $controller('MainSettingsCtrl', {$scope: $scope});
    }));

    it('it should pass if MainSettingsCtrl is defined', function () {
        expect($controller).not.toBeNull();
    });

    it('it should pass if $scope.data is defined', function () {
        expect($scope.data).not.toBeUndefined();
    });

    it('it should pass if $scope.data.mainThreadUserTags is defined', function () {
        expect(typeof $scope.data.mainThreadUserTags).toBe('object');
    });

    it('it should pass if $scope.data.sideThreadUserTags is defined', function () {
        expect(typeof $scope.data.sideThreadUserTags).toBe('object');
    });

    it('it should pass if $scope.init is function', function () {
        expect(typeof $scope.init).toBe('function');
    });

    it('it should pass if $scope.save is function', function () {
        expect(typeof $scope.save).toBe('function');
    });
});