SUMMARY = "PropertyCore Automation Engine"
DESCRIPTION = "Core automation and scene engine for the PropertyCore Hub platform. \
Handles device registry (persistent metadata), live device state, MQTT events, \
WebSocket push, scene execution, if/then rules, JSON persistence, areas, \
floors, property singleton, users, time-based scheduling, PIN-based \
session auth for the mobile app, and InfluxDB time-series data pipeline for \
device state history. Provides the HTTP API used by the mobile app and config dashboard."
HOMEPAGE = "https://github.com/donzeg/PropertyCore"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COREBASE}/meta/files/common-licenses/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = " \
    file://main.go \
    file://mqtt.go \
    file://state.go \
    file://device.go \
    file://scene.go \
    file://rule.go \
    file://store.go \
    file://area.go \
    file://floor.go \
    file://property.go \
    file://user.go \
    file://scheduler.go \
    file://auth.go \
    file://api.go \
    file://ws.go \
    file://influx.go \
    file://go.mod \
    file://propertycore-engine.service \
"

inherit systemd

DEPENDS = "go-native"

INHIBIT_PACKAGE_STRIP = "1"
INHIBIT_SYSROOT_STRIP = "1"

REQUIRED_DISTRO_FEATURES = "systemd"
SYSTEMD_SERVICE:${PN} = "propertycore-engine.service"
SYSTEMD_AUTO_ENABLE:${PN} = "enable"

S = "${WORKDIR}/src"

do_configure() {
    install -d ${S}
    cp ${WORKDIR}/main.go      ${S}/
    cp ${WORKDIR}/mqtt.go      ${S}/
    cp ${WORKDIR}/state.go     ${S}/
    cp ${WORKDIR}/device.go    ${S}/
    cp ${WORKDIR}/scene.go     ${S}/
    cp ${WORKDIR}/rule.go      ${S}/
    cp ${WORKDIR}/store.go     ${S}/
    cp ${WORKDIR}/area.go      ${S}/
    cp ${WORKDIR}/floor.go     ${S}/
    cp ${WORKDIR}/property.go  ${S}/
    cp ${WORKDIR}/user.go      ${S}/
    cp ${WORKDIR}/scheduler.go ${S}/
    cp ${WORKDIR}/auth.go      ${S}/
    cp ${WORKDIR}/api.go       ${S}/
    cp ${WORKDIR}/ws.go        ${S}/
    cp ${WORKDIR}/influx.go    ${S}/
    cp ${WORKDIR}/go.mod       ${S}/
}

do_compile() {
    export GOOS="linux"
    export GOARCH="arm64"
    export CGO_ENABLED="0"
    export GOPROXY="off"
    export GOFLAGS="-mod=mod"
    export GOCACHE="${WORKDIR}/go-cache"
    export HOME="${WORKDIR}"

    GO="${STAGING_BINDIR_NATIVE}/go"
    cd ${S} && ${GO} build -trimpath -o ${WORKDIR}/propertycore-engine .
}

do_install() {
    install -d ${D}${bindir}
    install -m 0755 ${WORKDIR}/propertycore-engine ${D}${bindir}/propertycore-engine

    install -d ${D}${systemd_system_unitdir}
    install -m 0644 ${WORKDIR}/propertycore-engine.service ${D}${systemd_system_unitdir}/propertycore-engine.service
}
