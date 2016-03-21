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

## The `Dockerfile` and initializing Rails

Yes, I know that there's an [official Rails Docker image][] that Every Docker
Tutorial Ever uses; no, we're not going to use it here. The `onbuild` image
requires rebuilding the entire image every time you want to install or update a
gem, and while the non-`onbuild` image _can_ be configured to make this
unnecessary, you're still tying yourself to rebuilding every time you want to
update Rails. Like I said, I'm lazy; I just want to do `bundle install` and
`bundle update`. Also, while the images are much slimmer than they used to be,
we're going to go even smaller by basing our image on the official [Alpine
Linux][]-based Ruby image.

```docker
FROM ruby:2.3.0-alpine
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
