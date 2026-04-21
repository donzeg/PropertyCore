#!/bin/sh
# PropertyCore — InfluxDB bootstrap script
# Creates the 'propertycore' database with a 90-day retention policy
# on first boot. Runs as a oneshot systemd service after influxdb.service.

set -e

INFLUX_BIN=/usr/bin/influx
DB_NAME=propertycore
RETENTION=90d
LOCK_FILE=/var/lib/influxdb/.db_initialized

# Already done on a previous boot
[ -f "$LOCK_FILE" ] && exit 0

# Wait for influxd to be ready (up to 30s)
for i in $(seq 1 30); do
    if $INFLUX_BIN -execute "SHOW DATABASES" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

$INFLUX_BIN -execute "CREATE DATABASE $DB_NAME WITH DURATION $RETENTION REPLICATION 1 NAME \"autogen\""
$INFLUX_BIN -execute "SHOW DATABASES"

touch "$LOCK_FILE"
echo "InfluxDB: database '$DB_NAME' initialized (retention=${RETENTION})"
