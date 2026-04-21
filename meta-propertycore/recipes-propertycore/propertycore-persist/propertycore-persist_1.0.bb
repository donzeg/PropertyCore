SUMMARY = "PropertyCore persistent data mount setup"
DESCRIPTION = "Provides an early-boot systemd oneshot service that mounts the writable data \
partition (or falls back to tmpfs in QEMU/dev) and bind-mounts persistent data directories \
over the read-only rootfs mount points. Must run before propertycore-engine and influxdb. \
On physical hardware (RPi5/NVMe hub), data survives reboots on the dedicated ext4 partition. \
In QEMU, tmpfs is used — data is volatile but the image boots and runs correctly."

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = " \
    file://propertycore-data-init.service \
    file://propertycore-data-init.sh \
"

S = "${WORKDIR}"

inherit systemd

SYSTEMD_SERVICE:${PN} = "propertycore-data-init.service"
SYSTEMD_AUTO_ENABLE:${PN} = "enable"

do_install() {
    # Install the init script
    install -d ${D}${libdir}/propertycore
    install -m 0755 ${WORKDIR}/propertycore-data-init.sh \
        ${D}${libdir}/propertycore/data-init.sh

    # Install the systemd unit
    install -d ${D}${systemd_system_unitdir}
    install -m 0644 ${WORKDIR}/propertycore-data-init.service \
        ${D}${systemd_system_unitdir}/propertycore-data-init.service

    # Pre-create the bind mount target directories on the read-only rootfs.
    # These are empty placeholders — the actual writable content is mounted
    # over them by propertycore-data-init.service at boot time.
    install -d ${D}/var/lib/propertycore
    install -d ${D}/var/lib/influxdb/meta
    install -d ${D}/var/lib/influxdb/data
    install -d ${D}/var/lib/influxdb/wal
}

FILES:${PN} = " \
    ${libdir}/propertycore/data-init.sh \
    ${systemd_system_unitdir}/propertycore-data-init.service \
    /var/lib/propertycore \
    /var/lib/influxdb \
    /var/lib/influxdb/meta \
    /var/lib/influxdb/data \
    /var/lib/influxdb/wal \
"

RDEPENDS:${PN} = "bash"
