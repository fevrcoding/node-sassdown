/*
    sassdown
    github.com/nopr/sassdown
    ------------------------
    Copyright (c) 2013 Jesper Hills, contributors
    Some rights reserved
*/
'use strict';

// Require the Sassdown module
var Sassdown = require('../lib/sassdown');

module.exports = function (grunt) {

    // Grunt-registered Task
    // =====================
    grunt.registerMultiTask('sassdown', function() {

        // Store configuration options
        var options = this.options({
            theme: null,
            assets: null,
            readme: null,
            template: null,
            handlebarsHelpers: null,
            highlight: null,
            scripts: null,
            excludeMissing: false,
            dryRun: false,
            commentStart: /\/\*/,
            commentEnd: /\*\//
        });

        if (options.dryRun) {
            options.excludeMissing = true;
        }

        this.files.forEach(function (file) {

            var srcFiles = file.src.filter(function (f) {
                return grunt.file.isFile(f);
            });

            // Subtask: Init (expose module and grunt)
            var sassdown = new Sassdown(srcFiles, file.dest, options);

            // Subtask: Scaffold, Template, Theme, Scripts
            grunt.verbose.subhead('Compile the Handlebars template, theme, syntax highlighter, and scripts:');

            sassdown.registerHandlebarsHelpers();
            sassdown.scaffold();
            sassdown.template();
            sassdown.theme();
            sassdown.highlight();
            sassdown.scripts();

            // Subtask: Assets
            grunt.verbose.subhead('Read and create paths for included assets:');

            sassdown.assets();

            // Subtask: Files
            grunt.verbose.subhead('Read and parse contents of source files:');
            sassdown.pages();

            // Subtask: Trees
            sassdown.tree();

            if (options.dryRun) {
                if (sassdown.excluded.length) {
                    grunt.verbose.or.warn('Source files invalid');
                    return false;
                }

                grunt.verbose.or.ok('Source files validated');
                return true;
            }

            // Subtask: Indexing
            grunt.verbose.subhead('Write styleguide index file:');
            sassdown.readme();

            // Subtask: Output
            grunt.verbose.subhead('Write styleguide copies of source files:');
            sassdown.output();

            // Finish: Notify user of completion
            grunt.verbose.or.ok('Styleguide created: ' + file.orig.dest);

        });

    });

};
