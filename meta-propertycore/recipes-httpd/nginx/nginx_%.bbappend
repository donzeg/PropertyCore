# Replace the default nginx.conf shipped by meta-openembedded with a
# minimal base config that delegates all server blocks to conf.d/.
# Also add a systemd drop-in so systemd creates /run/nginx/ before start.
FILESEXTRAPATHS:prepend := "${THISDIR}/files:"

SRC_URI += "file://nginx.conf \
            file://nginx-override.conf \
           "

do_install:append() {
    install -m 0644 ${WORKDIR}/nginx.conf ${D}${sysconfdir}/nginx/nginx.conf

    # systemd drop-in: RuntimeDirectory=nginx ensures /run/nginx/ exists at start
    install -d ${D}${systemd_system_unitdir}/nginx.service.d
    install -m 0644 ${WORKDIR}/nginx-override.conf \
        ${D}${systemd_system_unitdir}/nginx.service.d/override.conf
}

# Declare the drop-in dir so it gets packaged
FILES:${PN} += "${systemd_system_unitdir}/nginx.service.d"
