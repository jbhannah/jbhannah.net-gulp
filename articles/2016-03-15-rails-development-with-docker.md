---
title: Rails Development with Docker
---

Lately I've found myself working on multiple personal Rails projects (namely,
[`pokesite`][] and [`lifeisleet`][]), sometimes at the same time. As a result,
I've come across a number of pitfalls with trying to work on multiple Rails
sites simultaneously. After more than a significant amount of wrangling with
various tools that try to make things easier—[RVM][], [Vagrant][],
[Cloud9][]—I've finally settled on [Docker][] as my preferred basis for a solid,
low-friction, reproducible Rails development environment.

<aside class="notice">
Note that this is only a guide to Rails development with Docker, not production
deployment.
</aside>

## Problems with working on multiple Rails sites at once

**tl;dr**: I'm lazy and obsessive-compulsive about keeping my system clean, and
want it to be as easy as possible to start working on and switch between
different sites.

 - **Ruby versions and gem bloat**: Each site might run on a different version
     of Ruby and its own sets of gems. There are a number of tools for managing
     multiple Ruby versions, and RVM attempts to control the jumble of gems and
     dependencies with its gemsets, but that adds another tooling dependency
     that increases…

 - **Onboarding time**: Greater application complexity and more care taken to
     keep the developer experience as frictionless as possible usually means
     more time for a new developer to get set up with all the dependencies and
     tooling. The `bin/setup` script introduced with Rails 4 created a
     conventional place to start, but then you have to deal with having so many…

 - **Services**: Is Redis already running? What about Postgres? Back over to the
     site that uses [Neo4j][]—oh, I need to start both the development and test
     instances[^n4j]—shoot, I left those running on the *other* site that uses
     Neo4j, and now my development data is all mixed together. Keeping track of
     what's running, and for which sites, can be a pain, and often results in…

 - **Port conflicts**: Unless you manually configure the ports for each
     application's servers (and services), you'll run into conflicts if you try
     to start up one when another is already running.

 - **Cleanup**: Good luck keeping track of which gems or services were only
     installed for a single project that died off months ago and are just
     cluttering up your system.[^cleanup]

## What we'll end up with

 - **Four-command setup**: Pull and `cd`, bundle, migrate, boot up.

 - **Persistent gems container**: No need to rebuild the entire image to install
     a new gem, just `bundle install` in the container.

 - **Persistent data**: Unlike with a separate VM, no losing your data if you
     need to rebuild the image.

 - **Minimal resource overhead**: Also unlike using separate VMs, Docker has
     minimal overhead (albeit slightly more on OS X than Linux), so running
     multiple development sites at once is much easier.

## Getting started with Docker

If you're on a UNIX-based operating system, it's really easy to get Docker
installed[^win]. If you're on Linux, just follow the official documentation for
[Docker Engine][] and [Docker Compose][]; if you're on OS X, I recommend using
[Homebrew][] to install [DLite][][^dlite], Docker, and Docker Compose:

```bash
$ brew install dlite docker docker-compose
$ sudo dlite install
$ dlite start
```

## The `Dockerfile`

Yes, I know that there's an [official Rails Docker image][] that Every Docker
Tutorial Ever uses; no, we're not going to use it here. The `onbuild` image
requires rebuilding the entire image every time you want to install or update a
gem, and while the non-`onbuild` image _can_ be configured to make this
unnecessary, you're still tying yourself to rebuilding every time you want to
update Rails. Like I said, I'm lazy; I just want to do `bundle install` and
`bundle update`. Also, while the images are much slimmer than they used to be,
we're going to go even smaller by basing our image on the official [Alpine
Linux][]-based Ruby image.

You need a `Dockerfile` to create an image, so let's go through ours one step at
a time. Every `Dockerfile` begins with a `FROM` statement:

```docker
FROM ruby:2-alpine
```

Our image uses the latest Alpine-based Ruby 2.x image as its base. Simple
enough. But to install all our gems and get Rails up and running, we need to
install a few dependencies:

```docker
RUN apk add --update --no-cache \
      build-base \
      nodejs \
      tzdata \
      libxml2-dev \
      libxslt-dev \
      postgresql-dev
RUN bundle config build.nokogiri --use-system-libraries
```

`build-base` (Alpine's equivalent to Debian/Ubuntu's `bulid-essential`) installs
the basic utilities (`make`, `gcc`, &c.). The asset pipeline needs a JavaScript
runtime, so we install `nodejs`. [TZInfo][] needs the timezone data provided by
`tzdata`. In order to get [Nokogiri][] to build, we need to install Alpine's
`libxml2` and `libxslt` and their development headers and tell Bundler to build
Nokogiri using the system libraries[^nkg]. Lastly, if you're using
[PostgreSQL][], you'll need the headers to be able to install the `pg` gem;
change this as necessary or appropriate for the database you're using.

Depending on your application, you may need to install additional packages:
`git` if you're installing any gems from Git repositories; `imagemagick` if your
application does any image processing. Use the [Alpine package database][] to
help you figure out what you need to install.

Moving on:

```docker
ENV APP_HOME /usr/src/app
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME
```

The application will live, and all commands we run through Docker will run, in
`/usr/src/app`.

