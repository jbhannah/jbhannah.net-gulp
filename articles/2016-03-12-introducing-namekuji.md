---
title: Introducing Namekuji
---

New site design, might as well use it to announce a new tool I've written.
[Namekuji][] is a slug generator for any Ruby ORM that builds on Rails'
ActiveModel, including [Neo4j.rb][] and [Mongoid][], born from my ongoing
[Pokémon website project][]'s need for a slug generator that wasn't dependent
on ActiveRecord.

If you have a model—say, for blog posts—with `title` and `slug` columns, all it
takes to get generation and validation of the slug is an include and a call to
`sluggable`:

```ruby
class Post < ActiveRecord::Base
  include Namekuji

  sluggable on_field: :title
end
```

Before validation of a `Post` object occurs, Namekuji will generate a slug from
the object's `title` and insert it into `slug`, and it'll validate the
uniqueness and format of the slug to make sure everything is kosher before the
object is saved. The resulting `Post` will also have a `to_param` method that
returns the `slug`, for convenient use in URLs. The slug itself uses Rails' own
[`parameterize`][] method, but only after removing all apostrophes from the
`title`'s value (so "Let's Watch" becomes `lets-watch`, as opposed to
`let-s-watch`).

What if you want to add the post's ID to the beginning of the slug? Just set
the `on_field` option to the name of any method that returns the basis for your
slug (if no `on_field` is specified, the model's `to_s` method is used). You
can also name the slug storage field whatever you like, and pass it to
`sluggable` in the `slug_field` option (`slug` is the default). I may add other
slug formatting and validation options later as needed.

Right now, Namekuji's tests are only run against ActiveRecord 4.2.6, but
Neo4j.rb is also officially supported, and all tests for thetallgrass.net
(which uses Neo4j and has 100% test coverage) pass with it in place. CI testing
against both Neo4j.rb and Mongoid, and against multiple versions of Rails, are
on the roadmap. Keep an eye on the [Namekuji][] GitHub repository for updates
and additional documentation.

[Namekuji]: https://github.com/thetallgrassnet/namekuji
[Neo4j.rb]: http://neo4jrb.io/
[Mongoid]: https://mongoid.github.io/
[Pokémon website project]: https://github.com/thetallgrassnet/pokesite
[`parameterize`]: http://api.rubyonrails.org/classes/ActiveSupport/Inflector.html#method-i-parameterize
