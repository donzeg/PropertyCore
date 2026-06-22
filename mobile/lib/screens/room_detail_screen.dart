// PropertyCore Mobile — Room detail screen
// Shows devices in an area with type-aware controls.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/device_tile.dart';

class RoomDetailScreen extends StatelessWidget {
  final Area area;

  const RoomDetailScreen({super.key, required this.area});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final pc = state.colors;
    final accent = AppTheme.palette(state.accent);
    final isBrandMode = state.logoMode == LogoMode.brand;
    final devices = state.devices.where((d) => d.areaId == area.id).toList();

    return Scaffold(
      backgroundColor: pc.scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_rounded,
            color: pc.text,
            size: 20,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          area.name,
          style: TextStyle(
            color: pc.text,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Text(
              '${devices.length} device${devices.length == 1 ? '' : 's'}',
              style: TextStyle(fontSize: 13, color: pc.text2),
            ),
          ),
        ],
      ),
      body: devices.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.devices_other_rounded, size: 48, color: pc.text3),
                  const SizedBox(height: 16),
                  Text(
                    'No devices in this room yet.',
                    style: TextStyle(color: pc.text2, fontSize: 14),
                  ),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
              physics: const BouncingScrollPhysics(),
              itemCount: devices.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final d = devices[i];
                final ds = state.deviceStates[d.id];

                if (d.type == 'relay') {
                  return _RelayControlCard(
                    device: d,
                    deviceState: ds,
                    pc: pc,
                    accent: accent,
                    isBrandMode: isBrandMode,
                    onSend: (payload) async {
                      try {
                        await state.api?.sendDeviceCommand(d.id, payload);
                      } catch (_) {}
                    },
                  );
                }

                if (d.type == 'ac-gateway') {
                  return _AcControlCard(
                    device: d,
                    deviceState: ds,
                    pc: pc,
                    accent: accent,
                    isBrandMode: isBrandMode,
                    onSend: (payload) async {
                      try {
                        await state.api?.sendDeviceCommand(d.id, payload);
                      } catch (_) {}
                    },
                  );
                }

                return SizedBox(
                  height: 140,
                  child: DeviceTile(
                    device: d,
                    deviceState: ds,
                    pc: pc,
                    accent: accent,
                    logoMode: state.logoMode,
                    onToggle: (val) {
                      try {
                        state.api?.sendDeviceCommand(d.id, {'ch1': val});
                      } catch (_) {}
                    },
                  ),
                );
              },
            ),
    );
  }
}

class _RelayControlCard extends StatelessWidget {
  final Device device;
  final DeviceState? deviceState;
  final PCColors pc;
  final AccentPalette accent;
  final bool isBrandMode;
  final Future<void> Function(Map<String, dynamic> payload) onSend;

