/*
    node-sassdown
    github.com/fevrcoding/node-sassdown
    ------------------------
    Copyright (c) 2015 Marco Solazzi, contributors
    Copyright (c) 2013 Jesper Hills, contributors
    Some rights reserved
*/
'use strict';

// Required Node modules
// =====================
var fs = require('fs');
var mkdirp = require('mkdirp');
var junk = require('junk');
var path = require('path');
var hljs = require('highlight.js');
var _ = require('lodash');
var glob = require('glob');
var cssmin = require('cssmin');
var markdown = require('marked');
var Handlebars = require('handlebars');
var AllHtmlEntities = require('html-entities').AllHtmlEntities;
var entities = new AllHtmlEntities();

// Quick utility functions
// =======================
function unspace(string) {
    return string.replace(/\r\n|\n| /g, '');
}

function datapath(filename) {
    return path.resolve(__dirname, 'data', filename);
}



// Constants
// =========================

var REGEXP_PATH_HAS_SCHEME = /^((https?|file):)?\/\//;


// Default Options
// =========================
var defaults = {
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
};


// Exposed global objects
// ======================
var Sassdown = function Sassdown(files, srcdir, outdir, options) {

    var f;

    this.options = _.defaults(options || {}, defaults);

    var config = this.config = {
        srcdir: srcdir || path.join(process.cwd(), 'assets'),
        root: outdir || path.join(process.cwd(), 'styleguide')
    };

    if (Array.isArray(files)) {
        f = files;
    } else {
        f = glob.sync(files, {cwd: this.config.srcdir}).map(function (f) {
            return path.join(config.srcdir, f);
        });
    }

    this.files = f.map(function (filename) {
        return {
            src: filename
        };
    });


};


Sassdown.verbose = false;

Sassdown.log = function (msg, type) {
    console[type || 'log'](msg);
};

Sassdown.logv = function (msg, type) {
    if (Sassdown.verbose) {
        console[type || 'log'](msg);
    }
};

Sassdown.getFileList = function (assets) {
    var fileList = [];

    // Expand through matches in options and include both
    // internal and external files into the array
    if (assets && typeof assets.forEach === 'function') {
        assets.forEach(function (asset) {

            glob.sync(asset).forEach(function (file) {
                fileList.push(file);

                Sassdown.logv(file + '...');
            });

            if (asset.match(REGEXP_PATH_HAS_SCHEME)) {
                fileList.push(asset);
                Sassdown.logv(asset + '...');
            }
        });
    }

    return fileList;
};

// Exported Sassdown methods
// =========================


