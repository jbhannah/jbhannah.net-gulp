---
title: Give Your Buttons a Type
date: 2016-03-28T17:06:00-07:00
---

I fixed a bug at work today where hitting the "Enter" key from a text input in
an [accordion][] form, in addition to submitting the form via a `keydown`
listener[^kd], would collapse the current section of the accordion, open the
next section, and open a [dropdown][] attached to a button in that section. If a
user hit Enter a second time quickly enough, instead of submitting the text they
entered in the first section of the form, the empty second section would be
submitted, taking the user to an entirely different page.

This is an obvious usability problem with a less obvious, but also
usability-related solution, and it's something I had actually come across
before. It's typical to use an HTML `button` to submit a form, and occasionally
another `button` to reset the form:

```html
<form>
    <input type="text" name="name" value="Jesse B. Hannah">
    <button type="reset">Reset</button>
    <button type="submit">Submit</button>
</form>
```

But buttons have other purposes too; if your form is in a modal, you might have
a "Cancel" button that closes the modal instead of just a "Reset" button:

```html
<form>
    <input type="text" name="name" value="Jesse B. Hannah">
    <button onclick="dismissModal()">Cancel</button>
    <button type="submit">Submit</button>
</form>
```

If the user is like me, and likes to use the keyboard to navigate and submit
forms, they might just type in their name and hit enter, and then be completely
baffled when the modal closes without submitting the form. This happens because
buttons have a [default `type` of `submit`][], so the first `button` in the form
catches the enter keypress and, in this case, closes the modal. Solve this by
remembering to explicitly give every button a `type`:

```html
<form>
    <input type="text" name="name" value="Jesse B. Hannah">
    <button **type="button"** onclick="dismissModal()">Cancel</button>
    <button type="submit">Submit</button>
</form>
```

In terms of both semantics and usability, it's generally a good idea to not
always rely on the default `type` of an element. I tend to be more explicit
about attributes as a matter of personal preference, but also because of edge
cases like this where the default behavior might not be what you expect. For
buttons specifically, any button that is not the submit or reset button of the
form should be given `type="button"`. Remember to do that upfront, and it will
save you from a lot of weird and tricky-to-spot bugs later.



[^kd]: I know, but it's a weird form where "Enter" is supposed to do different
things in different inputs. Namely, in some inputs it fills in the current
autocomplete value, where in others it submits the form immediately even if an
autocomplete value is selected. Generally speaking, you should use a `button
type="submit"` to handle submitting forms on "Enter."

[accordion]: http://angular-ui.github.io/bootstrap/#/accordion
[dropdown]: http://angular-ui.github.io/bootstrap/#/dropdown
[default `type` of `submit`]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#attr-type