  const _RelayControlCard({
    required this.device,
    required this.deviceState,
    required this.pc,
    required this.accent,
    required this.isBrandMode,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    final channels = _orderedChannels(deviceState?.channels ?? const {});
    final hasChannels = channels.isNotEmpty;
    final allOn = hasChannels && channels.every((e) => e.value);

    return Container(
      decoration: BoxDecoration(
        color: pc.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: pc.border),
      ),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: isBrandMode
                      ? accent.a500.withValues(alpha: 0.14)
                      : Colors.white.withValues(alpha: 0.08),
                ),
                child: Icon(
                  Icons.toggle_on_rounded,
                  color: isBrandMode ? accent.a400 : pc.text2,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.name,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: pc.text,
                      ),
                    ),
                    Text(
                      '${channels.length} channel${channels.length == 1 ? '' : 's'}',
                      style: TextStyle(fontSize: 11, color: pc.text3),
                    ),
                  ],
                ),
              ),
              if (!device.online)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: pc.surfaceB,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: pc.border),
                  ),
                  child: Text(
                    'Offline',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: pc.text3,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (hasChannels)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _BatchButton(
                  label: 'All On',
                  enabled: device.online,
                  active: allOn,
                  pc: pc,
                  accent: accent,
                  isBrandMode: isBrandMode,
                  onTap: () => onSend({for (final e in channels) e.key: true}),
                ),
                _BatchButton(
                  label: 'All Off',
                  enabled: device.online,
                  active: !allOn,
                  pc: pc,
                  accent: accent,
                  isBrandMode: isBrandMode,
                  onTap: () => onSend({for (final e in channels) e.key: false}),
                ),
              ],
            ),
          if (hasChannels) const SizedBox(height: 10),
          if (!hasChannels)
            Text(
              'No relay channels reported yet.',
              style: TextStyle(fontSize: 12, color: pc.text3),
            )
          else
            Column(
              children: channels.map((entry) {
                final key = entry.key;
                final value = entry.value;
                final channelNum = int.tryParse(key.replaceFirst('ch', ''));
                final label = channelNum == null
                    ? key.toUpperCase()
                    : device.relayChannelLabel(channelNum);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _RelayChannelRow(
                    label: label,
                    value: value,
                    enabled: device.online,
                    pc: pc,
                    accent: accent,
                    isBrandMode: isBrandMode,
                    onChanged: (next) => onSend({key: next}),
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  List<MapEntry<String, bool>> _orderedChannels(Map<String, bool> source) {
    final entries = source.entries.toList();
    entries.sort((a, b) {
      final ai = int.tryParse(a.key.replaceFirst('ch', ''));
      final bi = int.tryParse(b.key.replaceFirst('ch', ''));
      if (ai != null && bi != null) return ai.compareTo(bi);
      return a.key.compareTo(b.key);
    });
    return entries;
  }
}

class _RelayChannelRow extends StatelessWidget {
  final String label;
  final bool value;
  final bool enabled;
  final PCColors pc;
  final AccentPalette accent;
  final bool isBrandMode;
  final ValueChanged<bool> onChanged;

  const _RelayChannelRow({
    required this.label,
    required this.value,
    required this.enabled,
    required this.pc,
    required this.accent,
    required this.isBrandMode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: pc.surfaceB,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: pc.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: enabled ? pc.text : pc.text3,
              ),
            ),
          ),
          Text(
            value ? 'On' : 'Off',
            style: TextStyle(
              fontSize: 12,
              color: value ? (isBrandMode ? accent.a400 : pc.text2) : pc.text3,
            ),
          ),
          const SizedBox(width: 8),
          IgnorePointer(
            ignoring: !enabled,
            child: Switch.adaptive(
              value: value,
              onChanged: onChanged,
              activeThumbColor: isBrandMode ? accent.a500 : pc.text,
            ),
          ),
        ],
      ),
    );
  }
}

class _BatchButton extends StatelessWidget {
  final String label;
  final bool enabled;
  final bool active;
  final PCColors pc;
  final AccentPalette accent;
  final bool isBrandMode;
  final VoidCallback onTap;

  const _BatchButton({
    required this.label,
    required this.enabled,
    required this.active,
    required this.pc,
    required this.accent,
    required this.isBrandMode,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fg = active ? (isBrandMode ? accent.a400 : pc.text) : pc.text2;
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Opacity(
        opacity: enabled ? 1 : 0.5,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: active ? pc.glassActiveBg : pc.surfaceB,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: active ? pc.glassActiveBorder : pc.border,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
        ),
      ),
    );
  }
}

class _AcControlCard extends StatelessWidget {
  final Device device;
  final DeviceState? deviceState;
  final PCColors pc;
  final AccentPalette accent;
  final bool isBrandMode;
  final Future<void> Function(Map<String, dynamic> payload) onSend;

  const _AcControlCard({
    required this.device,
    required this.deviceState,
    required this.pc,
    required this.accent,
    required this.isBrandMode,
    required this.onSend,
  });

  static const _modes = ['cool', 'fan', 'dry', 'auto'];
  static const _fans = ['auto', 'low', 'medium', 'high'];

