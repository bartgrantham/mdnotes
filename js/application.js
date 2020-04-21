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
    const whitespace = /\s+/g;
    const alerts = {}
    for(const word of ["warning", "achtung", "attention", "warnung", "atención", "guarda", "advertimiento", "attenzione"]){
        alerts[word] = "yellow"
    }
    for(const word of ["note", "beachte", "nota"]){
        alerts[word] = "blue"
    }
    for(const word of ["hint", "tip", "tipp", "hinweis", "suggerimento"]){
        alerts[word] = "green"
    }

    let raw_md = "", error_msg = "", scroll_tick = false;

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
        document.title = "mdnotes"  // default title, overwritten by first h1
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
        window.removeEventListener('scroll', scroll_listener)
        mainel.innerHTML = mainhtml;
        window.addEventListener('scroll', scroll_listener)

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

        // look for "alert" words in the first word of each paragraph
        for(let el of document.getElementsByTagName('P')) {
            let first = el.innerText.trim().split(whitespace)[0];
            if ( first[first.length-1] != ":" ) {
                continue
            }
            first = first.slice(0, -1).toLowerCase()
            if (alerts[first] != undefined) {
                el.classList.add('alert')
                el.classList.add(`alert-${alerts[first]}`)
            }
        }
        highlight_toc()

    }

    let scroll_listener = (e)=>{
        if ( !scroll_tick) {
            window.requestAnimationFrame(highlight_toc)
            scroll_tick = true
        }
    }

    let highlight_toc = ()=>{
        // the algorithm is:
        // * only consider anchors "above the fold",
        // * choose the closest to the "scroll position"
        // * to cover the corner case at the bottom of the document,
        //     for the last 2x screen height scale these values so that at
        //     max scroll they are equal to the full height of the document
        let toc_href_li = {}, main_a = [],
            scroll_pos = window.scrollY,
            dist_bottom = document.body.scrollHeight - window.scrollY - window.innerHeight,
            half_fold = window.scrollY + (window.innerHeight/2)  // scroll position + half window viewport height

        // are we within 2x screen height of the bottom?
        if ( (window.innerHeight*2) > dist_bottom ) {
            scroll_pos += window.innerHeight - (dist_bottom/2)
            half_fold  += (window.innerHeight - (dist_bottom/2)) / 2
        }

        // only highlight toc hrefs
        for(const a of document.getElementById('toc').getElementsByTagName("a")) {
            toc_href_li[a.href] = a //.parentElement
        }
        // only consider main anchors that are higher than halfway down the window viewport
        for(const a of document.getElementById('main').getElementsByTagName("a")) {
            if ( (toc_href_li[a.href] != undefined) && (a.offsetTop < half_fold) ) {
                main_a.push(a)
            }
        }
        if ( main_a.length == 0 ) {  return  }

        // what's the closest anchor to window.scrollY?
        main_a = main_a.sort((a,b) => {
            return Math.abs(b.offsetTop-scroll_pos) < Math.abs(a.offsetTop-scroll_pos) ? 1 : -1
        })
        // first element is the closest
        toc_href_li[main_a[0]].focus()
        scroll_tick = false
    }

    // scroll the main content section to the named anchor
    let markdown_scrollmain = (anchor)=>{
        let target = document.getElementsByName(anchor)[0];
        if ( target != undefined ) {
            window.scroll({top:target.offsetTop})
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

