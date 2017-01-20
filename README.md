# jbhannah.net

[![Build Status](https://img.shields.io/travis/jbhannah/jbhannah.net.svg)](https://travis-ci.org/jbhannah/jbhannah.net)
[![Dependency Status](https://david-dm.org/jbhannah/jbhannah.net/status.svg)](https://david-dm.org/jbhannah/jbhannah.net#info=dependencies)

Homepage and weblog of Jesse B. Hannah.

## Requirements

* Latest stable Node
* [Yarn][3]
* `gulp-cli`

## Development

    $ yarn install
    $ yarn start

## Deployment

    $ yarn run build -- --production

then upload the contents of `build` (currently continuously deploying from
Travis CI to S3 on successful builds of `master`).

## Credits

Copyright © 2015 Jesse B. Hannah, licensed under the MIT License (see
`LICENSE`).

Directory and file structure, much of the Gulpfile, and the main inspiration for
this project, are all from [philipwalton/blog][1]. Copyright © 2015 Philip
Walton, licensed under the [MIT License][2].

[1]: https://github.com/philipwalton/blog/tree/46503c22fcf66fd21194e3b7a8a0223a08d60cdf
[2]: https://github.com/philipwalton/blog/blob/46503c22fcf66fd21194e3b7a8a0223a08d60cdf/package.json#L18
[3]: https://yarnpkg.com/
