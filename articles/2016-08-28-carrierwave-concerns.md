---
title: Using ActiveSupport Concerns for CarrierWave Base Uploaders
date: 2016-08-28T11:25:00-07:00
---

[CarrierWave][] is my favorite library as of late for file uploading in Rails,
because its mountable uploader classes go nicely with my preference of keeping
classes small and compartmentalized. Unfortunately, one thing that gets in the
way of that is poor support for base uploaders, where (for example) attempting
to [override the storage directory][] for a subclassed uploader won't work in
every case, or [enabling or disabling processing per uploader][]. My preferred
solution to this problem is to fake it using [`ActiveSupport::Concern`][]
modules, which even allows you to stack "base uploaders" as deep as you want.

## Base Uploader

Let's start at the bottom with the `Uploadable` module. Generate it as a
CarrierWave uploader with:

```bash
$ bin/rails g uploader uploadable
```

Then move it into `app/uploaders/concerns` (you'll have to create this
directory), rename it to `uploadable.rb`, and change it from a `class` to a
`module` that `extend`s `ActiveSupport::Concern`[^raise]:

```ruby
module Uploadable
  extend ActiveSupport::Concern

  included do
    # …process, version, &c.
  end

  # …the rest of the uploader class goes here
end
```

Do whatever configuration in this module that you want all of your uploaders to
have or be able to override. Put any CarrierWave DSL method calls (e.g.
`process`) in the `included` block. All of this module's instance methods will
be added to the instances of any uploader class that `include`s it.

## A Basic Uploader

The simplest implementation of an uploader that inherits our new base uploader
looks like this:

```ruby
class SimpleUploader < CarrierWave::Uploaders::Base
  include Uploadable
end
```

This uploader uses all the defaults set in `Uploadable`, and can be
mounted and used like any other CarrierWave uploader. You can add or override
any methods (e.g. `store_dir`) or versions defined in the base uploader, and
they will remain specific to files uploaded with this uploader.

## The Second Level

The one catch with this is that versions and processors defined in the base
uploader will be used for _every_ uploader that includes it. Sometimes this
isn't what you want: you may want some kinds of image uploads to have a
thumbnail, and others to be converted to JPG on upload, and want multiple
uploaders to use one or the other or both sets of configuration. Easy; just make
more concern modules:

```ruby
module Jpegable
  extend ActiveSupport::Concern
  include Uploadable
  include CarrierWave::MiniMagick

  included do
    process convert: 'jpg'
  end
end
```

```ruby
module Thumbnailable
  extend ActiveSupport::Concern
  include Uploadable
  include CarrierWave::MiniMagick

  included do
    version :thumb do
      process resize_to_fit: [100, 100]
    end
  end
end
```

Since each of these concerns also includes `Uploadable`, there's no need to
include it in uploaders that use either or both of them[^inc]:

```ruby
class ImageUploader < CarrierWave::Uploader::Base
  include Jpegable
  include Thumbnailable
end
```



[^raise]: You can even add a check to make sure this doesn't get included
    anywhere unexpected, but it's entirely a matter of taste:

    ```ruby
    included do |base|
      raise 'must be included in a CarrierWave uploader' unless base.ancestors.include?(CarrierWave::Uploader::Base)
    end
    ```

    This is more informative and a better safeguard than waitng for an undefined
    method error if your base uploader specifies any versions or processing and
    gets included in a model on accident.

[^inc]: Remember that Ruby includes are evaluated top-to-bottom, meaning that
`included` blocks are run starting from the first `include`, and method
definitions are found starting from the last `include`. In this example,
`ImageUploader` will convert to JPG before creating the thumbnail.

[CarrierWave]: https://github.com/carrierwaveuploader/carrierwave
[override the storage directory]: https://github.com/carrierwaveuploader/carrierwave/issues/1064
[enabling or disabling processing per uploader]: https://github.com/carrierwaveuploader/carrierwave/issues/1349
[`ActiveSupport::Concern`]: http://api.rubyonrails.org/classes/ActiveSupport/Concern.html
