import assign from 'lodash/object/assign';
import frontMatter from 'front-matter';
import gulp from 'gulp';
import nunjucks from 'nunjucks';
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
            page: assign(yaml.attributes)
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
    .pipe(renderContent());
});

gulp.task('default', ['pages']);
