// PropertyCore Mobile — Rooms screen
// Floor tabs + area list. Tap a room → Room detail screen.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/area_icons.dart';
import 'room_detail_screen.dart';

class RoomsScreen extends StatefulWidget {
  const RoomsScreen({super.key});

  @override
  State<RoomsScreen> createState() => _RoomsScreenState();
}

class _RoomsScreenState extends State<RoomsScreen> {
  String _selectedFloorId = ''; // '' = All floors

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final pc = state.colors;
    final accent = AppTheme.palette(state.accent);

    final floors = state.floors;
    final filteredAreas = _selectedFloorId.isEmpty
        ? state.areas
        : state.areas.where((a) => a.floorId == _selectedFloorId).toList();

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // ── Header ────────────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Rooms',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: pc.text,
                      letterSpacing: -0.5,
                    ),
                  ),
                  Text(
                    '${state.areas.length} room${state.areas.length == 1 ? '' : 's'}'
                    ' · ${state.devices.length} device${state.devices.length == 1 ? '' : 's'}',
                    style: TextStyle(fontSize: 13, color: pc.text2),
                  ),
                ],
              ),
            ),
          ),
        ),

        // ── Floor tabs ────────────────────────────────────────────────────
        if (floors.isNotEmpty)
          SliverToBoxAdapter(
            child: SizedBox(
              height: 46,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding:
                    const EdgeInsets.fromLTRB(20, 12, 20, 0),
                physics: const BouncingScrollPhysics(),
                children: [
                  // "All" tab
                  _FloorTab(
                    label: 'All',
                    active: _selectedFloorId.isEmpty,
                    pc: pc,
                    accent: accent,
                    onTap: () =>
                        setState(() => _selectedFloorId = ''),
                  ),
                  ...floors.map(
                    (f) => _FloorTab(
                      label: f.name,
                      active: _selectedFloorId == f.id,
                      pc: pc,
                      accent: accent,
                      onTap: () =>
                          setState(() => _selectedFloorId = f.id),
                    ),
                  ),
                ],
              ),
            ),
          ),

        // ── Room list ─────────────────────────────────────────────────────
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) {
                final area = filteredAreas[i];
                final deviceCount =
                    state.devices.where((d) => d.areaId == area.id).length;
                final onlineCount = state.devices
                    .where((d) => d.areaId == area.id && d.online)
                    .length;
                return _RoomRow(
                  area: area,
                  deviceCount: deviceCount,
                  onlineCount: onlineCount,
                  pc: pc,
                  accent: accent,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => RoomDetailScreen(area: area),
                    ),
                  ),
                );
              },
              childCount: filteredAreas.length,
            ),
          ),
        ),

        if (filteredAreas.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(40),
              child: Center(
                child: Text(
                  'No rooms yet.\nCreate rooms in the engineer dashboard.',
                  style: TextStyle(color: pc.text2, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: 110)),
      ],
    );
  }
}

class _FloorTab extends StatelessWidget {
  final String label;
  final bool active;
  final PCColors pc;
  final AccentPalette accent;
  final VoidCallback onTap;

  const _FloorTab({
    required this.label,
    required this.active,
    required this.pc,
    required this.accent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: active ? pc.glassActiveBg : Colors.transparent,
          borderRadius: BorderRadius.circular(22),
          border: active ? Border.all(color: pc.glassActiveBorder) : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: active ? accent.a400 : pc.text3,
          ),
        ),
      ),
    );
  }
}

class _RoomRow extends StatelessWidget {
  final Area area;
  final int deviceCount;
  final int onlineCount;
  final PCColors pc;
  final AccentPalette accent;
  final VoidCallback onTap;

  const _RoomRow({
    required this.area,
    required this.deviceCount,
    required this.onlineCount,
    required this.pc,
    required this.accent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: pc.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: pc.border),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: pc.surfaceB,
              ),
              child: Icon(areaIcon(area.type), size: 24, color: pc.text2),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    area.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: pc.text,
                    ),
                  ),
                  Text(
                    '$deviceCount device${deviceCount == 1 ? '' : 's'}',
                    style: TextStyle(fontSize: 11, color: pc.text3),
                  ),
                ],
              ),
            ),
            if (onlineCount > 0)
              _Badge(
                label: '$onlineCount on',
                color: accent.a400,
                bg: accent.a500.withValues(alpha: 0.12),
                border: accent.a500.withValues(alpha: 0.25),
              )
            else if (deviceCount > 0)
              _Badge(
                label: 'offline',
                color: pc.text3,
                bg: pc.surfaceB,
                border: pc.border,
              ),
            const SizedBox(width: 8),
            Icon(Icons.arrow_forward_ios_rounded,
                size: 14, color: pc.text3),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color, bg, border;

  const _Badge({
    required this.label,
    required this.color,
    required this.bg,
    required this.border,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
