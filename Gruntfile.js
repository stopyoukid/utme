module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');

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
              { src: ['src/js/*.js'], dest: 'build/js/utme.js' },
              { src: ['src/js/persisters/*.js'], dest: 'build/js/persisters/utme-file-persister.js' }
            ]
        },
        build: {
          files: [
            { src: ['src/js/*.js'], dest: 'build/js/utme.js' },
            { src: ['src/js/persisters/*.js'], dest: 'build/js/persisters/utme-file-persister.js' }
          ]
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

};
