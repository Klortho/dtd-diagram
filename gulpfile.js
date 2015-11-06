var gulp = require('gulp');

var bower = require('gulp-bower');
var concat = require('gulp-concat');
var del = require('del');
var gh_pages = require('gulp-gh-pages');
var inject = require('gulp-inject');
var mocha = require('gulp-mocha');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var sass = require('gulp-ruby-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var src = 'src';
var dist = 'dist';

var js_src = src + '/*.js';
var js_sources = [
  "/DtdDiagram.js",
  "/Box.js",
  "/Node.js",
  "/HasLabelNode.js",
  "/HasQNode.js",
  "/ElementNode.js",
  "/AttributeNode.js",
  "/ChoiceSeqNode.js",
  "/ChoiceNode.js",
  "/SeqNode.js",
  "/OtherNode.js",
  "/Canvas.js",
  "/Compressor.js",
  "/StateManager.js",
].map(function(s) { return src + "/" + s; });


var sass_src = src + '/*.scss';


gulp.task('default', 
  ['bower', 'test', 'concat', 'uglify', 'sass', 'inject']);

gulp.task('bower', function() {
  return bower();
});

gulp.task('test', function() {
  return gulp.src('test/test_*.js', {read: false})
    .pipe(mocha({reporter: 'nyan'}));
});

gulp.task('concat', function() {
  return gulp.src(js_sources)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(concat('dtd-diagram.js'))
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(dist))
});

// I'm writing this as a separate task from concat, because writing the
// sourcemap comment at the end of the non-minified dtd-diagram.js seems
// to break uglify. This way, we can have the sourcemap in both the
// concatenated, non-minified product, and the minified product.
gulp.task('uglify', function() {
  return gulp.src(js_sources)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(concat('dtd-diagram.js'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(dist));
});

gulp.task('sass', function() {
  return sass(sass_src, {style: 'compressed'})
    .pipe(plumber())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(dist));
});

// This injects script tags into index.html (for now, my .scss is pure CSS)
gulp.task('inject', function () {
  return  gulp.src('./index.html')
    .pipe(inject(
      gulp.src(
        js_sources, 
        { read: false }
      ),
      { relative: true }
    ))
    .pipe(gulp.dest('.'));
});


// The following are not run by default

// Run `gulp watch` to set up a service that watches for changes, and 
// automagically regenerates the product files
gulp.task('watch', function() {
  gulp.watch(js_src, ['concat', 'uglify']);
  gulp.watch(sass_src, ['sass']);
});

// Deploy to gh-pages.
gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(gh_pages());
});

gulp.task('clean', function () {
  return del([
    'dist', 
    '.publish',
    '.sass-cache',
  ]);
});

// This should set you back to a state right after `clone`:
gulp.task('clean-all', ['clean'], function() {
  return del([
    'node_modules',
    'vendor',
  ]);
});

