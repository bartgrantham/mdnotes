# mdnotes

**Client-rendered static website from markdown**

See the [example from this repo](https://bartgrantham.github.io/mdnotes/)


- - - -

## About

This is a recreation of the very useful but buggy and now abandoned [mdwiki](https://github.com/Dynalon/mdwiki/).

My goal with this project was to achieve the major functionality of mdwiki I found indespensible:

- single page client-side markdown renderer, appropriate for a static website
- support a `navigation.md` document that renders as header lists
- syntax highlighting for code blocks
- ASCIIMath

Some issues I had with mdwiki that I wanted to avoid:

- super heavy development environment: I was unable to set up a development environment that could build mdwiki, so any hacking on the original codebase was impossible for me
- easy and obvious codebase, stupid-simple build script
- misbehaving syntax highlighting causing infinite loops locking up the browser

### So what did I end up with?

* [Marked.js](https://marked.js.org) for converting Markdown into HTML
* [PrismJS](https://prismjs.com/index.html) for code highlighting
* a slightly edited [AsciiMath](http://asciimath.org/)
* ~300 lines of vanilla JS
* a ~25 line Python build script


- - - -

## Installation / Use

1. Drop `index.html` into a static website
2. Make an `index.md` that will serve as the default page
3. (optional) Configure `navigation.md` to link to your markdown documents
4. Load it up in a browser

(try serving this repo as a static website as an example: `python -m SimpleHTTPServer` and go to http://127.0.0.1:8000/)

Check out the source Markdown for the [navigation](/navigation.md) and [this page](/index.md), also see the [GFMD test page](test/GFMD.md) ([source](/test/GFMD.md))


- - - -

## Building

Stupid and easy: `./build.py`

(if you have [`entr`](http://eradman.com/entrproject/) installed: `ls index.* navigation.md js/* css/* | entr ./build.py`)

I made the following edits to ASCIIMath.js in the main config:

```
var mathcolor = "";
translateOnLoad = false;
var AMdelimiter1 = "$", AMescape1 = "\\\\$";
var AMdocumentId = "body"
```

And in the `translate()` function:
```
   //translated = true;
```


- - - -

## Contributions

Ok.  Yeah, sure.  There's a few ugly spots in the Javascript, and the CSS needs a _lot_ of hackery to be more robust.

I'd like to keep things simple, though.  I think one of the problems mdwiki had was that it became too complex for what it was.  So I'm putting a premium on simplicity and ease of hackery.


- - - -

## TODO

(maybe, at some point... there's no urgency on this project at this point)

### Features

- better css organization
- modal lightbox for linked images/video/audio?
- should I call out "note"/"warning"/"caution" sections like mdwiki?
- might be helpful to turn off certain features
- are there other rendering operators that would be helpful than `#!some_text.md`?  (`#^some_diagram.ditaa`?)
- hidpi HTML canvas (if I ever get around to diagram rendering)
- mdwiki marked hacks I probably don't need
    - removing excess `<p></p>` and `<br />` tags
    - moving images to the beginning of divs to float them
    - convert image links to inline images with links to lightboxing
    - cluster images in the same paragraph for lightboxing together
    - footer
    - themes (I'd rather just make the css simple and easy to swap)
- more tests

### Bugs

- unhover header menus after click
    - this turns out to be harder than it looks
    - elements can be accessed with something like this `document.querySelector("#header ul li ul:hover")`, but Javascript can't directly remove the `:hover` pseudo class
- tertiary lists are interpreted as code blocks
    - this is a common markdown problem, not sure if solvable
- lists don't auto-advance
- headers with no sublist shouldn't have pulldown arrows
- header non-anchors look terrible
- header (and nav?) multi-level navigation
- headers don't degrade gracefully when we run out of space (in fact, they go haywire)
- nav scroll follows main scroll (including scrolling itself!)
- calculation of anchor scroll target coordinate has a magic value, should be more exact
- make all md-originating script tags async
- is tokens/parser a cleaner way to handle script tags?
- ASCIIMath.js grabs a single dollar sign on a line by itself (ie. "thousands of $")


- - - -

## License

MIT License. See ./LICENSE or http://www.opensource.org/licenses/mit-license.php


- - - -

## Contact

Bart Grantham <bart@bartgrantham.com>

- - - -

## Acknowledgements

* [Marked.js](https://marked.js.org) ([github](https://github.com/markedjs/marked))
* [PrismJS](https://prismjs.com/index.html) ([github](https://github.com/PrismJS/prism/))
* [AsciiMath](http://asciimath.org/) ([github](https://github.com/asciimath/asciimathml))
* [Adam Pritchard](https://github.com/adam-p) for the [Github-flavored Markdown Cheetsheet](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)
