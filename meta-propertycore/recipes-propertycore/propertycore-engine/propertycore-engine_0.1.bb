SUMMARY = "PropertyCore Automation Engine"
DESCRIPTION = "Core automation and scene engine for the PropertyCore Hub platform. \
Handles device state, MQTT events, scene execution, and provides the HTTP API \
(health + status) used by the mobile app and config dashboard."
HOMEPAGE = "https://github.com/donzeg/PropertyCore"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COREBASE}/meta/files/common-licenses/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = " \
    file://main.go \
    file://go.mod \
    file://propertycore-engine.service \
"

# Use the go compiler from the Yocto Go cross toolchain, but drive the build
# ourselves — go.bbclass is GOPATH-mode only and incompatible with Go 1.22+
# module mode. We use the native go-native for cross-compilation setup.
inherit systemd

DEPENDS = "go-native"

# Do not strip Go binaries — stripping corrupts them
INHIBIT_PACKAGE_STRIP = "1"
INHIBIT_SYSROOT_STRIP = "1"

# systemd
REQUIRED_DISTRO_FEATURES = "systemd"
SYSTEMD_SERVICE:${PN} = "propertycore-engine.service"
SYSTEMD_AUTO_ENABLE:${PN} = "enable"

# Staging directory for Go source
S = "${WORKDIR}/src"

do_configure() {
    # Lay out a proper Go module tree under ${WORKDIR}/src
    install -d ${S}
    cp ${WORKDIR}/main.go ${S}/
    cp ${WORKDIR}/go.mod  ${S}/
}

do_compile() {
    export GOOS="linux"
    export GOARCH="arm64"
    export CGO_ENABLED="0"
    export GOPROXY="off"
    export GONOSUMDB="*"
    export GOFLAGS="-mod=mod"
    export GOCACHE="${WORKDIR}/.gocache"

    # Use the go binary from go-native sysroot
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
