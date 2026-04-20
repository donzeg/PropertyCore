# Replace the default nginx.conf shipped by meta-openembedded with a
# minimal base config that delegates all server blocks to conf.d/.
FILESEXTRAPATHS:prepend := "${THISDIR}/files:"

SRC_URI += "file://nginx.conf"

do_install:append() {
    install -m 0644 ${WORKDIR}/nginx.conf ${D}${sysconfdir}/nginx/nginx.conf
}
