module.exports = function(grunt) {
  var es6ify = require('es6ify');

  es6ify.traceurOverrides = { sourceMaps: 'inline' };

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  //grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-utme');

    grunt.initConfig({
      copy: {
        files: {
          expand: true,
          flatten: true,
          filter: 'isFile',
          dest: 'build/fonts/',
          src: 'bower_components/bootstrap/fonts/**'
        }
      },
      uglify: {
        debug: {
            options: {
                mangle: false,
                beautify: true
            },
            files: [{
              src: ['build/js/utme.js'],
              dest: 'build/js/utme.js'
            }, {
              src: ['build/js/utme-ci.js'],
              dest: 'build/js/utme-ci.js'
            }]
        },
        build: {
          files: [{
            src: ['build/js/utme.js'],
            dest: 'build/js/utme.min.js'
          }, {
            src: ['build/js/utme-ci.js'],
            dest: 'build/js/utme-ci.min.js'
          }]
        }
      },
      browserify: {
          watch: {
              files: {
                  'build/js/utme.js': ['src/js/**/*.js'],
              },
              options: {
                  watch: true,
                  keepAlive: true,
                  browserifyOptions: {
                      debug:true
                  }
              }
          },
          build: {
            options: {
              transform: ['reactify', es6ify.configure(/(src)+.+\.(js|jsx)$/)],
              browserifyOptions: {
                  debug:true
              },
              // Convert absolute sourcemap filepaths to relative ones using mold-source-map.
              // postBundleCB: function(err, src, cb) {
              //     var through = require('through');
              //     var stream = through().pause().queue(src).end();
              //     var buffer = '';
              //     stream.pipe(require('mold-source-map').transformSourcesRelativeTo('./')).pipe(through(function(chunk) {
              //         buffer += chunk.toString();
              //     }, function() {
              //         cb(err, buffer);
              //     }));
              //     stream.resume();
              // }
            },
            files: [{
              'build/js/utme.js': ['src/**/*.js']
            }, {
              'build/js/utme-ci.js': ['src/js/**/*.js']
            }]
          },
          browserTest: {
              options: {
                  transform: ['reactify', es6ify.configure(/(src)+.+\.(js|jsx)$/)],
                  browserifyOptions: {
                      debug:true
                  },
                  external:['mocha-jsdom', 'jquery', 'jsdom', 'better-require']
              },
              files: [{
                  'test/build/utme.js': ['test/utme.js']
              }]
          }
      },

      utmeServer: {
          app: {
              options: {
                  directory: './test/scenarios/' // The directory to use to persist/load scenarios from.
              }
          }
      },

      mochaTest: {
        test: {
          src: ['test/**/*.js']
        }
      }
  });

  grunt.registerTask('default', ['utmeServer']);
  grunt.registerTask('browserTest', ['browserify:browserTest']);
  grunt.registerTask('build', ['mochaTest', 'browserify:build', 'uglify:build', 'less:buildBootstrap', 'less:build', 'copy']);
  grunt.registerTask('debugBuild', ['browserify:build', 'copy']);

};
