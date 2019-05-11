FROM benas/gossed as gossed

RUN cp -f $(which gossed) /gossed


FROM debian

RUN apt update && apt install -y jq kafkacat && rm -rf /var/lib/apt
COPY --from=gossed /gossed /usr/local/bin/

CMD ["bash", "-c", "while ! timeout -s KILL 2 kafkacat -b kafka -L |& grep -q flights; do sleep 1; done; kafkacat -u -q -b kafka -C -t flights | jq --compact-output --unbuffered . | gossed 2>/dev/null"]
