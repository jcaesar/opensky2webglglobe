FROM debian

RUN apt update && apt install -y curl jq kafkacat && rm -rf /var/lib/apt

ENTRYPOINT ["feed.sh"]
COPY feed.sh /usr/local/bin/