_.extend(Sassdown.prototype, {

    _sourcify: function (section, file) {
        return file.data.split(section)[1].split(this.options.commentStart)[0];
    },

    _checkfor: function (requirement, defaults) {

        // If the requirement isn't met
        if (!this.options[requirement]) {
            Sassdown.log('User ' + requirement + ' not specified. Using default.', 'warn');
            this.options[requirement] = defaults;
        }
    },

    _normalize: function (comment) {
        comment = comment.replace(this.options.commentStart, '');
        comment = comment.replace(this.options.commentEnd, '');
        comment = comment.trim().replace(/^\*/, '').replace(/\n \* |\n \*|\n /g, '\n').replace(/\n   /g, '\n    ');

        if (comment.indexOf('```') === -1 && comment.indexOf('    ') !== -1) {
            comment = comment.replace(/    |```\n    /, '```\n    ');
            comment = comment.replace(/\n    /g, '\n').replace(/\n /g, '\n');
            comment += '\n```';
        }

        return comment;
    },

    registerHandlebarsHelpers: function () {
        var helpers = Sassdown.getFileList(this.options.handlebarsHelpers);
        helpers.forEach(function (helper) {
            helper = path.resolve(__dirname, path.relative(__dirname, process.cwd()), helper);
            if (fs.existsSync(helper)) {
                helper = require(helper);
                if (typeof helper.register === 'function') { helper.register(Handlebars); }
                else if (typeof helper === 'function') { helper(Handlebars); }
            }
        });
    },

    template: function () {
        // Check for existence of user defined template
        this._checkfor('template', datapath('template.hbs'));

        // Return Sassdown.config.template object
        this.config.template = {
            html: Handlebars.compile(fs.readFileSync(this.options.template, {encoding: 'utf8'})),
            assets: null
        };
    },

    theme: function () {
        // Check for existence of user defined theme
        this._checkfor('theme', datapath('theme.css'));

        // Read file using grunt
        var minify = fs.readFileSync(this.options.theme, {encoding: 'utf8'});

        // Assign theme to Handlebars partial; minify this
        Handlebars.registerPartial('theme', '<style>' + cssmin(minify) + '</style>');
    },

    highlight: function () {
        // Check for existence of user defined highlight style
        this._checkfor('highlight', 'github');

        // Read file using grunt
        var minify = fs.readFileSync(datapath('highlight.' + this.options.highlight + '.css'), {encoding: 'utf8'});

        // Assign highlight style to Handlebars partial; minify this
        Handlebars.registerPartial('highlight', '<style>' + cssmin(minify) + '</style>');
    },


    scripts: function () {
        // Check for existence of user defined scripts
        this._checkfor('scripts', [datapath('scripts.js')]);
        var fileList = Sassdown.getFileList(this.options.scripts);

        // Process each script to get the partial to use
        var partial = fileList.map(function (file) {
            var scriptSrc;
            if (file.match(REGEXP_PATH_HAS_SCHEME)) {
                // The file is hosted elsewhere so just link to it
                scriptSrc = file;
            } else {
                // Get the filename and paths
                var fileName = file.split('/').pop();
                var src = path.resolve(process.cwd(), file);
                var dest = path.resolve(this.config.root, fileName);
                if (fs.existsSync(src)) {
                    // Copy the script file to the styleguide root dir
                    mkdirp.sync(path.dirname(dest));
                    fs.writeFileSync(dest, fs.readFileSync(src, {encoding: 'utf8'}));

                    // Link to the copied script relative to the styleguide root
                    scriptSrc = '{{> root}}/' + fileName;
                }
            }

            return scriptSrc ? '<script src="' + scriptSrc + '"></script>\n' : '';
        }.bind(this)).join('');

        // Register the partial
        Handlebars.registerPartial('scripts', partial);
    },

    assets: function () {
        // Check if we added includes option
        if (!this.options.assets) {
            Sassdown.log('User assets not specified. Styleguide will be unstyled!', 'warn');
        } else {
            this.config.assets = Sassdown.getFileList(this.options.assets);
        }
    },

    include: function (file, dest) {
        // Output
        var output;

        // If this file is not external, build a local relative path
        if (!file.match(REGEXP_PATH_HAS_SCHEME)) {
            file = path.relative(dest, file);
        }

        // Preserve correct path escaping for <iframe> embedded url paths
        if (file.match(/\\/)) {
            file = file.replace(/\\/g, '/');
        }

        // Write <link> or <script> tag to include it
        if (file.split('.').pop() === 'css') {
            output = '<link rel="stylesheet" href="' + file + '" />';
        }

        if (file.split('.').pop() === 'js') {
            output = '<script src="' + file + '"><\\/script>';
        }

        // Return
        return output;
    },

    scaffold: function () {

        // Check if files has resolved to anything
        if (!this.files.length) {
            // Fail, because too many things break without a resolved root
            Sassdown.log('No files found to process.', 'warn');
            return false;
        }

        mkdirp.sync(this.config.root);
    },

    matching: function () {
        // Create a regular expression from our
        // comment start and comment end options
        var options = this.options;
        var begin = options.commentStart.source;
        var end = options.commentEnd.source;

        // Return out a new RegExp object
        return new RegExp(begin + '([\\s\\S]*?)' + end, 'g');
    },

    pages: function () {
        // Pages object exposed
        this.pages = [];
        this.excluded = [];

        // Map files matched by Grunt task to Sassdown.pages
        this.files.forEach(function (file) {
            // Store file source within file
            file.data = fs.readFileSync(file.src, {encoding: 'utf8'});
            file.body = file.data.match(this.matching());

            // Store file data within a page
            var page = this.getData(file);

            // No matching data
            if (!file.body) {
                Sassdown.log('Comment missing: ' + file.src, 'warn');
                page.sections = null;

                // Check if we should be exluding this page now
                if (this.options.excludeMissing) {
                    this.excluded.push(page.src);
                    return false;
                }
            } else {
                // Found sections
                Sassdown.logv('Comment found');
                page.sections = this.getSections(file);
            }

            // No matching title
            if (!file.title) {
                Sassdown.logv('Heading missing: ' + file.src[0], 'warn');
                page.title = page.slug;
            } else {
                Sassdown.logv('Heading found');
                page.title = file.title;
            }

            // Add to pages
            this.pages.push(page);
        }.bind(this));
    },

    getData: function (file) {
        var dest = path.normalize(file.src.replace(this.config.srcdir, this.config.root)).replace(path.extname(file.src), '.html');

        return {
            title: null,
            slug: path.basename(file.src, path.extname(file.src)),
            href: path.relative(this.config.root, dest.replace(path.extname(file.src), '.html')),
            dest: dest,
            src: file.src
        };
    },

    getSections: function (file) {
        // Create sections
        return file.body.map(function (section) {
            // Remove comment tags, indentation and group
            // encapsulate blocks of HTML with ``` fences
            var content = this._normalize(section);

            // Match the subsequent data (until a commentStart
            // is found) and split off, this are our styles
            var styles = this._sourcify(section, file);

            // Output object
            var output = this.formatting(content, styles);

            // Apply heading
            if (!file.title && output.comment.match('</h1>')) {
                file.title = output.comment.split('</h1>')[0].split('>')[1];
            }

            // Output
            return output;
        }.bind(this));
    },

    formatting: function (content, styles) {
        // Create output object with unique id
        var output = {};

        //hljs.configure({useBR: true});
        // If we find code blocks
        if (content.match(/```/)) {
            // Show comment
            output.comment = markdown(content.split(/```/)[0]);

            // Show result
            output.result = content.split(/```/)[1];

            // Show markup
            output.markup = '<pre class="hljs"><code>' + hljs.highlight('html', content.split(/```/)[1].split(/```/)[0].trim()).value + '</code></pre>';

            // Does styles consist of more than whitespace?
            if (unspace(styles).length > 0) {
                // Show styles
                output.styles = '<pre class="hljs"><code>' + hljs.highlight('scss', styles.trim()).value + '</code></pre>';
            }
        }

        // If we don't find code blocks
        else {
            output.comment = markdown(content);
        }

        // Return
        return output;
    },

    readme: function () {
        // Create file object
        var file = {};
        var html = '';

        // Fill with data
        file.slug = '_index';
        file.href = 'index.html';

        // Have a custom title?
        file.title = this.options.title || 'Styleguide';
        file.dest = this.config.root + file.href;

        // Has a README file been specified?
        if (this.options.readme) {
            // Use the README file for content
            file.src = this.options.readme;
            html = markdown(fs.readFileSync(file.src, {encoding: 'utf8'}));

            // highlight code in README file
            html = html.replace(/<pre><code>([^]*?)<\/code><\/pre>/mgi, function (a, b) {
                return '<pre class="hljs"><code>' + hljs.highlightAuto(entities.decode(b)).value + '</code></pre>';
            });

            file.sections = [{
                comment: html
            }];

        } else {
            // Don't fill with content
            file.src = file.dest;
            file.sections = null;
        }

        // Write out
        this.writeOut(file);
    },

    writeOut: function (page) {
        // Generate an indivdual path to root for this file
        var localRoot = path.normalize(path.relative(path.dirname(page.dest), this.config.root));

        // Make local to self if null (ie for index page)
        if (!localRoot) {
            localRoot = '.';
        }

        // Generate asset string
        var localAssets = '';

        // Generate path to assets for this file
        if (this.config.assets) {
            this.config.assets.forEach(function (asset) {
                localAssets += this.include(asset, path.dirname(page.dest));
            }.bind(this));
        }

        // Register two unique (local) partials
        Handlebars.registerPartial('root', localRoot);
        Handlebars.registerPartial('assets', localAssets);

        mkdirp.sync(path.dirname(page.dest));
        fs.writeFileSync(page.dest, this.config.template.html({
            page: page,
            pages: this.config.tree && this.config.tree.pages || []
        }));
    },

    recurse: function (filepath) {
        // Match a directory or file name
        var match = fs.lstatSync(filepath);
        var filename = path.basename(filepath);

        // Let's make sure this match isn't a junk
        // file, such as .svn or .gitignore or .DS_Store
        if (junk.isnt(filename)) {

            // Tree node
            var tree = {};

            // If the filepath matches to a directory,
            // set the type and create a 'children' node
            // where we run the function again in order
            // to map any child pages
            if (match.isDirectory()) {

                // Tree node
                tree.name = filename;
                tree.isDirectory = true;
                tree.pages = [];

                // Loop through directory and map child pages to tree node
                fs.readdirSync(filepath).map(function (child) {

                    // Check this child isn't a junk file
                    if (junk.isnt(child)) {

                        // Check whether this file should be included
                        if (this.excluded.indexOf(path.normalize(filepath + '/' + child)) === -1) {

                            // Run the recurse function again for this child
                            // to determine whether it's a directory or file,
                            // and if it is either, push it to pages array of its parent
                            var childTree = this.recurse(path.normalize(filepath + '/' + child));
                            if (childTree) {
                                tree.pages.push(childTree);
                            }
                        }
                    }
                }.bind(this));

                // Don't display as a directory if
                // this tree node has no pages
                if (tree.pages.length === 0) {
                    tree.isDirectory = false;
                }
            }

            // If the filepath isn't a directory, try and grab
            // file data from the Sassdown.pages stack and
            // associate it. Ignore files that are not classed
            // as junk files (.gitignore, .svn, .DS_Store, thumbs.db, etc)
            if (match.isFile()) {
                // Loop through the Sassdown.pages
                this.pages.forEach(function (page) {
                    // Check for a match to filepath
                    if (path.normalize(filepath) === path.normalize(page.src)) {
                        tree = page;
                        tree.isFile = true;
                    }
                });
            }

            // Return this tree node if it is a valid directory or file
            return tree.isDirectory || tree.isFile ? tree : false;
        }
    },

    tree: function () {

        // Set the Sassdown.config.tree to be the returned object
        // literal from the file directory recursion
        this.config.tree = this.recurse(this.config.srcdir);

        // Return the complete tree (without root)
        return this.config.tree.pages;
    },

    output: function () {
        // Run through each page from before
        return this.pages.map(function (page) {
            // Write this page out
            this.writeOut(page);
        }.bind(this));
    },


    //wrapper method
    run: function (callback) {
        this.registerHandlebarsHelpers();
        this.scaffold();
        this.template();
        this.theme();
        this.highlight();
        this.scripts();
        this.assets();
        this.pages();
        this.tree();
        if (this.options.dryRun === false) {
            this.readme();
            this.output();
        }

        if (typeof callback === 'function') {
            callback();
        }
    }

});

module.exports = Sassdown;
