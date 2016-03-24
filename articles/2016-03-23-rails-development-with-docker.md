---
title: Rails Development with Docker
date: 2016-03-23T11:33:00-07:00
---

Lately I've found myself working on multiple personal Rails projects (namely,
[`pokesite`][] and [`lifeisleet`][]), sometimes at the same time. As a result,
I've come across a number of pitfalls with trying to work on multiple Rails
sites simultaneously. After more than a significant amount of wrangling with
various tools that try to make things easier—[RVM][], [Vagrant][],
[Cloud9][]—I've finally settled on [Docker][] as my preferred basis for a solid,
low-friction, reproducible Rails development environment.

<aside>
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

 - **No extra setup steps**: Once Docker is installed, simply pull and `cd`,
     bundle, migrate. Just like any other Rails application.

 - **One-command start and stop**: No need to remember to start up and tear down
     each service individually.

 - **[Persistent gems container][]**: No need to rebuild the entire image to
     install a new gem, just `bundle install` in the container.

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

If all you're doing is setting up a project that followed these instructions to
create a `Dockerfile` and `docker-compose.yml`, you can skip all the way down to
the last section. You've already installed everything you'll need on your local
machine.

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

You need a `Dockerfile` to create an image, so let's go through this one step at
a time. Every `Dockerfile` begins with a `FROM` statement:

```docker
FROM ruby:2-alpine
```

This image uses the latest Alpine-based Ruby 2.x image as its base. Simple
enough. But to install all of your gems and get Rails up and running, it needs
a few dependencies:

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
runtime, so install `nodejs`. [TZInfo][] needs the timezone data provided by
`tzdata`. In order to get [Nokogiri][] to build, you need to install Alpine's
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

The application will live, and all commands you run through Docker will run, in
`/usr/src/app`.

```docker
EXPOSE 3000
```

Allow incoming connections on port 3000 to containers created from this image.

```docker
ENV BUNDLE_PATH /ruby_gems
```

Tell Bundler to install all your gems to `/ruby_gems`; you'll come back to this
when you create `docker-compose.yml`.

```docker
CMD ["bin/rails", "s", "-b", "0.0.0.0"]
```

Finally, specify the default command for this container, which starts the Rails
server listening on all interfaces.

## Docker Compose

Now that you've written the `Dockerfile` for your application image, you need to
put together the puzzle pieces of your application, your database, and your
persistent gems container. Docker Compose makes this easy; just add the three
containers to a file called `docker-compose.yml`. First, the database:

```yml
db:
  image: postgres:9
```

That's all you need to have a PostgreSQL container that your application can
link to, and which will hold on to its data as long as you don't delete the
container with `docker rm` or `docker-compose rm`. The same principle applies
for any other services your app uses, such as Redis.

Next, the application itself:

```yml
web:
  build: .
  links:
    - db
  ports:
    - "3001:3000"
  volumes:
    - .:/usr/src/app
  volumes_from:
    - gems
```

This one's a bit more complicated. It `build`s an image from the `Dockerfile` in
the current directory, `link`s the container to the `db` container described
above (and to any other services your app uses), opens port 3001 on the Docker
host (`localhost` on Linux; `local.docker` on OS X with DLite) for connections
to port 3000 in the container, mounts the current directory in the container at
`/usr/src/app`, and uses volumes that are defined in your persistent `gems`
container:

```yml
gems:
  image: busybox
  volumes:
    - /ruby_gems
```

All this container has to do is put the contents of `/ruby_gems` in a mounted
volume and hang on to it. Because the gems all live outside of the `web`
container, you can remove and re-create the container without having to
reinstall all of the gems, and you don't have to rebuild the `web` image if you
add or update any gems.

<aside>
If you have multiple Rails applications that you're working on, you can just
copy the <code>Dockerfile</code> and <code>docker-comopse.yml</code>, and as
long as you change <code>3001</code> in the <code>web</code> container's ports
configuration to something else, you'll never run into any port conflicts when
trying to run multiple apps at the same time.
</aside>

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

In this example, the `web` container links to the `db` container, so it has
a hosts entry for `db` that points to the `db` container's IP address, and
(among other things, but this is the one you want) a `DB_PORT_5432_TCP_PORT`
environment variable with the exposed PostgreSQL port that the `db` container is
listening on. To get your Rails application to connect to the `db` container,
simply add the host and port and the `postgres` username to the `default`
section of `config/database.yml`:

