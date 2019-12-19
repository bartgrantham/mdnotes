;

// Crockford Classless: https://gist.github.com/mpj/17d8d73275bca303e8d2
var Notes = (spec)=>{
    'use strict';
    let cmd, path, dirname, anchor;

    let init = ()=>{
        loadnavigation();
        loadfragment();
    };

    // load navigation.md, render into the "header" element
    let loadnavigation = ()=>{
        let md = Markdown({'dirname':'', 'path':'navigation.md'});  // dirname == '' is important for link generation
        md.load().then((resp)=>{
            resp.text().then((text)=>{
                let renderer = new marked.Renderer();
                renderer.link = md.markdown_link;
                renderer.heading = function (text, level) {
                    if (level == 1) {
                        text = `<a name="index page" href="#!index.md">${text}</a>`;
                    }
                    return `<h${level}>${text}</h${level}>`;
                }
                document.getElementById('header').innerHTML = marked(text, { renderer: renderer });
            })
        })
    }

    // load/parse the url fragment, if it exists, and kick off rendering/drawing
    let loadfragment = (e)=>{
        let [oldcmd, oldpath, oldanchor] = [cmd, path, anchor];
        ;[cmd, path, anchor] = parsefragment()  // semi-colon required here for safe destructuring assignment
        if (cmd == undefined && path == undefined && anchor == undefined) {
            cmd = "!";
            path = "index.md";
        }
        dirname = path.slice(0,path.lastIndexOf("/")+1)  // slice(0,0) if not found (-1 + 1)
        switch (cmd) {
            case "!":
                let md = Markdown({'dirname':dirname, 'path':path});
                if ( (cmd != oldcmd) || (path != oldpath) ) {
                    // reload the page
                    md.load().then((resp)=>{
                        resp.text().then((text)=>{
                            md.markdown_render(text, path);
                            Prism.highlightAll();
                            md.markdown_scrollmain(anchor);
                        })
                    })
                } else {
                    md.markdown_scrollmain(anchor);
                }
                break
        }
    }

    let parsefragment = ()=>{
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLHyperlinkElementUtils/hash
        let hash = window.location.hash;
        let cmd, path, anchor, i;
        switch (hash[1]) {
            case undefined:  // there's no hash or it's just "#"
                return [undefined, undefined, undefined];
            case "!":
                cmd = "!";
                path = hash.substring(2);
                break
            // maybe add more cmds in the future...
            default:
                cmd = "";
                path = hash.substring(1);
                break
        }
        i = path.indexOf("#");
        if (i != -1) {
            anchor = path.substring(i+1);
            path = path.substring(0,i);
        } else {
            anchor = "";
        }
        return [cmd, path, anchor];
    }

    window.addEventListener('hashchange', loadfragment, false);

    return Object.freeze({
        init,
        parsefragment,
    });
}

