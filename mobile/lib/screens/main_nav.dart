// PropertyCore Mobile — Main navigation shell
// Floating bottom bar with 4 tabs: Home, Rooms, Scenes, More.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../theme.dart';
import '../widgets/blob_bg.dart';
import 'home_screen.dart';
import 'rooms_screen.dart';
import 'scenes_screen.dart';
import 'more_screen.dart';
import 'login_screen.dart';

class MainNav extends StatefulWidget {
  const MainNav({super.key});

  @override
  State<MainNav> createState() => _MainNavState();
}

class _MainNavState extends State<MainNav> {
  int _index = 0;

  static const _tabs = [
    (icon: Icons.home_rounded, label: 'Home'),
    (icon: Icons.grid_view_rounded, label: 'Rooms'),
    (icon: Icons.auto_awesome_rounded, label: 'Scenes'),
    (icon: Icons.tune_rounded, label: 'More'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = context.read<AppState>();
      if (!state.isLoggedIn) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      } else if (state.areas.isEmpty && !state.loading) {
        state.loadAll();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    Widget content = Scaffold(
      backgroundColor: Colors.transparent,
      extendBody: true,
      body: IndexedStack(
        index: _index,
        children: const [
          HomeScreen(),
          RoomsScreen(),
          ScenesScreen(),
          MoreScreen(),
        ],
      ),
      bottomNavigationBar: _buildNav(state),
    );

    if (state.appMode == AppMode.theme) {
      return BlobBackground(accent: state.accent, child: content);
    }

    return ColoredBox(
      color: state.colors.scaffoldBg,
      child: content,
    );
  }

  Widget _buildNav(AppState state) {
    final pc = state.colors;
    final accent = AppTheme.palette(state.accent);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            color: pc.surface,
            borderRadius: BorderRadius.circular(32),
            border: Border.all(color: pc.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: List.generate(_tabs.length, (i) {
              final active = i == _index;
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _index = i),
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.all(6),
                    decoration: active
                        ? BoxDecoration(
                            color: pc.glassActiveBg,
                            borderRadius: BorderRadius.circular(26),
                          )
                        : null,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _tabs[i].icon,
                          size: 22,
                          color: active ? accent.a400 : pc.text3,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _tabs[i].label,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.3,
                            color: active ? pc.text : pc.text3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
