SUMMARY = "PropertyCore Automation Engine"
DESCRIPTION = "Core automation and scene engine for the PropertyCore Hub platform. \
Handles device state, MQTT events, WebSocket push, scene execution, if/then rules, \
and provides the HTTP API used by the mobile app and config dashboard."
HOMEPAGE = "https://github.com/donzeg/PropertyCore"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COREBASE}/meta/files/common-licenses/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = " \
    file://main.go \
    file://mqtt.go \
    file://state.go \
    file://scene.go \
    file://rule.go \
    file://api.go \
    file://ws.go \
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
    cp ${WORKDIR}/main.go  ${S}/
    cp ${WORKDIR}/mqtt.go  ${S}/
    cp ${WORKDIR}/state.go ${S}/
    cp ${WORKDIR}/scene.go ${S}/
    cp ${WORKDIR}/rule.go  ${S}/
    cp ${WORKDIR}/api.go   ${S}/
    cp ${WORKDIR}/ws.go    ${S}/
    cp ${WORKDIR}/go.mod   ${S}/
}

do_compile() {
    export GOOS="linux"
    export GOARCH="arm64"
    export CGO_ENABLED="0"
    export GOPROXY="off"
    export GONOSUMDB="*"
    export GOFLAGS="-mod=mod"
    export GOCACHE="${WORKDIR}/.gocache"

    GO_BIN="${STAGING_BINDIR_NATIVE}/go"

    mkdir -p ${WORKDIR}/bin
    cd ${S}
    ${GO_BIN} build -v -trimpath -o ${WORKDIR}/bin/propertycore-engine .
}

do_install() {
    install -d ${D}${bindir}
    install -m 0755 ${WORKDIR}/bin/propertycore-engine ${D}${bindir}/propertycore-engine

    install -d ${D}${systemd_unitdir}/system
    install -m 0644 ${WORKDIR}/propertycore-engine.service \
        ${D}${systemd_unitdir}/system/propertycore-engine.service
}

FILES:${PN} += "${systemd_unitdir}/system/propertycore-engine.service"
