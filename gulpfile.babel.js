import assign from 'lodash/object/assign';
import frontMatter from 'front-matter';
import gulp from 'gulp';
import nunjucks from 'nunjucks';
import path from 'path';
import through from 'through2';

const DEST = 'build';

let siteData = {
  title: 'Jesse B. Hannah',
  subtitle: 'jbhannah',
  baseUrl: 'https://jbhannah.net',
  timezone: 'America/Phoenix',
  buildTime: new Date()
};

let env = nunjucks.configure('templates', {
  autoescape: false,
  watch: false
});

function getPermalink(filepath) {
  let extname = path.extname(filepath);
  let dirname = path.dirname(filepath);
  let basename = path.basename(filepath);

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

function renderContent () {
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

gulp.task('pages', function () {
  gulp.src(['./pages/*'], {base: '.'})
    .pipe(renderContent())
    .pipe(gulp.dest(DEST));
});

gulp.task('default', ['pages']);
