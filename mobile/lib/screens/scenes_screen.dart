// PropertyCore Mobile — Scenes screen
// Lists all scenes with execute buttons.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../theme.dart';

class ScenesScreen extends StatefulWidget {
  const ScenesScreen({super.key});

  @override
  State<ScenesScreen> createState() => _ScenesScreenState();
}

class _ScenesScreenState extends State<ScenesScreen> {
  final _executing = <String>{};

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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Scenes',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: pc.text,
                      letterSpacing: -0.5,
                    ),
                  ),
                  Text(
                    '${state.scenes.length} scene${state.scenes.length == 1 ? '' : 's'} configured',
                    style: TextStyle(fontSize: 13, color: pc.text2),
                  ),
                ],
              ),
            ),
          ),
        ),

        if (state.scenes.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(40),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.auto_awesome_rounded,
                        size: 48, color: pc.text3),
                    const SizedBox(height: 16),
                    Text(
                      'No scenes configured yet.\nCreate scenes in the engineer dashboard.',
                      style: TextStyle(color: pc.text2, fontSize: 14),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) {
                  final scene = state.scenes[i];
                  final busy = _executing.contains(scene.id);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    decoration: BoxDecoration(
                      color: pc.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: pc.border),
                    ),
                    child: Padding(
                      padding:
                          const EdgeInsets.fromLTRB(16, 14, 12, 14),
                      child: Row(
                        children: [
                          Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              color:
                                  accent.a500.withValues(alpha: 0.12),
                            ),
                            child: Icon(
                              Icons.auto_awesome_rounded,
                              size: 22,
                              color: accent.a400,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(
                                  scene.name,
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: pc.text,
                                  ),
                                ),
                                Text(
                                  '${scene.actions.length} action${scene.actions.length == 1 ? '' : 's'}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: pc.text3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Execute button
                          GestureDetector(
                            onTap: busy
                                ? null
                                : () async {
                                    setState(() =>
                                        _executing.add(scene.id));
                                    try {
                                      await state.api
                                          ?.executeScene(scene.id);
                                    } catch (_) {} finally {
                                      if (mounted) {
                                        setState(() =>
                                            _executing
                                                .remove(scene.id));
                                      }
                                    }
                                  },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: busy
                                    ? pc.surfaceB
                                    : accent.a500,
                                borderRadius:
                                    BorderRadius.circular(12),
                              ),
                              child: busy
                                  ? Padding(
                                      padding: const EdgeInsets.all(10),
                                      child:
                                          CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: accent.a300,
                                      ),
                                    )
                                  : Icon(
                                      Icons.play_arrow_rounded,
                                      color: accent.onAccent,
                                      size: 22,
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                childCount: state.scenes.length,
              ),
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: 110)),
      ],
    );
  }
}
