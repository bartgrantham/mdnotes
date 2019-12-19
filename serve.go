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
