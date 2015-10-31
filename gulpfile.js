var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var sass = require('gulp-ruby-sass');
var del = require('del');

var src = 'src';
var build = 'build';

var js_src = src + '/*.js';
var sass_src = src + '/*.scss';

gulp.task('default', ['clean', 'js', 'sass']);

gulp.task('js', function() {
  return gulp.src([
      src + '/DtdDiagram.js',
      src + "/Box.js",
      src + "/Node.js",
      src + "/HasLabelNode.js",
      src + "/HasQNode.js",
      src + "/ElementNode.js",
      src + "/AttributeNode.js",
      src + "/ChoiceNode.js",
      src + "/SeqNode.js",
      src + "/OtherNode.js",
      src + "/Canvas.js",
    ])
    .pipe(concat('dtd-diagram.js'))
    .pipe(gulp.dest(build))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest(build));
});

gulp.task('sass', function() {
  return sass(sass_src, {style: 'compressed'})
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(build));
});

gulp.task('watch', function() {
  gulp.watch(js_src, ['concat']);
  gulp.watch(sass_src, ['sass']);
});

gulp.task('clean', function () {
  return del([
    'build'
  ]);
});



