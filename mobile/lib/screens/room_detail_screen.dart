// PropertyCore Mobile — Room detail screen
// Shows all devices in a given area as a tile grid.

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
    final devices =
        state.devices.where((d) => d.areaId == area.id).toList();

    return Scaffold(
      backgroundColor: pc.scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_rounded,
              color: pc.text, size: 20),
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
                  Icon(Icons.devices_other_rounded,
                      size: 48, color: pc.text3),
                  const SizedBox(height: 16),
                  Text(
                    'No devices in this room yet.',
                    style: TextStyle(color: pc.text2, fontSize: 14),
                  ),
                ],
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
              physics: const BouncingScrollPhysics(),
              gridDelegate:
                  const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.05,
              ),
              itemCount: devices.length,
              itemBuilder: (ctx, i) {
                final d = devices[i];
                return DeviceTile(
                  device: d,
                  deviceState: state.deviceStates[d.id],
                  pc: pc,
                  accent: accent,
                  onToggle: (val) {
                    try {
                      state.api?.sendDeviceCommand(d.id, {'ch1': val});
                    } catch (_) {}
                  },
                );
              },
            ),
    );
  }
}
