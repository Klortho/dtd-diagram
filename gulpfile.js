var gulp = require('gulp');

var bower = require('gulp-bower');
var concat = require('gulp-concat');
var del = require('del');
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
].map(function(s) { return src + "/" + s; });


var sass_src = src + '/*.scss';


gulp.task('default', ['bower', 'test', 'concat', 'uglify', 'sass']);

gulp.task('bower', function() {
  return bower();
});

gulp.task('test', function() {
  return gulp.src('test/test_compressor.js', {read: false})
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
// to break uglify
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

gulp.task('watch', function() {
  gulp.watch(js_src, ['concat', 'uglify']);
  gulp.watch(sass_src, ['sass']);
});

gulp.task('clean', function () {
  return del([
    'dist'
  ]);
});