```yml
default: &default
  ...
  host: db
  port: <%= ENV['DB_PORT_5432_TCP_PORT'] %>
  username: postgres
```

Another example: If you're using other services like Redis, you might already be
using an environment variable like `REDIS_URL` to connect to it in production,
and may have a `.env` file locally that sets that variable to your local Redis
instance. To change this to use a Redis service container, add one to your
`docker-compose.yml`:

```yml
redis:
  image: redis

web:
  ...
  links:
    ...
    - redis
```

and update your connection information (removing any local values of
`REDIS_URL`, of course):

```ruby
ENV['REDIS_URL'] || "redis://redis:#{REDIS_PORT_6379_TCP_PORT}"
```

## Starting Up

Now that your `Dockerfile` and `docker-compose.yml` are written, and your
application is configured to connect to the containered services, all that's
left before you can start your application are the typical Rails steps of
bundling the gems and setting up the database. You can add these steps to your
`bin/setup` script to condense them down to one command.

```bash
$ docker-compose run --rm web bundle
$ docker-compose run --rm web bin/rake db:setup
```

`docker-compose run --rm web bundle` means, run the `bundle` command in a
container specified by the `web` section of your `docker-compose.yml`, and
remove the container afterward (otherwise your system will be littered with
containers from one-off commands like this). Docker Compose will see that it
needs to pull the `postgres` and `busybox` images for the `db` and `gems`
containers, respectively, and will create and start the containers. It'll then
see that it needs to build the image for your `web` container, pull the `ruby`
base image, and run the commands in the `Dockerfile`. (If you followed the steps
to initialize Rails, it's already done all of this.)

After the images are pulled and built, all your gems will be installed into
`/ruby_gems`, which the `gems` container manages as a volume, and the database
setup will connect to the containered instance of PostgreSQL. The whole process
takes longer than running it all directly on a local machine, but in the same
number of commands. All it takes now to start up the application is:

```bash
$ docker-compose up
```

Once you see the usual message from WEBrick (or Puma, or whatever server you're
using) that your application is ready, open up `http://localhost:3000` on Linux
or `http://local.docker:3000` on OS X, and voila!  Your fully-containered,
easily-reproducible Rails development environment is ready to go.
Everything—`rake` tasks, `bundle` commands, the Rails console—works exactly the
same as it does when developing directly on your local host; you just have to
add `docker-compose run --rm web` to the beginning:

```bash
$ docker-compose run --rm web bin/rake routes
$ docker-comopse run --rm web bundle update rails
$ docker-compose run --rm web bin/rails c
```

Your application is mounted into the `web` container as a volume, so any changes
you make are reflected immediately, just the same as with local development.
Restarting the server works exactly the same way, too. You can even use
[Guard][], with only minor changes to your `docker-compose.yml`'s `web` section:

```yml
  command: bin/guard -p -l 1
  stdin_open: true
  tty: true
```

As long as each of your sites has a different `web` port, you can run as many
sites at once as your system can handle. When you're done, all it takes to shut
down the application and all its services is:

```bash
$ docker-compose stop
```

Both [`pokesite`][] and [`lifeisleet`][] use this structure for development, so
refer to either project's `Dockerfile` and `docker-compose.yml`. `pokesite` is
deployed on [Heroku][], and containers are the best approximation I've found of
Heroku's architecture; now that I've moved to Docker for development
environments, I'd bet it'll be a long time before I go back to local development
for Rails.



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

[^nkg]: Alpine uses [musl][] instead of glibc as its standard library, and the
version of `libxml2` included with Nokogiri won't build on musl.

[`pokesite`]: https://github.com/thetallgrassnet/pokesite
[`lifeisleet`]: https://github.com/lifeisleet/lifeisleet
[RVM]: http://rvm.io/
[Vagrant]: https://www.vagrantup.com/
[Cloud9]: https://c9.io/
[Docker]: https://www.docker.com/
[Neo4j]: http://neo4j.com/
[Persistent gems container]: http://www.atlashealth.com/blog/2014/09/persistent-ruby-gems-docker-container/
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
[Guard]: http://guardgem.org/
[Heroku]: https://www.heroku.com/
[musl]: http://www.musl-libc.org/
