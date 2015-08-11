import assign from 'lodash/object/assign';
import connect from 'connect';
import del from 'del';
import frontMatter from 'front-matter';
import gulp from 'gulp';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import path from 'path';
import serveStatic from 'serve-static';
import through from 'through2';
import yargs from 'yargs';

const DEST = 'build';
const PORT = 4000;

let siteData = {
  title: 'Jesse B. Hannah',
  subtitle: 'jbhannah',
  baseUrl: 'https://jbhannah.net',
  timezone: 'America/Phoenix',
  buildTime: new Date()
};

let env = nunjucks.configure('templates', {
  autoescape: false,
  watch: true // required to see template changes with gulp serve
});

function getPermalink(filepath) {
  let extname = path.extname(filepath);
  let dirname = path.dirname(filepath);
  let basename = path.basename(filepath, extname);

  if (basename !== 'index') {
    dirname += '/' + basename;
    basename = 'index';
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
  let site = assign(siteData);

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
      let content = file.contents.toString();
      file.data.page.content = nunjucks.renderString(content, file.data);

      let template = file.data.page.template;
      file.contents = new Buffer(nunjucks.render(template, file.data));

      file.path = getDestPathFromPermalink(file.data.page.permalink);

      this.push(file);
      done();
    }
  );
}

gulp.task('pages', function () {
  return gulp.src(['./pages/*'], {base: '.'})
    .pipe(renderContent())
    .pipe(renderTemplate())
    .pipe(gulp.dest(DEST));
});

gulp.task('clean', function (done) {
  del(DEST, done);
});

gulp.task('default', ['pages']);

gulp.task('serve', ['default'], function () {
  let port = yargs.argv.port || yargs.argv.p || PORT;

  connect()
    .use(morgan('dev'))
    .use(serveStatic(DEST))
    .listen(port);

  gulp.watch(['./pages/*', './templates/*'], ['pages']);
});