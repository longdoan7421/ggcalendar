'use strict';

var gulp = require('gulp');

gulp.task('serve', ['build'], function(done) {
  var browserSync = require('browser-sync');
  var bs = browserSync.create('GGCalendar');
  var options = {
    server: {
      baseDir: ['./dist/']
    },
    ui: false
  };
  bs.init(options, done);
  gulp.watch('src/**/*.ts', ['compile', bs.reload]);
});

gulp.task('watch', function() {
  gulp.watch('src/**/*.ts', ['compile']);
});

gulp.task('compile', function(done) {
  var webpack = require('webpack');
  var webpackStream = require('webpack-stream');
  gulp.src(['./src/index.ts'])
    .pipe(
      webpackStream(
        {
          config: require('./webpack.config.js')
        },
        webpack
      )
    )
    .pipe(gulp.dest('./dist/js'))
    .on('end', function() {
      done();
    });
});

gulp.task('css', function() {
  gulp.src('./node_modules/@syncfusion/ej2/material.css').pipe(gulp.dest('./dist/css'));
});

gulp.task('resources', function() {
  gulp.src('./resources/**/*').pipe(gulp.dest('./dist'));
});

gulp.task('build', ['compile', 'css', 'resources']);