```docker
EXPOSE 3000
```

Allow incoming connections on port 3000 to containers created from this image.

```docker
ENV BUNDLE_PATH /ruby_gems
```

Tell Bundler to install all our gems to `/ruby_gems`; we'll come back to this
when we create `docker-compose.yml`.

```docker
CMD ["bin/rails", "s", "-b", "0.0.0.0"]
```

Finally, specify the default command for this container, which starts the Rails
server listening on all interfaces.

## Docker Compose

Now that we've written the `Dockerfile` for our application image, we need to
put together the puzzle pieces of our application, our database, and our
persistent gems container. Docker Compose makes this easy; just add the three
containers to a file called `docker-compose.yml`. First, the database:

```yml
db:
  image: postgres:9
```

That's all you need to have a PostgreSQL container that your application can
link to, and which will hold on to its data as long as you don't delete the
container with `docker rm` or `docker-compose rm`.

Next, the application itself:

```yml
web:
  build: .
  links:
    - db
  ports:
    - "3000:3000"
  volumes:
    - .:/usr/src/app
  volumes_from:
    - gems
```

This one's a bit more complicated. It `build`s an image from the `Dockerfile` in
the current directory, `link`s the container to the `db` container described
above, opens port 3000 on the Docker host (`localhost` on Linux; `local.docker`
on OS X with DLite) for connections to port 3000 in the container, mounts the
current directory in the container at `/usr/src/app`, and uses volumes that are
defined in our persistent `gems` container:

```yml
gems:
  image: busybox
  volumes:
    - /ruby_gems
```

All this container has to do is put the contents of `/ruby_gems` in a mounted
volume and hang on to it. Because the gems all live outside of the `web`
container, we can remove and re-create the container without having to reinstall
all of the gems, and we don't have to rebuild the `web` image if we add or
update any gems.

The best part of using Docker Compose is that you can define all of the external
services used by your app as containers in `docker-compose.yml` and add them to
the `links` section of the `web` container.

### Initializing Rails (a brief detour)

If you've been following these steps to add Docker-based development to an
existing Rails application, you can skip this section. If you're starting from
scratch, however, you'll need to do a couple of things to initialize your
application.

First, create a `Gemfile` with nothing in it except Rails:

```ruby
source 'https://rubygems.org'
gem 'rails'
```

Then install the bundle in the `web` container and generate the application:

```bash
$ docker-compose run --rm web bundle install
$ docker-compose run --rm web bundle exec rails new . -d postgresql
```

Be sure to overwrite the `Gemfile` when prompted to do so.

## Connecting to services

The only piece of configuration that needs changed in your Rails application is
telling it how to connect to the other services. When a Docker container
specifies a link to another container, it gets a bunch of [environment
variables][] and an entry in `/etc/hosts` that point to the linked container.

In our application, the `web` container links to the `db` container, so it has a
hosts entry for `db` that points to the `db` container's IP address, and (among
other things, but this is the one we want) a `DB_PORT_5432_TCP_PORT` environment
variable with the exposed PostgreSQL port that the `db` container is listening
on. To get our Rails application to connect to the `db` container, simply add
the host and port to `config/database.yml` in the `default` section:

```yml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: 5
  host: db
  port: <%= ENV['DB_1_PORT_5432_TCP_PORT'] %>
  username: postgres
```



[^n4j]: It's a quirk of Rails and Neo4j development, I've found, that it works
better to have separate running instances of Neo4j for development and for
testing. I'll go into further detail in a later post about Rails development
with Neo4j.

[^cleanup]: This is an ongoing struggle for many developers, including myself,
and is by no means exclusive to Rails development. I mention it here because it
was one of the driving factors behind my construction of a Docker-based Rails
development environment.

[^win]: If you're on Windows, sorry; you're on your own for this part.

[^dlite]: At the time of writing, DLite 2.0 is in beta and is
backwards-incompatible with the 1.x branch. I've only used 1.x, so you're on
your own if you want to try the 2.0 beta.

[^nkg]: Alpine uses musl instead of glibc as its standard library, and the
version of `libxml2` included with Nokogiri won't build on musl.

[`pokesite`]: https://github.com/thetallgrassnet/pokesite
[`lifeisleet`]: https://github.com/lifeisleet/lifeisleet
[RVM]: http://rvm.io/
[Vagrant]: https://www.vagrantup.com/
[Cloud9]: https://c9.io/
[Docker]: https://www.docker.com/
[Neo4j]: http://neo4j.com/
[Docker Engine]: https://docs.docker.com/engine/installation/
[Docker Compose]: https://docs.docker.com/compose/install/
[Homebrew]: http://brew.sh/
[DLite]: https://github.com/nlf/dlite
[official Rails Docker image]: https://hub.docker.com/r/_/rails/
[Alpine Linux]: http://www.alpinelinux.org/
[Nokogiri]: http://www.nokogiri.org/
[PostgreSQL]: http://www.postgresql.org/
[TZInfo]: https://tzinfo.github.io/
[Alpine package database]: https://pkgs.alpinelinux.org/packages
[environment variables]: https://docs.docker.com/engine/userguide/networking/default_network/dockerlinks/#environment-variables
