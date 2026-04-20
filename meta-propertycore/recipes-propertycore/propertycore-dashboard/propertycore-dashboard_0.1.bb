SUMMARY = "PropertyCore config dashboard — pre-built static files"
DESCRIPTION = "Installs the pre-built Vite/React dashboard dist/ under \
/var/www/propertycore/ and drops a server block config into \
/etc/nginx/conf.d/propertycore.conf."
LICENSE = "CLOSED"
LIC_FILES_CHKSUM = ""

SRC_URI = "file://dashboard-dist.tar.gz \
           file://propertycore.conf"

# dist/ is unpacked automatically from the tarball into ${WORKDIR}
S = "${WORKDIR}"

RDEPENDS:${PN} = "nginx"

do_install() {
    # Static dashboard files
    install -d ${D}/var/www/propertycore
    cp -r ${WORKDIR}/dist/. ${D}/var/www/propertycore/

    # nginx server-block config
    install -d ${D}${sysconfdir}/nginx/conf.d
    install -m 0644 ${WORKDIR}/propertycore.conf \
        ${D}${sysconfdir}/nginx/conf.d/propertycore.conf
}

FILES:${PN} += " \
    /var/www/propertycore \
    ${sysconfdir}/nginx/conf.d/propertycore.conf \
"
