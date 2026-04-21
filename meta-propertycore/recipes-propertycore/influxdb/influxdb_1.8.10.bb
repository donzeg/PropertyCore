SUMMARY = "InfluxDB time-series database for PropertyCore Hub"
DESCRIPTION = "InfluxDB 1.8 — pre-built arm64 binary packaged for the PropertyCore OS image. \
Stores device state history with a 90-day retention policy in the 'propertycore' database. \
Written to by the propertycore-engine via the line protocol HTTP API on port 8086."
HOMEPAGE = "https://www.influxdata.com/products/influxdb-overview/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://LICENSE;md5=f39a8d10930fb37bd59adabb3b9d0bd6"

# Pre-built arm64 binary from influxdata.com — avoids the go-mod network build issue
# with Go 1.22+. SHA256 verified at recipe creation time.
SRC_URI = " \
    https://dl.influxdata.com/influxdb/releases/influxdb-1.8.10_linux_arm64.tar.gz;name=influxdb \
    file://influxdb.conf \
    file://influxdb.service \
    file://influxdb-init.sh \
    file://influxdb-init.service \
"

SRC_URI[influxdb.sha256sum] = "6f12dd81e5a5bed5b4fca2f43e5e5f1a38f4f7c0dafdad5f3cac77e68fc7fc23"

S = "${WORKDIR}/influxdb-1.8.10-1"

inherit systemd useradd

USERADD_PACKAGES = "${PN}"
USERADD_PARAM:${PN} = "--system --home /var/lib/influxdb --create-home --shell /bin/false --user-group influxdb"

SYSTEMD_SERVICE:${PN} = "influxdb.service influxdb-init.service"
SYSTEMD_AUTO_ENABLE:${PN} = "enable"

do_install() {
    # Binaries
    install -d ${D}${bindir}
    install -m 0755 ${S}/usr/bin/influxd ${D}${bindir}/influxd
    install -m 0755 ${S}/usr/bin/influx  ${D}${bindir}/influx

    # Config
    install -d ${D}${sysconfdir}/influxdb
    install -m 0640 ${WORKDIR}/influxdb.conf ${D}${sysconfdir}/influxdb/influxdb.conf

    # Data dirs (owned by influxdb user)
    install -d ${D}/var/lib/influxdb/meta
    install -d ${D}/var/lib/influxdb/data
    install -d ${D}/var/lib/influxdb/wal
    chown -R influxdb:influxdb ${D}/var/lib/influxdb

    # Init script
    install -d ${D}${libdir}/influxdb
    install -m 0755 ${WORKDIR}/influxdb-init.sh ${D}${libdir}/influxdb/influxdb-init.sh

    # Systemd units
    install -d ${D}${systemd_system_unitdir}
    install -m 0644 ${WORKDIR}/influxdb.service      ${D}${systemd_system_unitdir}/influxdb.service
    install -m 0644 ${WORKDIR}/influxdb-init.service ${D}${systemd_system_unitdir}/influxdb-init.service
}

FILES:${PN} += " \
    /var/lib/influxdb \
    ${libdir}/influxdb/influxdb-init.sh \
"

# Suppress QA errors for pre-built binary (already stripped)
INHIBIT_PACKAGE_STRIP = "1"
INHIBIT_SYSROOT_STRIP = "1"
INSANE_SKIP:${PN} = "already-stripped ldflags"
