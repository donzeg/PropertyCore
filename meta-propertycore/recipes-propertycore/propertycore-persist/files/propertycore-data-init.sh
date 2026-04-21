#!/bin/sh
# propertycore-data-init.sh
# Runs at early boot on a read-only rootfs.
# Mounts the writable data partition (or falls back to tmpfs in QEMU/dev)
# then bind-mounts persistent data dirs over the read-only rootfs mount points.

set -e

DATA_MOUNT="/data"

# Candidate devices for the persistent data partition.
# RPi5: SD card is mmcblk0, NVMe is nvme0n1. We use the 3rd partition for data.
# QEMU (slirp): no block devices beyond the rootfs — falls back to tmpfs.
DATA_PART_CANDIDATES="/dev/nvme0n1p3 /dev/mmcblk0p3 /dev/sda3 /dev/vdb"

mkdir -p "$DATA_MOUNT"

MOUNTED=0
for dev in $DATA_PART_CANDIDATES; do
    if [ -b "$dev" ]; then
        echo "propertycore-data-init: mounting $dev as data partition"
        mount -t ext4 -o rw,noatime,errors=remount-ro "$dev" "$DATA_MOUNT" \
            && MOUNTED=1 && break
    fi
done

if [ "$MOUNTED" = "0" ]; then
    echo "propertycore-data-init: no data partition found — using tmpfs (volatile)"
    mount -t tmpfs -o size=256m,mode=0755 tmpfs "$DATA_MOUNT"
fi

# --- propertycore engine data ---
mkdir -p "$DATA_MOUNT/propertycore"
mount --bind "$DATA_MOUNT/propertycore" /var/lib/propertycore

# --- InfluxDB data ---
mkdir -p "$DATA_MOUNT/influxdb/meta" \
         "$DATA_MOUNT/influxdb/data" \
         "$DATA_MOUNT/influxdb/wal"
chown -R influxdb:influxdb "$DATA_MOUNT/influxdb" 2>/dev/null || true
mount --bind "$DATA_MOUNT/influxdb" /var/lib/influxdb

echo "propertycore-data-init: all data mounts ready (persistent=$MOUNTED)"
