#!/usr/bin/env bash

set -eu -o pipefail

# Wait for topic to be created
while ! timeout -s KILL 2 kafkacat -b kafka -L |& grep -q flights; do
	sleep 1
done

echo "Polling…"

while true; do
	sleep 11 & # unauthorized access will only update every 10 seconds.
	curl -sS https://opensky-network.org/api/states/all 
	wait
done | jq --compact-output --unbuffered '
	.states |
	.[] |
	select(.[5] != null and .[6] != null) |
	{
		"oid": .[0],
		"lat": .[5],
		"lon": .[6],
		"alt": .[13],
		"lab": (.[1] | sub("[[:space:]]+$"; "")),
		"color": (if .[8] then "red" else "blue" end),
	}
' | kafkacat -b kafka -P -t flights