var Markdown = (spec)=>{
    'use strict';
    let { path, dirname } = spec || {};

    const md_ext = /[.md|.markdown|.mdown]$/;
    // This is VERY tricky, there's an alternation operator inside, ((\\\)|.)*? , that says:
    //     "capture as many chars as possible, until a parens that isn't preceeded by a backslash"
    //     It does this by stating that it wants to match "\." or ".", _in that order_.
    const md_link = /(!?)\[([^\]]*)\]\(((\\.|.)*?)\)/g;  // ![alt](src+title), possibly with back-slash escaped parens
    const md_link_srctitle = /^\s*(.*?)\s*"(.*)"\s*$/;    // foo bar/src.jpg "title"
    const asciimath_exp = /\$(.*?)\$/g;

    let raw_md = "", error_msg = "";

    let load = ()=>{
            let init = { headers: {'Cache-Control': 'max-age=0', 'Pragma': 'no-cache'} };
            return fetch(path, init).then(
                (resp) => {
                    if ( resp.ok ) {
                        return resp;
                    } else {
                        throw Error(`${path} : ${resp.statusText}`);
                    }
                },
                (resp) => {
                    console.log("Network Error", resp);
                    throw Error("Network Error");
                }
            )
    }

    // callback for marked to switch local markdown links "foobar.md" => "#!foobar.md"
    let markdown_link = (href, title, text)=>{
        if ( href.indexOf('://') == -1 && ! href.startsWith('/') ) {
            // url is local && path is relative => prepend dirname of this document
            href = `${dirname}${href}`;
            if ( md_ext.exec(href.split('#')[0].toLowerCase()) ) {
                // ends in markdown extension
                href = `#!${href}`;
            }
        }
        let h = href ? `href="${href}"` : "",
            t = title ? `title="${title}"` : "";
        return `<a ${h} ${t}>${text}</a>`;
    }

    // render the md to the main/toc elements
    let markdown_render = (md, path)=>{
        let toc = [], newtitle = false;
        let renderer = new marked.Renderer();

        // mask ASCIIMath expressions so they don't get scrambled
        let amtokens = {}
        md = md.replace(asciimath_exp, (_, exp)=>{
            let token = Math.random().toString(36).substring(2);
            amtokens[token] = exp;
            return '$' + token + '$';
        })

        // compensation: marked doesn't recognize ![label](url) when url has spaces or other unsafe chars
        //     so we encodeURI it, taking care to wrap (or preserve) the optional title in quotes
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#Description
        md = md.replace(md_link, (_, bang, alt, srctitle)=>{
            let m;
            srctitle = srctitle.replace(/\\(.)/g, '$1');
            if ((m = md_link_srctitle.exec(srctitle)) !== null) {
                srctitle = `${encodeURI(m[1])} "${m[2]}"`;
            } else {
                srctitle = encodeURI(srctitle.trim());
            }
            return `${bang}[${alt}](${srctitle})`;
        })
        renderer.link = markdown_link;

        // capture h1/h2's for inclusion in the TOC sidebar, set title to first h1
        renderer.heading = function (text, level) {
            let anchor = "";
            if (level < 3) {
                let name = slugify(text),
                    href = `#!${path}#${name}`,  // #!foobar.md#quux
                    domtext = new DOMParser().parseFromString(text, 'text/html'),
                    safetext = domtext.body.textContent || "";
                anchor = `<a name="${name}" class="anchor" href="${href}">&sect;</a>`;
                toc[toc.length] = [safetext, href];
                if (level == 1 && !newtitle) {
                    document.title = safetext;
                    newtitle = true;
                }
            }
            return `<h${level}>${text}${anchor}</h${level}>`;
        }

        // do the markdown conversion
        let mainhtml = marked(md, { renderer: renderer, smartLists: true });

        // unmask ASCIIMath expressions now that they can be safely translated (after insertion to the DOM)
        mainhtml = mainhtml.replace(asciimath_exp, (_, exp)=>{
            if ( amtokens[exp] == undefined ) {
                console.log(`ASCIIMath masking/unmasking error: unknown token ${exp}`);
                return '$' + exp + '$';
            }
            return '$' + amtokens[exp] + '$';
        })

        document.getElementById('toc').innerHTML = ""
        if (toc.length > 0) {
            let li = toc.map(([text, href]) => `<li><a href='${href}'>${text}</a></li>`);
            document.getElementById('toc').innerHTML = `<ul>${li.join('')}</ul>`;
        }

        let mainel = document.getElementById('main');
        mainel.innerHTML = mainhtml;

        // in-line script tags don't fire when assigning to innerHTML, so we clone them and re-add them
        let scripts = Array(...mainel.getElementsByTagName('script'))  // for(getElements...()) { insertNode.. } == infinite loop
        for(let el of scripts){
            let replacement = document.createElement("script");
            if (el.src != "") {
                replacement.src = el.src;
                replacement.async = false;  // why doesn't this work?!
            } else {
                let inline = document.createTextNode(el.innerText);
                replacement.appendChild(inline);
            }
            el.insertAdjacentElement('afterend', replacement);
            el.remove();
        }

        // ASCIIMath isn't discriminating about what it coverts and we'd like
        // code elements to be skipped, so we mask them momentarily
        let codecache = {}, codes = mainel.getElementsByTagName('code');
        for(let i=0; i<codes.length; i++) {
            codecache[i] = codes[i].innerHTML;
            codes[i].innerHTML = i;
        }

        // translate ASCIIMath ("$ _cos(x) $" => MathML)
        asciimath.translate()

        // unmask code elements now that the ASCIIMath tornado has passed
        for(let i=0; i<codes.length; i++) {
            codes[i].innerHTML = codecache[i];
        }
    }

    // scroll the main content section to the named anchor
    let markdown_scrollmain = (anchor)=>{
        let target = document.getElementsByName(anchor)[0];
        if ( target == undefined ) {
            document.getElementById('main').scrollTop = 0;
        } else {
            let rect = target.getBoundingClientRect();
            // 1.5 == subtract anchor's height + 50% so that it's still in the scroll area
            document.getElementById('main').scrollTop = target.offsetTop - (rect.height*1.5);
        }
    }

    // slugify anchors
    // from Matthias Hagemann: https://medium.com/@mhagemann/the-ultimate-way-to-slugify-a-url-string-in-javascript-b8e4a0d849e1
    let slugify = (string)=>{
        const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
        const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
        const p = new RegExp(a.split('').join('|'), 'g');

        return string.toString().toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with -
            .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
            .replace(/&/g, '-and-') // Replace & with 'and'
            .replace(/[^\w\-]+/g, '') // Remove all non-word characters
            .replace(/\-\-+/g, '-') // Replace multiple - with single -
            .replace(/^-+/, '') // Trim - from start of text
            .replace(/-+$/, '') // Trim - from end of text
    }

    return Object.freeze({
        load,
        markdown_link,
        markdown_render,
        markdown_scrollmain,
    });
}

window.addEventListener("load", function(e){
    window.Notes = Notes()
    window.Notes.init()
}, {'once':true});

