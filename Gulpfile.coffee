gulp = require('gulp')
coffee = require('gulp-coffee')
coffeelint = require('gulp-coffeelint')
concat = require('gulp-concat')
uglify = require('gulp-uglify')
del = require('del')

gulp.task 'lint', ->
  gulp.src 'src/**/*.coffee'
  .pipe coffeelint('coffeelint.json')
  .pipe coffeelint.reporter()
  .pipe coffeelint.reporter('fail')

gulp.task 'coffee', ['lint'], ->
  gulp.src 'src/**/*.coffee'
  .pipe coffee({bare: true})
  .pipe gulp.dest('.tmp/compiled')

gulp.task 'scripts.normal', ['coffee'], ->
  gulp.src '.tmp/compiled/**/*.js'
    .pipe concat('module.js')
    .pipe gulp.dest('dist')

gulp.task 'scripts.min', ['coffee'], ->
  gulp.src '.tmp/compiled/**/*.js'
    .pipe concat('module.min.js')
    .pipe uglify()
    .pipe gulp.dest('dist')

gulp.task 'scripts', ['scripts.normal', 'scripts.min']

gulp.task 'clean', ->
  del ['.tmp', 'dist/*', '!dist/bower_components']

gulp.task 'watch', ['scripts.normal'], ->
  gulp.watch 'src/**/*.coffee', ['scripts.normal']

gulp.task 'default', ['clean', 'scripts']
