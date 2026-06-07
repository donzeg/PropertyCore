SUMMARY = "PropertyCore Automation Engine"
DESCRIPTION = "Core automation and scene engine for the PropertyCore Hub platform. \
v0.16: Energy management — inverter config (DEYE/Growatt/Sofar/Victron), water system \
config, generator config, GET /api/v1/energy/live snapshot, GET /api/v1/energy/history \
InfluxDB proxy, GET|PATCH /api/v1/inverter|water|generator singletons."
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
    file://admin.go \
    file://api.go \
    file://ws.go \
    file://influx.go \
    file://energy.go \
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
    cp ${WORKDIR}/admin.go     ${S}/
    cp ${WORKDIR}/api.go       ${S}/
    cp ${WORKDIR}/ws.go        ${S}/
    cp ${WORKDIR}/influx.go    ${S}/
    cp ${WORKDIR}/energy.go    ${S}/
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
