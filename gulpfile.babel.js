'use strict';

import assign from 'lodash/object/assign';
import babelify from 'babelify';
import browserify from 'browserify';
import buffer from 'vinyl-buffer';
import connect from 'connect';
import connectLivereload from 'connect-livereload';
import cssnano from 'gulp-cssnano';
import del from 'del';
import frontMatter from 'front-matter';
import gulp from 'gulp';
import gulpIf from 'gulp-if';
import gutil from 'gulp-util';
import he from 'he';
import hljs from 'highlight.js';
import htmlmin from 'gulp-htmlmin';
import inlineSource from 'gulp-inline-source';
import less from 'gulp-less';
import LessPluginAutoprefix from 'less-plugin-autoprefix';
import livereload from 'gulp-livereload';
import MarkdownIt from 'markdown-it';
import MarkdownItFootnote from 'markdown-it-footnote';
import moment from 'moment';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import path from 'path';
import plumber from 'gulp-plumber';
import runSequence from 'run-sequence';
import serveStatic from 'serve-static';
import source from 'vinyl-source-stream';
import sourcemaps from 'gulp-sourcemaps';
import through from 'through2';
import uglify from 'gulp-uglify';
import yargs from 'yargs';

const DEST = 'build';
const PORT = 4000;
const LR_PORT = 35729;

let production = (process.env.NODE_ENV === 'production');

let siteData = {
  title: 'Jesse B. Hannah',
  subtitle: 'jbhannah',
  production: production,
  baseUrl: production ? 'https://jbhannah.net' : 'http://localhost:' + PORT,
  timezone: 'America/Phoenix',
  buildTime: new Date()
};

let env = nunjucks.configure('templates', {
  autoescape: false
});

let lessOpts = {};
let autoprefix = new LessPluginAutoprefix();
lessOpts.plugins = [autoprefix];

function streamError(err) {
  gutil.beep();
  gutil.log(err instanceof gutil.PluginError ? err.toString() : err.stack);
}

function getPermalink(filepath) {
  let extname = path.extname(filepath);
  let dirname = path.dirname(filepath);
  let basename = path.basename(filepath, extname)
    .replace(/\d{4}-\d{2}-\d{2}-/, '');

  if (basename !== 'index' && basename !== 'atom') {
    dirname += '/' + basename;
    basename = 'index';
    extname = '.html';

    filepath = path.join(dirname, basename + extname);
  } else if (extname === '.md') {
    extname = '.html';

    filepath = path.join(dirname, basename + extname);
  }

  return path.join('/', path.relative('.', filepath))
    .replace(/^\/pages\//, '/')
    .replace(/index\.html$/, '');
}

function getDestPathFromPermalink(permalink) {
  return path.resolve(permalink.replace(/\/$/, '/index.html').slice(1));
}

function renderContent() {
  let files = [];
  let site = assign(siteData, {articles: []});

  let md = new MarkdownIt({
    html: true,
    typographer: true,
    highlight: function (code, lang) {
      return lang ? hljs.highlight(lang, code).value : he.escape(he.unescape(code));
    }
  }).use(MarkdownItFootnote);

  return through.obj(
    function transform(file, enc, done) {
      let contents = file.contents.toString();
      let yaml = frontMatter(contents);

      if (yaml.attributes) {
        contents = yaml.body;
        file.data = {
          site: site,
          page: assign({permalink: getPermalink(file.path)}, yaml.attributes)
        };
      }

      if (path.extname(file.path) === '.md') {
        file.data.page.contents = contents = md.render(contents);
      }

      if (path.relative('.', file.path).startsWith('articles')) {
        if (!file.data.page.hasOwnProperty('date')) {
          file.data.page.date = path.basename(file.path, path.extname(file.path))
            .match(/\d{4}-\d{2}-\d{2}/)[0];
        }

        file.data.page.template = 'article.html';
        file.data.page.excerpt = contents.substr(contents.indexOf('<p>') + 3, contents.indexOf('</p>') - 3);

        site.articles.unshift(file.data.page);
      }

      file.contents = new Buffer(contents);

      files.push(file);
      done();
    },
    function flush(done) {
      files.forEach(function (file) { this.push(file); }.bind(this));
      done();
    }
  );
}

function renderTemplate() {
  return through.obj(
    function (file, enc, done) {
      try {
        let content = file.contents.toString();
        file.data.page.content = nunjucks.renderString(content, file.data);

        let template = file.data.page.template;
        file.contents = new Buffer(nunjucks.render(template, file.data));

        file.path = getDestPathFromPermalink(file.data.page.permalink);

        this.push(file);
      } catch (err) {
        this.emit('error', new gutil.PluginError('renderTemplate', err, {
          fileName: file.path
        }));
      }

      done();
    }
  );
}

gulp.task('clean', function () {
  return del(DEST);
});

gulp.task('js', function () {
  let b = browserify({
    entries: 'assets/js/app.js',
    debug: !production
  }).transform(babelify);

  return b.bundle()
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(gulpIf(!production, sourcemaps.init({loadMaps: true})))
    .pipe(uglify())
    .pipe(gulpIf(!production, sourcemaps.write('.')))
    .pipe(gulp.dest(DEST + '/assets/js'))
    .pipe(livereload());
});

gulp.task('less', function () {
  return gulp.src(['./assets/css/main.less'], {base: '.'})
    .pipe(plumber({errorHandler: streamError}))
    .pipe(gulpIf(!production, sourcemaps.init()))
    .pipe(less(lessOpts))
    .pipe(cssnano())
    .pipe(gulpIf(!production, sourcemaps.write('.')))
    .pipe(gulp.dest(DEST))
    .pipe(livereload());
});

gulp.task('nunjucks:filters', function () {
  env.addFilter('format', function (str, formatString) {
    return moment.utc(str).format(formatString);
  });
});

gulp.task('pages', ['nunjucks:filters'], function () {
  return gulp.src(['./articles/*', './pages/*'], {base: '.'})
    .pipe(plumber({errorHandler: streamError}))
    .pipe(renderContent())
    .pipe(renderTemplate())
    .pipe(gulpIf(production, inlineSource({
      rootpath: DEST
    })))
    .pipe(htmlmin({
      collapseWhitespace: true,
      keepClosingSlash: true,
      minifyJS: true,
    }))
    .pipe(gulp.dest(DEST))
    .pipe(livereload());
});

gulp.task('static', function () {
  return gulp.src(['./static/**/*'], {dot: true})
    .pipe(gulp.dest(DEST));
});

gulp.task('default', function (done) {
  runSequence('clean', ['js', 'less', 'static', 'pages'], done);
});

gulp.task('nunjucks:watch', function () {
  env = nunjucks.configure('templates', {
    autoescape: false,
    watch: true // required to see template changes with gulp serve
  });
});

gulp.task('serve', ['nunjucks:watch', 'default'], function () {
  let port = yargs.argv.port || yargs.argv.p || PORT;

  livereload.listen({
    port: LR_PORT
  });

  connect()
    .use(morgan('dev'))
    .use(connectLivereload({
      port: LR_PORT
    }))
    .use(serveStatic(DEST))
    .listen(port, function () {
      console.log('Listening at http://localhost:' + port);
    });

  gulp.watch(['./assets/js/**/*.js'], ['js']);
  gulp.watch(['./assets/css/**/*.less'], ['less']);
  if (production) {
    gulp.watch(['./assets/css/**/*.less'], ['pages']);
  }
  gulp.watch(['./articles/*.md', './pages/*', './templates/*'], ['pages']);
  gulp.watch(['./static/**/*'], ['static']);
});
