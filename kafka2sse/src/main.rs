extern crate hyper_sse;
#[macro_use] extern crate lazy_static;

use hyper_sse::Server;
use std::io::BufRead;

lazy_static! {
    static ref SSE: Server<u8> = Server::new();
}

fn main() {
    SSE.spawn("[::1]:3000".parse().unwrap());

    // Use SSE.generate_auth_token(_) to generate auth tokens

    let stdin = std::io::stdin();
    for line in stdin.lock().lines() {
        let line = line.unwrap();

        SSE.push(0, "update", &line).ok();
    }
}
