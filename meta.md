## How to serve this wiki

A few options:

#### Python

A simple python one-liner that serves on all IPs (not recommended)
```bash
python -m SimpleHTTPServer [port #, defaults to 8000]
```

A less-simple python one-liner that allows you to explicitly set the port and IP
```python
python -c 'import BaseHTTPServer as bhs, SimpleHTTPServer as shs; bhs.HTTPServer(("127.0.0.1", 8000), shs.SimpleHTTPRequestHandler).serve_forever()'
```

A script that takes port and ip_addr as environment variables, run with `[port=#] [ip_addr=#.#.#.#] ./serve.py`:

```python
#!/usr/bin/env python

import BaseHTTPServer as bhs
import SimpleHTTPServer as shs
import os

port = int(os.environ['port']) if 'port' in os.environ else 8000
ip_addr = os.environ['ip_addr'] if 'ip_addr' in os.environ else '127.0.0.1'
print "Serving HTTP on %s port %s ..." % (ip_addr, port)
bhs.HTTPServer((ip_addr, port), shs.SimpleHTTPRequestHandler).serve_forever()
```

#### Go

Put in a file and run with `go run serve.go`:

```
package main

import (
    "flag"
    "fmt"
    "net/http"
)

var addr string

func init() {
    flag.StringVar(&addr, "addr", "127.0.0.1:8000", "address:port to serve on")
    flag.Parse()
}

func main() {
    fmt.Printf("Serving on http://%s\n", addr)
    http.ListenAndServe(addr, http.FileServer(http.Dir(".")))
}
```

