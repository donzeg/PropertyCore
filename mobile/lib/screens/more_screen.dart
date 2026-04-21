// PropertyCore Mobile — More / Settings screen
// Nav items + full Appearance section (mode picker + accent colour picker).

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../theme.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final pc = state.colors;
    final accent = AppTheme.palette(state.accent);

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: Text(
                'Settings',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: pc.text,
                  letterSpacing: -0.5,
                ),
              ),
            ),
          ),
        ),

        // ── Nav items ──────────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
            child: Column(
              children: [
                _NavItem(
                  icon: Icons.color_lens_rounded,
                  label: 'Appearance',
                  active: true,
                  pc: pc,
                  accent: accent,
                ),
                _NavItem(
                  icon: Icons.hub_rounded,
                  label: 'Hub Connection',
                  pc: pc,
                  accent: accent,
                  onTap: () => _showHubSheet(context, state, pc, accent),
                ),
                _NavItem(
                  icon: Icons.info_outline_rounded,
                  label: 'About',
                  pc: pc,
                  accent: accent,
                  onTap: () => _showAboutSheet(context, pc, accent),
                ),
                _NavItem(
                  icon: Icons.logout_rounded,
                  label: 'Sign out',
                  pc: pc,
                  accent: accent,
                  onTap: () => state.logout(),
                ),
              ],
            ),
          ),
        ),

        // ── Appearance section ─────────────────────────────────────────────
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              // Background mode picker
              _Card(
                pc: pc,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _CardLabel(label: 'BACKGROUND MODE', pc: pc),
                    const SizedBox(height: 12),
                    Row(
                      children: AppMode.values.map((m) {
                        final active = state.appMode == m;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => state.setMode(m),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              margin:
                                  const EdgeInsets.symmetric(horizontal: 4),
                              padding:
                                  const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(14),
                                color: pc.surfaceB,
                                border: Border.all(
                                  color: active
                                      ? accent.a500
                                      : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                              child: Column(
                                children: [
                                  _ModePreview(mode: m, accent: accent),
                                  const SizedBox(height: 8),
                                  Text(
                                    _modeLabel(m),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color:
                                          active ? accent.a400 : pc.text2,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Accent colour picker
              _Card(
                pc: pc,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _CardLabel(label: 'ACCENT COLOUR', pc: pc),
                    const SizedBox(height: 12),
                    Row(
                      children: AccentColor.values.map((a) {
                        final selected = state.accent == a;
                        final p = AppTheme.palette(a);
                        return GestureDetector(
                          onTap: () => state.setAccent(a),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            width: 38,
                            height: 38,
                            margin: const EdgeInsets.only(right: 10),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                center: const Alignment(-0.3, -0.3),
                                colors: [p.a300, p.a600],
                              ),
                              border: Border.all(
                                color: selected
                                    ? pc.text
                                    : Colors.transparent,
                                width: 3,
                              ),
                              boxShadow: selected
                                  ? [
                                      BoxShadow(
                                        color: p.a500.withValues(alpha: 0.4),
                                        blurRadius: 8,
                                      )
                                    ]
                                  : null,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),
                    // Preview bar
                    Container(
                      height: 44,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        gradient: LinearGradient(
                          colors: [
                            accent.a300,
                            accent.a500,
                            accent.a600,
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: accent.a500.withValues(alpha: 0.35),
                            blurRadius: 12,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          _accentLabel(state.accent),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: accent.onAccent,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ]),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 110)),
      ],
    );
  }

  void _showHubSheet(
      BuildContext context, AppState state, PCColors pc, AccentPalette accent) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _BottomSheet(
        pc: pc,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hub Connection',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: pc.text,
              ),
            ),
            const SizedBox(height: 16),
            _InfoRow(label: 'Hub URL', value: state.hubIp, pc: pc),
            _InfoRow(
              label: 'Property',
              value: state.property?.name ?? '—',
              pc: pc,
            ),
            _InfoRow(
              label: 'MQTT',
              value: state.mqttConnected ? 'Connected' : 'Offline',
              pc: pc,
            ),
            _InfoRow(
              label: 'User',
              value: '${state.userName} (${state.userId})',
              pc: pc,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  state.logout();
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFf43f5e),
                  side: const BorderSide(color: Color(0xFFf43f5e)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Disconnect hub'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAboutSheet(
      BuildContext context, PCColors pc, AccentPalette accent) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _BottomSheet(
        pc: pc,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: accent.a500.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: accent.a500.withValues(alpha: 0.3)),
              ),
              child: Icon(Icons.home_filled, color: accent.a400, size: 28),
            ),
            const SizedBox(height: 12),
            Text(
              'PropertyCore',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: pc.text,
              ),
            ),
            const SizedBox(height: 4),
            Text('v1.0.0',
                style: TextStyle(fontSize: 13, color: pc.text2)),
            const SizedBox(height: 4),
            Text(
              'Smart property automation platform',
              style: TextStyle(fontSize: 13, color: pc.text3),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  static String _modeLabel(AppMode m) {
    switch (m) {
      case AppMode.dark:
        return 'Dark';
      case AppMode.light:
        return 'Light';
      case AppMode.theme:
        return 'Theme';
    }
  }

  static String _accentLabel(AccentColor a) {
    switch (a) {
      case AccentColor.emerald:
        return 'Emerald';
      case AccentColor.sapphire:
        return 'Sapphire';
      case AccentColor.amber:
        return 'Amber';
      case AccentColor.rose:
        return 'Rose';
      case AccentColor.violet:
        return 'Violet';
    }
  }
}

// ── Shared widgets ─────────────────────────────────────────────────────────

class _Card extends StatelessWidget {
  final PCColors pc;
  final Widget child;

  const _Card({required this.pc, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: pc.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: pc.border),
      ),
      padding: const EdgeInsets.all(16),
      child: child,
    );
  }
}

class _CardLabel extends StatelessWidget {
  final String label;
  final PCColors pc;

  const _CardLabel({required this.label, required this.pc});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: pc.text3,
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final PCColors pc;
  final AccentPalette accent;
  final VoidCallback? onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.pc,
    required this.accent,
    this.active = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: active ? pc.glassActiveBg : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 20,
                color: active ? accent.a400 : pc.text3),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  color: active ? accent.a400 : pc.text2,
                  fontWeight:
                      active ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ),
            if (onTap != null && !active)
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 12, color: pc.text3),
          ],
        ),
      ),
    );
  }
}

