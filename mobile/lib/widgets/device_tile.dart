// PropertyCore Mobile — Device tile widget
// Used on the Home screen (grid) and Room detail screen.

import 'package:flutter/material.dart';
import '../models.dart';
import '../theme.dart';
import 'area_icons.dart';

class DeviceTile extends StatelessWidget {
  final Device device;
  final DeviceState? deviceState;
  final PCColors pc;
  final AccentPalette accent;
  final ValueChanged<bool> onToggle;

  const DeviceTile({
    super.key,
    required this.device,
    this.deviceState,
    required this.pc,
    required this.accent,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final isOn = deviceState?.primaryState ?? false;

    return GestureDetector(
      onTap: () => onToggle(!isOn),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isOn ? pc.glassActiveBg : pc.surfaceB,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isOn ? pc.glassActiveBorder : pc.border,
          ),
        ),
        padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: isOn
                        ? accent.a500.withValues(alpha: 0.2)
                        : pc.surfaceB,
                  ),
                  child: Icon(
                    deviceIcon(device.type),
                    size: 22,
                    color: isOn ? accent.a400 : pc.text3,
                  ),
                ),
                const Spacer(),
                _Toggle(isOn: isOn, accent: accent, pc: pc),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              device.name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: pc.text,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                Text(
                  isOn ? 'On' : 'Off',
                  style: TextStyle(
                    fontSize: 11,
                    color: isOn ? accent.a400 : pc.text3,
                  ),
                ),
                if (!device.online) ...[
                  const SizedBox(width: 6),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFFf43f5e),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Toggle extends StatelessWidget {
  final bool isOn;
  final AccentPalette accent;
  final PCColors pc;

  const _Toggle({required this.isOn, required this.accent, required this.pc});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: 34,
      height: 20,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: isOn ? accent.a500 : pc.border.withValues(alpha: 0.5),
        border: isOn ? null : Border.all(color: pc.border),
      ),
      child: AnimatedAlign(
        duration: const Duration(milliseconds: 200),
        alignment: isOn ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          width: 14,
          height: 14,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
            boxShadow: [
              BoxShadow(color: Colors.black26, blurRadius: 4),
            ],
          ),
        ),
      ),
    );
  }
}
