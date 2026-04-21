SUMMARY = "PropertyCore OS base image"
DESCRIPTION = "Minimal bootable image for PropertyCore Hub HC-1 (Raspberry Pi 5). \
Includes SSH access, MQTT broker, systemd, and the foundation for all \
PropertyCore platform services."

# Inherit the standard image class
inherit core-image

# Start from the minimal image feature set
# read-only-rootfs: sets rootfs to ro at build time. Writable data lives on
# the data partition (/data) and is bind-mounted at boot by propertycore-persist.
IMAGE_FEATURES += " \
    ssh-server-openssh \
    package-management \
    read-only-rootfs \
"

# Core packages always present on every PropertyCore hub
IMAGE_INSTALL = " \
    packagegroup-core-boot \
    packagegroup-base-extended \
    \
    kernel-modules \
    \
    openssh-sftp-server \
    \
    mosquitto \
    mosquitto-clients \
    \
    nginx \
    propertycore-dashboard \
    \
    propertycore-engine \
    \
    influxdb \
    \
    propertycore-persist \
    \
    i2c-tools \
    \
    util-linux \
    procps \
    htop \
    vim-tiny \
    \
    bash \
    \
    usbutils \
    \
    tzdata \
    \
"

# Image size — rootfs partition (ext3), in KB. 512MB.
IMAGE_ROOTFS_SIZE ?= "524288"
IMAGE_ROOTFS_EXTRA_SPACE:append = " + 65536"
