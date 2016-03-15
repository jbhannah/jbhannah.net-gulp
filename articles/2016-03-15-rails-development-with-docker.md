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

## Problems with working on multiple Rails sites at once

 - Port conflicts: Unless you manually configure the ports for each
     application's servers (and services), you'll run into conflicts if you try
     to start up one when another is already running.

 - Service hell: Is Redis already running? What about Postgres? Back over to the
     site that uses Neo4j—oh, I need to start both the development and test
     instances[^1]—shoot, I left those running on the *other* site that uses
     Neo4j, and now my development data is all mixed together. Keeping track of
     what's running, and for which sites, can be a pain.

[^1]: It's a quirk of Rails and Neo4j development, I've found, that it works
better to have separate running instances of Neo4j for development and for
testing. I'll go into further detail in a later post about Rails development
with Neo4j.

[`pokesite`]: https://github.com/thetallgrassnet/pokesite
[`lifeisleet`]: https://github.com/lifeisleet/lifeisleet
[RVM]: http://rvm.io/
[Vagrant]: https://www.vagrantup.com/
[Cloud9]: https://c9.io/
[Docker]: https://www.docker.com/
