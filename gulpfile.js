const gulp = require("gulp");
const del = require("del");
const minHTML = require("gulp-htmlmin");
const minifyCSS = require("gulp-csso");
const concat = require("gulp-concat");
const htmlReplace = require("gulp-html-replace");
const uglifyes = require("uglify-es");
const composer = require("gulp-uglify/composer");
const uglify = composer(uglifyes, console);
const imagemin = require("gulp-imagemin");
const babel = require('gulp-babel');

const destinationFolder = releaseFolder();

function releaseFolder() {
  var arr = __dirname.split("/");
  var fldr = arr.pop();
  arr.push(fldr + "_release");
  return arr.join("/");
}

console.log(">> Building to ", destinationFolder);

const cssTasks = [
    { name: "widgetCSS", src: "widget/**/*.css", dest: "/widget" },
    { name: "controlContentCSS", src: "control/content/**/**/*.css", dest: "/control/content" },
    { name: "controlDesignCSS", src: "control/design/**/**/*.css", dest: "/control/design" },
    { name: "controlSettingsCSS", src: "control/settings/**/**/*.css", dest: "/control/settings" },
    { name: "controlReportsCSS", src: "control/reports/**/**/*.css", dest: "/control/reports" },
    { name: "controlLanguagesCSS", src: "control/languages/**/**/*.css", dest: "/control/languages" },
];

cssTasks.forEach(function (task) {
  /*
     Define a task called 'css' the recursively loops through
     the widget and control folders, processes each CSS file and puts
     a processes copy in the 'build' folder
     note if the order matters you can import each css separately in the array
  */
  gulp.task(task.name, function () {
    return (
      gulp
        .src(task.src, { base: "." })

        /// minify the CSS contents
        .pipe(minifyCSS())

        ///merge
        .pipe(concat("styles.min.css"))

        /// write result to the 'build' folder
        .pipe(gulp.dest(destinationFolder + task.dest))
    );
  });
});



const cfTasks = [
  {name: "CommunityFeedJS1",src:["widget/CommunityFeedAPI/**/*.js"],dest: "/widget/CommunityFeed"},
]

cfTasks.forEach(function (task){
  gulp.task(task.name, function(){
    return(
      gulp
      .src(task.src, {base: "."})
      .pipe(babel({
        presets: ['@babel/env']
        }))
      .pipe(uglify())
      .pipe(concat("cfScripts.min.js"))
      .pipe(gulp.dest(destinationFolder+task.dest))
    );
  })
})



const jsTasks = [
    { name: "widgetJS", src: ["widget/**/**/**/*.js","!widget/CommunityFeedAPI/data/*.js","!widget/CommunityFeedAPI/dataAccess/*.js"], dest: "/widget" },
    { name: "controlContentJS", src: "control/content/**/**/**/*.js", dest: "/control/content" },
    { name: "controlDesignJS", src: "control/design/**/**/*.js", dest: "/control/design" },
    { name: "controlSettingsJS", src: "control/settings/**/**/*.js", dest: "/control/settings"},
    { name: "controlLanguagesJS", src: "control/languages/**/**/*.js", dest: "/control/languages" },
    { name: "controlReportsJS", src: "control/reports/**/**/*.js", dest: "/control/reports" },

];

jsTasks.forEach(function (task) {
  gulp.task(task.name, function () {
    return (
      gulp
        .src(task.src, { base: "." })

        /// obfuscate and minify the JS files
        .pipe(uglify())

        /// merge all the JS files together. If the
        /// order matters you can pass each file to the function
        /// in an array in the order you like
        .pipe(concat("scripts.min.js"))

        ///output here
        .pipe(gulp.dest(destinationFolder + task.dest))
    );
  });
});



gulp.task("sharedJS", function () {
    return gulp
      .src(["widget/assets/js/shared/**.js"], { base: "." })
      .pipe(uglify())
      .pipe(concat("scripts.shared-min.js"))
      .pipe(gulp.dest(destinationFolder + "/widget"));
});



gulp.task("clean", function () {
    return del([destinationFolder], { force: true });
});

gulp.task("controlHtml", function () {
  return (
    gulp
      .src(["control/**/*.html", "control/**/*.htm"], { base: "." })
      /// replace all the <!-- build:bundleJSFiles  --> comment bodies
      /// with scripts.min.js with cache buster
      .pipe(
        htmlReplace({
          bundleJSFiles: "scripts.min.js?v=" + new Date().getTime(),
          bundleCSSFiles: "styles.min.css?v=" + new Date().getTime(),
          bundleSharedJSFiles: "../../widget/scripts.shared-min.js?v=" + new Date().getTime(),
        })
      )

      /// then strip the html from any comments
      .pipe(minHTML({ removeComments: true, collapseWhitespace: true }))

      /// write results to the 'build' folder
      .pipe(gulp.dest(destinationFolder))
  );
});

gulp.task("widgetHtml", function () {
  return (
    gulp
      .src(["widget/**/*.html", "widget/**/*.htm"], { base: "." })
      /// replace all the <!-- build:bundleJSFiles  --> comment bodies
      /// with scripts.min.js with cache buster
      .pipe(
        htmlReplace({
          bundleCFFiles: "./CommunityFeed/cfScripts.min.js?v=" + new Date().getTime(),
          bundleJSFiles: "scripts.min.js?v=" + new Date().getTime(),
          bundleSharedJSFiles: "scripts.shared-min.js?v=" + new Date().getTime(),
          bundleCSSFiles: "styles.min.css?v=" + new Date().getTime(),
        })
      )

      /// then strip the html from any comments
      .pipe(minHTML({ removeComments: true, collapseWhitespace: true }))

      /// write results to the 'build' folder
      .pipe(gulp.dest(destinationFolder))
  );
});

gulp.task("resources", function () {
  return gulp.src(["resources/*", "plugin.json"], { base: "." }).pipe(gulp.dest(destinationFolder));
});

gulp.task("images", function () {
  console.log(destinationFolder)
  return gulp.src(["widget/images/*"], { base: "." }).pipe(imagemin()).pipe(gulp.dest(destinationFolder));
});
gulp.task('fonts', function () {
	return gulp.src('control/reports/styles/linearicons/fonts/**/*.{eot,svg,ttf,woff,woff2}').pipe(gulp.dest(destinationFolder + '/control/reports/fonts'));
});

var buildTasksToRun = ["widgetHtml", "controlHtml", "resources", "images", "sharedJS", "fonts"];

cssTasks.forEach(function (task) {
  buildTasksToRun.push(task.name);
});
cfTasks.forEach(function (task) {
  buildTasksToRun.push(task.name);
});
jsTasks.forEach(function (task) {
  buildTasksToRun.push(task.name);
});

gulp.task("build", gulp.series("clean", buildTasksToRun));