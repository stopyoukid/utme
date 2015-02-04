module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  //grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({
      copy: {
          all: {
            files: {
              'build/styles/utme.css': ['src/styles/**/*.css']
            }
          }
      },
      uglify: {
        debug: {
            options: {
                mangle: false,
                beautify: true
            },
            files: [
              { src: [
                  'src/js/simulate.js',
		  'src/js/selectorFinder.js',
                  'src/js/utme.js',
                  'src/js/utme-ui.js',
                  'src/js/persisters/*.js',
                  'src/js/reporters/*.js'
                ],
                dest: 'build/js/utme.js'
              }
            ]
        },
        build: {
          files: [
            { src: [ 'build/js/utme.js'],
              dest: 'build/js/utme.js'
            }
          ]
        }
      },
      concat: {
        build: {
          files: [
            {
              src: [
                'src/js/simulate.js',
		            'src/js/selectorFinder.js',
                'src/js/utme.js',
                'src/js/utme-ui.js',
                'src/js/persisters/*.js',
                'src/js/reporters/*.js'
              ],
              dest: 'build/js/utme.js'
            }
          ]
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
                  //transform: ['es6ify'],
                  browserifyOptions: {
                      debug:true
                  }
              }
          },
          build: {
            options: {
              //plugin:  ['tsify']
            },
            files: {
              'build/js/utme.js': [
                'src/js/simulate.js',
                'src/js/selectorFinder.js',
                'src/js/utme.js',
                'src/js/utme-ui.js',
                'src/js/persisters/*.js',
                'src/js/reporters/*.js'
              ]
            }
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
      }
  });

  grunt.registerTask('default', ['watch']);
  grunt.registerTask('build', ['browserify:build', 'uglify:build', 'copy']);
  grunt.registerTask('debugBuild', ['browserify:build', 'copy']);

};
