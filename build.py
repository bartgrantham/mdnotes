#!/usr/bin/env python

import re
import sys

# ---- It ain't easy... bein' cheesy

outfile = open('index.min.html', 'w')

css_re = r'<link href="(.*?)" rel="stylesheet">'
js_re = r'<script src="(.*?)"></script>'
js_comment_re = r'(\/\*.*?\*\/)'

for line in open('index.src.html'):
    if re.search(css_re, line) != None:
        m = re.search(css_re, line)
        css = open(m.group(1)).read()
        line = "<style>\n%s\n</style>" % (css)
    elif re.search(js_re, line) != None:
        m = re.search(js_re, line)
        js = open(m.group(1)).read()
#        js = re.sub(js_comment_re, '', js, 0, re.DOTALL)  # re.DOTALL == python2 multiline re match
        line = "<script>\n%s\n</script>" % (js)
    outfile.write(line)

sys.exit(0)
