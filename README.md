# node-sassdown

> Node library for building living styleguides with Handlebars from Markdown comments in CSS, Sass and LESS files.

**Note: *This library is a port of [sassdown](https://github.com/nopr/sassdown) by Jesper Hills. Currently based on version `0.2.7`.**

1. [Getting started](#getting-started)
2. [Usage](#usage)
    - [Options](#options)
    - [Arguments](#arguments)
3. [Markdown](#markdown)
4. [Handlebars](#handlebars)
5. [Highlight.js](#highlightjs)
6. [Data Objects](#data-objects)
    - [Page](#page)
    - [Pages](#pages)
7. [Template](#template)
8. [Sass](#sass)

## Getting started

Install this library with this command:

```bash
npm install node-sassdown --save-dev
```

## Usage

Import the library in your file and initialize it 

```js
var Sassdown = require('node-sassdown');

var srcGlob = '**/*.scss';
var srcPath = 'assets/scss';
var destPath = 'styleguide';
var options = {};

var sassdown = new Sassdown(srcGlob, srcPath, destPath, options);

//generate styleguide
sassdown.run();

```

###Arguments

#### srcGlob
Type: `String|Array`<br/>
Default: `null`

A [glob](https://github.com/isaacs/node-glob) path or an array of filepaths
 
#### srcPath
Type: `String`<br/>
Default: `null`

Root folder of source files (used as `cwd` [option](https://github.com/isaacs/node-glob#options) in glob )

#### destPath
Type: `String`<br/>
Default: `null`

Root folder of generated styleguide

#### options
Type: `Object`<br/>
Default: `{}`

Styleguide options. See below for details

### Options

#### options.assets
Type: `Array`<br/>
Default: `null`

*Optional*. Array of file paths. Will be included into the styleguide output. Supports [globbing](https://github.com/isaacs/node-glob). Supports relative and absolute file paths (eg. `http://`, `https://`, `//` or even `file://`).

#### options.template
Type: `String`<br/>
Default: `null`

*Optional*. A path to a Handlebars template file. Will use default Sassdown template if left blank.

#### options.handlebarsHelpers
Type: `Array`<br/>
Default: `null`

*Optional*. Array of file paths. The [Handlebars helpers](http://handlebarsjs.com/#helpers) will be available to use in the template. Supports [globbing](https://github.com/isaacs/node-glob). Supports relative and absolute file paths (eg. `http://`, `https://` or even `file://`).

#### options.theme
Type: `String`<br/>
Default: `null`

*Optional*. A path to a theme stylesheet. Will use default Sassdown theme if left blank.

#### options.readme
Type: `String`<br/>
Default: `null`

*Optional*. Path to a README file. When set, this file will be parsed with Markdown and used as the index page for the styleguide.

#### options.highlight
Type: `String`<br/>
Default: `github`

*Optional*. Choice of syntax highlighting style. Defaults to `github`, but other available options are: `docco`, `monokai`, `solarized-light`, `solarized-dark` or `xcode`.

#### options.scripts
Type: `Array`<br/>
Default: `null`

*Optional*. Array of file paths. The scripts will be linked with script tags with src attributes. Supports [globbing](https://github.com/isaacs/node-glob). Supports relative and absolute file paths (eg. `http://`, `https://`, `//` or even `file://`).

If this option is set the default scripts won't be included, but you can include them again by adding `node_modules/node-sassdown/lib/data/scripts.js` to the file list, or by copying and modifying that file.

#### options.commentStart
Type: `RegExp`<br/>
Default: `/\/\*/`

*Optional*. A regular expression to match beginning part of a comment block. Defaults to regular block comment (`/*`).

#### options.commentEnd
Type: `RegExp`<br/>
Default: `/\*\//`

*Optional*. A regular expression to match ending part of a comment block. Defaults to regular block comment (`*/`).

#### options.excludeMissing
Type: `Boolean`<br/>
Default: `false`

*Optional*. When set to true, Sassdown will ignore any files that do not contain matching or valid comment blocks.

#### options.dryRun
Type: `Boolean`<br/>
Default: `false`

*Optional*. When set to true, Sassdown will not generate any files, and will exit with status `1` if any files do not contain matching or valid comment blocks.

# Markdown

Sassdown uses [Markdown](https://github.com/chjj/marked) to parse any block comments in your Sass files. From these, it generates the text content in the styleguide. Any recognised code blocks will be rendered as HTML/SCSS source-result pairs.

## Structure

You may use any Markdown-compatible [heading syntax](https://github.com/nopr/sassdown/issues/7) you like. You may use any common style of [block-comment syntax](https://github.com/nopr/sassdown/issues/12#issuecomment-28219982) you like. Code blocks may be fenced or indented (four spaces or one tab character). Below are several examples; each will be correctly parsed by Sassdown into identical output.

### Example .scss file

```scss
/*

Alerts
======

Creates an alert box notification using the `.alert-` prefix. The following options are available:

    <div class="alert-success">Success</div> 
    <div class="alert-warning">Warning</div> 
    <div class="alert-error">Error</div>

*/
@mixin alert($colour){
    color: darken($colour, 50%);
    background: $colour;
    border-radius: 5px;
    margin-bottom: 1em;
    padding: 1em;
}
.alert-success { @include alert(#e2f3c1) }
.alert-warning { @include alert(#fceabe) }
.alert-error   { @include alert(#ffdcdc) }
```

# Handlebars

[Handlebars](http://handlebarsjs.com/) is a semantic templating syntax. Put simply, it allows you to output dynamic properties in HTML using `{{var}}` from a variety of data sources such as JSON.

Sassdown uses Handlebars to output data from the [data objects](#data-objects) it creates. Your `.hbs` file specified in the `template` option may contain code that looks like this for example:

```html
{{#each page.sections}}
    <div class="section">
        {{#if comment}}
            <div class="comment">{{{comment}}}</div>
        {{/if}}
        {{#if result}}
            <div class="result">{{{result}}}</div>
        {{/if}}
        {{#if markup}}
            <div class="markup">{{{markup}}}</div>
        {{/if}}
        {{#if styles}}
            <div class="styles">{{{styles}}}</div>
        {{/if}}
    </div>
{{/each}}
```

### Common partials

Sassdown also provides a series of Handlebars **partials**, which can be used to output specific information on each page. These are:

* `{{> root}}`<br>Outputs a path to the root directory of the styleguide, relative to whatever page you are on.
 
* `{{> assets}}`<br>Outputs a set of `<link />` or `<script>` tags that include assets specified in the Grunt task options.
 
* `{{> theme}}`<br>Outputs the theme stylesheet, minified, into a `<style>` tag.

### Handlebars helpers

You can add more features to Handlebar templates by using [Helpers](http://handlebarsjs.com/#helpers).

For example you could add a helper that capitalizes all text:

    <big>{{uppercase shoutThis}}</big>
    
You load your helpers with the `handlebarsHelpers` option.

    handlebarsHelpers: ['hb-helpers/**/*.js']

The helper module must export a function that does the registration, or else it won't load.

    module.exports = function(Handlebars) {
        Handlebars.registerHelper('uppercase', function(input) {
          return typeof input === 'string' ? input.toUpperCase() : input;
        });
    };
    
    // This also works
    module.exports = {
      register: function(Handlebars) {
        ...
    }

# Highlight.js

Sassdown uses the popular and well-supported [Highlight.js](http://highlightjs.org/) for syntax highlighting. Markup is parsed by a Node module and highlighted before being output through the template. Various popular themes are supported via the task options.

# Data Objects

Two objects are parsed into the Handlebars template; `Page` and `Pages`. **Page** contains json data for the current page only; **Pages** is an array literal containing all Page objects in a nested node tree.

Any property within these objects can be output by Handlebars using `{{helpers}}`. You can iterate through objects using `{{#each}} ... {{/each}}`, for example.

## Page

```js
{
  title: 'Alerts',
  slug: '_alerts',
  href: 'objects/user/_alerts.html',
  dest: 'test/example/styleguide/objects/user/_alerts.html',
  src: 'test/example/assets/sass/partials/objects/user/_alerts.scss',
  sections: [ 
    {
      id: 'mswbu',
      comment: '<h1 id="alerts">Alerts</h1>\n<p>Creates an alert box notification using the <code>.alert-</code> prefix. The following options are available:</p>\n',
      result: '\n<div class="alert-success">Success</div> \n<div class="alert-warning">Warning</div> \n<div class="alert-error">Error</div>\n',
      markup: '<pre><code><span class="token tag" ><span class="token tag" ><span class="token punctuation" >&lt;</span>div</span> <span class="token attr-name" >class</span><span class="token attr-value" ><span class="token punctuation" >=</span>&quot;alert-success&quot;&gt;</span></span>Success<span class="token tag" ><span class="token tag" ><span class="token punctuation" >&lt;/</span>div</span><span class="token punctuation" >&gt;</span></span> \n<span class="token tag" ><span class="token tag" ><span class="token punctuation" >&lt;</span>div</span> <span class="token attr-name" >class</span><span class="token attr-value" ><span class="token punctuation" >=</span>&quot;alert-warning&quot;&gt;</span></span>Warning<span class="token tag" ><span class="token tag" ><span class="token punctuation" >&lt;/</span>div</span><span class="token punctuation" >&gt;</span></span> \n<span class="token tag" ><span class="token tag" ><span class="token punctuation" >&lt;</span>div</span> <span class="token attr-name" >class</span><span class="token attr-value" ><span class="token punctuation" >=</span>&quot;alert-error&quot;&gt;</span></span>Error<span class="token tag" ><span class="token tag" ><span class="token punctuation" >&lt;/</span>div</span><span class="token punctuation" >&gt;</span></span></code></pre>\n',
      styles: '<pre><code><span class="token keyword" >@mixin</span> alert(<span class="token variable" >$colour</span>)<span class="token punctuation" >{</span>\n    <span class="token property" >color</span><span class="token punctuation" >:</span> darken(<span class="token variable" >$colour</span>, 50%)<span class="token punctuation" >;</span>\n    <span class="token property" >background</span><span class="token punctuation" >:</span> <span class="token variable" >$colour</span><span class="token punctuation" >;</span>\n    <span class="token property" >border-radius</span><span class="token punctuation" >:</span> 5px<span class="token punctuation" >;</span>\n    <span class="token property" >margin-bottom</span><span class="token punctuation" >:</span> 1em<span class="token punctuation" >;</span>\n    <span class="token property" >padding</span><span class="token punctuation" >:</span> 1em<span class="token punctuation" >;</span>\n<span class="token punctuation" >}</span>\n\n.alert-success <span class="token punctuation" >{</span> <span class="token keyword" >@include</span> alert(#e2f3c1) <span class="token punctuation" >}</span>\n.alert-warning <span class="token punctuation" >{</span> <span class="token keyword" >@include</span> alert(#fceabe) <span class="token punctuation" >}</span>\n.alert-error   <span class="token punctuation" >{</span> <span class="token keyword" >@include</span> alert(#ffdcdc) <span class="token punctuation" >}</span></code></pre>\n'
    }
  ]
}
```

## Pages

```js
[
  {
    name: 'base',
    isDirectory: true,
    pages: [
      [Object],
      {
        name: 'typography',
        isDirectory: true,
        pages: [
          [Object],
          [Object],
          [Object]
        ]
      },
      [Object],
      [Object]
    ]
  },
  {
    name: 'partials',
    isDirectory: true,
    pages: [
      [Object],
      [Object]
    ]
  },
  {
    name: 'modules',
    isDirectory: true,
    pages: [
      [Object] 
    ]
  },
  {
    name: 'objects',
    isDirectory: true,
    pages: [
      [Object],
      [Object], 
      [Object]
    ]
  }
]
```

# Template

Should you wish to create a new Sassdown template, you may wish to use the [existing default template.hbs](https://github.com/nopr/sassdown/blob/master/tasks/data/template.hbs) as a base to work from. 

# Sass

It should be noted that, despite the name, Sassdown does not explicitly read only Sass files. It works just fine with .sass, .less, .css or even .txt files.

Sassdown **does not** compile your source files. Assuming you are using SASS, and since you're using Grunt, I would recommend the [grunt-contrib-compass](https://github.com/gruntjs/grunt-contrib-compass) plugin for this task. However you may also want to look at [grunt-contrib-stylus](https://github.com/gruntjs/grunt-contrib-stylus).
