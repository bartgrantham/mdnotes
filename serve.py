#!/usr/bin/env python

import BaseHTTPServer as bhs
import SimpleHTTPServer as shs
import os

port = int(os.environ['port']) if 'port' in os.environ else 8000
ip_addr = os.environ['ip_addr'] if 'ip_addr' in os.environ else '127.0.0.1'
print "Serving HTTP on %s port %s ..." % (ip_addr, port)
bhs.HTTPServer((ip_addr, port), shs.SimpleHTTPRequestHandler).serve_forever()
