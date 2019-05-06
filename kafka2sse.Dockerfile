# http://whitfin.io/speeding-up-rust-docker-builds/

FROM rust as build
RUN sed -ri '/^deb/ { p; s/deb/deb-src/; }' /etc/apt/sources.list \
 && apt update && apt-get build-dep -y librdkafka && apt install -y libclang-dev \
 && rm -rf /var/lib/apt
RUN USER=root cargo new --bin kafka2sse
WORKDIR /kafka2sse
COPY ./Cargo.lock ./Cargo.toml ./
RUN cargo build --release
RUN rm src/*.rs
COPY ./src ./src
RUN cargo build --release

FROM rust
COPY --from=build /kafka2sse/target/release/kafka2sse /usr/local/bin/
ENTRYPOINT ["kafka2sse"]