  @override
  Widget build(BuildContext context) {
    final online = device.online;
    final power = deviceState?.acPower ?? false;
    final mode = deviceState?.acMode ?? 'cool';
    final fan = deviceState?.acFan ?? 'auto';
    final temp = (deviceState?.acTemp ?? 22).clamp(16, 30).toDouble();

    return Container(
      decoration: BoxDecoration(
        color: pc.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: pc.border),
      ),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: power
                      ? (isBrandMode
                          ? accent.a500.withValues(alpha: 0.14)
                          : Colors.white.withValues(alpha: 0.08))
                      : pc.surfaceB,
                ),
                child: Icon(
                  Icons.ac_unit_rounded,
                  color:
                      power ? (isBrandMode ? accent.a400 : pc.text2) : pc.text3,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.name,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: pc.text,
                      ),
                    ),
                    Text(
                      online ? 'Online' : 'Offline',
                      style: TextStyle(
                        fontSize: 11,
                        color: online ? pc.text3 : const Color(0xFFf43f5e),
                      ),
                    ),
                  ],
                ),
              ),
              _PowerButton(
                online: online,
                power: power,
                pc: pc,
                accent: accent,
                isBrandMode: isBrandMode,
                onTap: () => onSend({'power': !power}),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _TempButton(
                icon: Icons.remove,
                enabled: online,
                pc: pc,
                onTap: () => onSend({'temp': (temp - 1).clamp(16, 30)}),
              ),
              Expanded(
                child: Center(
                  child: Text(
                    '${temp.toStringAsFixed(0)}°C',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: pc.text,
                    ),
                  ),
                ),
              ),
              _TempButton(
                icon: Icons.add,
                enabled: online,
                pc: pc,
                onTap: () => onSend({'temp': (temp + 1).clamp(16, 30)}),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _modes.map((m) {
              final active = mode == m;
              return _PillButton(
                label: m.toUpperCase(),
                active: active,
                enabled: online,
                pc: pc,
                accent: accent,
                isBrandMode: isBrandMode,
                onTap: () => onSend({'mode': m}),
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _fans.map((f) {
              final active = fan == f;
              return _PillButton(
                label: 'Fan ${f[0].toUpperCase()}${f.substring(1)}',
                active: active,
                enabled: online,
                pc: pc,
                accent: accent,
                isBrandMode: isBrandMode,
                onTap: () => onSend({'fan': f}),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _PowerButton extends StatelessWidget {
  final bool online;
  final bool power;
  final PCColors pc;
  final AccentPalette accent;
  final bool isBrandMode;
  final VoidCallback onTap;

  const _PowerButton({
    required this.online,
    required this.power,
    required this.pc,
    required this.accent,
    required this.isBrandMode,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: online ? onTap : null,
      child: Opacity(
        opacity: online ? 1 : 0.45,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            color: power
                ? (isBrandMode
                    ? accent.a500.withValues(alpha: 0.16)
                    : Colors.white.withValues(alpha: 0.10))
                : pc.surfaceB,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: power
                  ? (isBrandMode
                      ? accent.a500.withValues(alpha: 0.30)
                      : pc.border)
                  : pc.border,
            ),
          ),
          child: Text(
            power ? 'On' : 'Off',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: power ? (isBrandMode ? accent.a400 : pc.text) : pc.text2,
            ),
          ),
        ),
      ),
    );
  }
}

class _TempButton extends StatelessWidget {
  final IconData icon;
  final bool enabled;
  final PCColors pc;
  final VoidCallback onTap;

  const _TempButton({
    required this.icon,
    required this.enabled,
    required this.pc,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Opacity(
        opacity: enabled ? 1 : 0.45,
        child: Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: pc.surfaceB,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: pc.border),
          ),
          child: Icon(icon, size: 18, color: pc.text2),
        ),
      ),
    );
  }
}

class _PillButton extends StatelessWidget {
  final String label;
  final bool active;
  final bool enabled;
  final PCColors pc;
  final AccentPalette accent;
  final bool isBrandMode;
  final VoidCallback onTap;

  const _PillButton({
    required this.label,
    required this.active,
    required this.enabled,
    required this.pc,
    required this.accent,
    required this.isBrandMode,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fg = active ? (isBrandMode ? accent.a400 : pc.text) : pc.text2;
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Opacity(
        opacity: enabled ? 1 : 0.45,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: active ? pc.glassActiveBg : pc.surfaceB,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: active ? pc.glassActiveBorder : pc.border,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
        ),
      ),
    );
  }
}
