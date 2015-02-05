module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  //grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-less');

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
              transform: ['reactify', 'es6ify']
            },
            files: [{
              'build/js/utme.js': ['src/**/*.js']
            }, {
              'build/js/utme-ci.js': ['src/js/**/*.js']
            }]
          }
      },
      watch: {
        options: {
            atBegin: true
        },
        scripts: {
          files: ['src/**/*.js'],
          tasks: ['uglify:debug']
        },
        styles: {
          files: ['src/**/*.css'],
          tasks: ['copy']
        },
      },
      less: {
        buildBootstrap: {
          options: {
            compress: false,
            yuicompress: false,
            paths: ['bower_components/bootstrap/less']
          },
          files: {
            'tmp/css/bootstrap.css': ['src/ui/less/bootstrap.less']
          }
        },
        build: {
          options: {
            compress: true,
            yuicompress: true,
            paths: ['tmp/css']
          },
          files: {
            'build/css/utme.css': ['src/ui/less/utme.less']
          }
        }
      }
  });

  grunt.registerTask('default', ['watch']);
  grunt.registerTask('build', ['browserify:build', 'uglify:build', 'less:buildBootstrap', 'less:build', 'copy']);
  grunt.registerTask('debugBuild', ['browserify:build', 'copy']);

};
