/*
    sassdown
    github.com/nopr/sassdown
    ------------------------
    Copyright (c) 2013 Jesper Hills, contributors
    Some rights reserved
*/
'use strict';

module.exports = function (grunt) {

    // Handlebars helpers
    require('./libs/helpers').init();

    // Required libs
    var Sassdown = require('./libs/sassdown').init(grunt);
    
    // Grunt-registered Task
    // =====================
    grunt.registerMultiTask('sassdown', function() {

        // Subtask: Store configuration options
        var config = Sassdown.config(this, module);

        // Subtask: Template, Includes
        grunt.verbose.subhead('Compile the Handlebars template:');
        Sassdown.template(config);
        Sassdown.includes(config);

        // Subtask: Files
        grunt.verbose.subhead('Read and parse contents of source files:');
        Sassdown.files(config);

        // Subtask: Scaffold, Groups
        grunt.verbose.subhead('Build styleguide structure:');
        Sassdown.scaffold(config);
        Sassdown.groups(config);

        // Subtask: Assets
        grunt.verbose.subhead('Copy over styleguide assets:');
        Sassdown.assets(config);

        // Subtask: Indexing
        grunt.verbose.subhead('Generate index from Readme.md:');
        Sassdown.readme(config);

        // Subtask: Files, Output
        grunt.verbose.subhead('Write styleguide copies of source files:');
        config.files.forEach(function(file){
            Sassdown.output(config, file);
        });

    });

};
