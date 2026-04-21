// PropertyCore Mobile — Home screen
// Greeting + hub status pill + quick scenes + area chips + device grid.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/area_icons.dart';
import '../widgets/device_tile.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _selectedAreaId;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final pc = state.colors;
    final accent = AppTheme.palette(state.accent);

    // Auto-select first area
    if (_selectedAreaId == null && state.areas.isNotEmpty) {
      _selectedAreaId = state.areas.first.id;
    }

    final areaDevices = _selectedAreaId == null
        ? <Device>[]
        : state.devices
            .where((d) => d.areaId == _selectedAreaId)
            .toList();

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // ── Greeting + status pill ────────────────────────────────────────
        SliverToBoxAdapter(
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Greeting row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _greeting(),
                              style: TextStyle(
                                  fontSize: 13, color: pc.text2),
                            ),
                            Text(
                              state.userName.isNotEmpty
                                  ? state.userName
                                  : 'Welcome',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                color: pc.text,
                                letterSpacing: -0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      _Avatar(name: state.userName, accent: accent),
                    ],
                  ),
                  const SizedBox(height: 14),
                  // Hub status pill
                  Container(
                    decoration: BoxDecoration(
                      color: pc.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: pc.border),
                    ),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    child: Row(
                      children: [
                        Icon(Icons.hub_rounded,
                            color: accent.a400, size: 22),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                state.property?.name ?? 'PropertyCore Hub',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: pc.text,
                                ),
                              ),
                              Row(
                                children: [
                                  Container(
                                    width: 7,
                                    height: 7,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: state.mqttConnected
                                          ? const Color(0xFF10b981)
                                          : const Color(0xFFf43f5e),
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    state.mqttConnected
                                        ? 'Hub online · MQTT connected'
                                        : 'Hub online · MQTT offline',
                                    style: TextStyle(
                                        fontSize: 11, color: pc.text2),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        // Refresh button
                        GestureDetector(
                          onTap: state.loading
                              ? null
                              : () => state.refreshData(),
                          child: Icon(
                            Icons.refresh_rounded,
                            size: 18,
                            color: pc.text3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // ── Quick Scenes ──────────────────────────────────────────────────
        if (state.scenes.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: _SectionHeader(
                title: 'Quick Scenes', link: 'All', pc: pc, accent: accent),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 42,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                physics: const BouncingScrollPhysics(),
                itemCount: state.scenes.length,
                itemBuilder: (ctx, i) {
                  final scene = state.scenes[i];
                  return _ScenePill(
                    scene: scene,
                    pc: pc,
                    accent: accent,
                    onTap: () async {
                      try {
                        await state.api?.executeScene(scene.id);
                      } catch (_) {}
                    },
                  );
                },
              ),
            ),
          ),
        ],

        // ── Area chips ────────────────────────────────────────────────────
        if (state.areas.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: _SectionHeader(
                title: 'Rooms', link: 'All', pc: pc, accent: accent),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 92,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                physics: const BouncingScrollPhysics(),
                itemCount: state.areas.length,
                itemBuilder: (ctx, i) {
                  final area = state.areas[i];
                  final active = area.id == _selectedAreaId;
                  return _AreaChip(
                    area: area,
                    active: active,
                    pc: pc,
                    accent: accent,
                    onTap: () =>
                        setState(() => _selectedAreaId = area.id),
                  );
                },
              ),
            ),
          ),
        ],

        // ── Device grid ───────────────────────────────────────────────────
        if (areaDevices.isNotEmpty)
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            sliver: SliverGrid(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) {
                  final d = areaDevices[i];
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
                childCount: areaDevices.length,
              ),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.05,
              ),
            ),
          )
        else if (_selectedAreaId != null && state.areas.isNotEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: Text(
                  'No devices in this room yet.\nAdd devices via the dashboard.',
                  style: TextStyle(color: pc.text2, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),

        if (state.areas.isEmpty && !state.loading)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(40),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.home_work_rounded,
                        size: 48, color: pc.text3),
                    const SizedBox(height: 16),
                    Text(
                      'No rooms configured yet.\nSet up rooms in the engineer dashboard.',
                      style: TextStyle(color: pc.text2, fontSize: 14),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),

        if (state.loading)
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator()),
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: 110)),
      ],
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  }
}

// ── Widgets ────────────────────────────────────────────────────────────────

class _Avatar extends StatelessWidget {
  final String name;
  final AccentPalette accent;

  const _Avatar({required this.name, required this.accent});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: accent.a500.withValues(alpha: 0.15),
        border: Border.all(color: accent.a500.withValues(alpha: 0.3)),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: accent.a300,
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title, link;
  final PCColors pc;
  final AccentPalette accent;

  const _SectionHeader({
    required this.title,
    required this.link,
    required this.pc,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 7),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: pc.text3,
              ),
            ),
          ),
          Text(link, style: TextStyle(fontSize: 12, color: accent.a400)),
        ],
      ),
    );
  }
}

class _ScenePill extends StatelessWidget {
  final Scene scene;
  final PCColors pc;
  final AccentPalette accent;
  final VoidCallback onTap;

  const _ScenePill({
    required this.scene,
    required this.pc,
    required this.accent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          color: pc.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: pc.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.auto_awesome_rounded,
                size: 14, color: accent.a400),
            const SizedBox(width: 6),
            Text(
              scene.name,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: pc.text2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AreaChip extends StatelessWidget {
  final Area area;
  final bool active;
  final PCColors pc;
  final AccentPalette accent;
  final VoidCallback onTap;

  const _AreaChip({
    required this.area,
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
        width: 78,
        margin: const EdgeInsets.only(right: 10),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color: active ? pc.glassActiveBg : pc.surfaceB,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: active ? pc.glassActiveBorder : pc.border,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: active
                    ? accent.a500.withValues(alpha: 0.2)
                    : pc.surfaceB,
              ),
              child: Icon(
                areaIcon(area.type),
                size: 20,
                color: active ? accent.a400 : pc.text3,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              area.name,
              style: TextStyle(
                fontSize: 10,
                color: active ? pc.text : pc.text3,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