class _ModePreview extends StatelessWidget {
  final AppMode mode;
  final AccentPalette accent;

  const _ModePreview({required this.mode, required this.accent});

  @override
  Widget build(BuildContext context) {
    switch (mode) {
      case AppMode.dark:
        return Container(
          width: 52,
          height: 38,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            color: const Color(0xFF111111),
            border: Border.all(color: Colors.white12),
          ),
        );
      case AppMode.light:
        return Container(
          width: 52,
          height: 38,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            color: const Color(0xFFf8f8f6),
            border: Border.all(color: Colors.black12),
          ),
        );
      case AppMode.theme:
        return Container(
          width: 52,
          height: 38,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            gradient: RadialGradient(
              center: const Alignment(-0.3, -0.3),
              colors: [
                accent.a500,
                accent.a600,
                const Color(0xFF0d0d0d),
              ],
              stops: const [0, 0.45, 1],
            ),
            border: Border.all(color: Colors.white12),
          ),
        );
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  final PCColors pc;

  const _InfoRow({
    required this.label,
    required this.value,
    required this.pc,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: pc.text2)),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: pc.text,
              ),
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomSheet extends StatelessWidget {
  final PCColors pc;
  final Widget child;

  const _BottomSheet({required this.pc, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
      decoration: BoxDecoration(
        color: pc.scaffoldBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: pc.border),
      ),
      child: child,
    );
  }
}
