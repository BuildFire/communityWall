'use strict';

(function (angular, buildfire) {
    angular.module('socialPluginContent')
        .provider('Buildfire', [function () {
            var Buildfire = this;
            Buildfire.$get = function () {
                return buildfire
            };
            return Buildfire;
        }])
        .factory('Util', ['SERVER_URL', function (SERVER_URL) {
            return {
                requiresHttps: function () {
                    var useHttps = false;
                    var userAgent = navigator.userAgent || navigator.vendor;
                    var isiPhone = (/(iPhone|iPod|iPad)/i.test(userAgent));
                    var isAndroid = (/android/i.test(userAgent));

                    //iOS 10 and higher should use HTTPS
                    if (isiPhone) {
                        //This checks the first digit of the OS version. (Doesn't distinguish between 1 and 10)
                        if (!(/OS [4-9](.*) like Mac OS X/i.test(userAgent))) {
                            useHttps = true;
                        }
                    }

                    //For web based access, use HTTPS
                    if (!isiPhone && !isAndroid) {
                        useHttps = true;
                    }
                    if (window && window.location && window.location.protocol && window.location.protocol.startsWith("https"))
                        useHttps = true;
                    console.warn('userAgent: ' + userAgent);
                    console.warn('useHttps: ' + useHttps);

                    return useHttps;
                },
                getProxyServerUrl: function () {
                    return this.requiresHttps() ? SERVER_URL.secureLink : SERVER_URL.link;
                },
                injectAnchors: function (text, options) {
                    text = decodeURIComponent(text);
                    var URL_CLASS = "reffix-url";
                    var URLREGEX = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/;
                    var EMAILREGEX = /([\w\.]+)@([\w\.]+)\.(\w+)/g;

                    if (!options) options = { injectURLAnchors: true, injectEmailAnchors: true };
                    var lookup = [];
                    if (!options.urlAnchorGen)
                        options.urlAnchorGen = function (url) {
                            return { url: url, target: '_system' }
                        };
                    if (options.injectURLAnchors)
                        text = text.replace(URLREGEX, function (url) {
                            var obj = options.urlAnchorGen(url);
                            if (obj.url && obj.url.indexOf('http') !== 0 && obj.url.indexOf('https') !== 0) {
                                obj.url = 'http://' + obj.url;
                            }
                            lookup.push("<a href='" + obj.url + "' target='" + obj.target + "' >" + url + "</a>");
                            return "_RF" + (lookup.length - 1) + "_";
                        });
                    if (!options.emailAnchorGen)
                        options.emailAnchorGen = function (email) {
                            return { url: "mailto:" + email, target: '_system' }
                        };
                    if (options.injectEmailAnchors)
                        text = text.replace(EMAILREGEX, function (url) {
                            var obj = options.emailAnchorGen(url);
                            lookup.push("<a href='" + obj.url + "' target='" + obj.target + "'>" + url + "</a>");
                            return "_RF" + (lookup.length - 1) + "_";
                        });
                    /// this is done so you dont swap what was injected
                    lookup.forEach(function (e, i) {
                        text = text.replace("_RF" + i + "_", e);
                    });
                    return text;
                },
                getParameterByName: function (name, url) {
                    if (!url) {
                        url = window.location.href;
                    }
                    name = name.replace(/[\[\]]/g, "\\$&");
                    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                        results = regex.exec(url);
                    if (!results) return null;
                    if (!results[2]) return '';
                    return decodeURIComponent(results[2].replace(/\+/g, " "));
                }
            }
        }])
        
})(window.angular, window.buildfire);
