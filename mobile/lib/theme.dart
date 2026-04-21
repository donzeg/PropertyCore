// PropertyCore Mobile — Theme system
// 3 background modes × 5 accent colours = 15 visual combinations.
// Default: Theme mode + Emerald accent (flagship look, matches dashboard).

import 'package:flutter/material.dart';

enum AppMode { dark, light, theme }

enum AccentColor { emerald, sapphire, amber, rose, violet }

class AccentPalette {
  final Color a300, a400, a500, a600, onAccent;

  const AccentPalette({
    required this.a300,
    required this.a400,
    required this.a500,
    required this.a600,
    required this.onAccent,
  });
}

class AppTheme {
  static const Map<AccentColor, AccentPalette> palettes = {
    AccentColor.emerald: AccentPalette(
      a300: Color(0xFF6ee7b7),
      a400: Color(0xFF34d399),
      a500: Color(0xFF10b981),
      a600: Color(0xFF059669),
      onAccent: Color(0xFF052e16),
    ),
    AccentColor.sapphire: AccentPalette(
      a300: Color(0xFF93c5fd),
      a400: Color(0xFF60a5fa),
      a500: Color(0xFF3b82f6),
      a600: Color(0xFF2563eb),
      onAccent: Color(0xFFeff6ff),
    ),
    AccentColor.amber: AccentPalette(
      a300: Color(0xFFfde68a),
      a400: Color(0xFFfbbf24),
      a500: Color(0xFFf59e0b),
      a600: Color(0xFFd97706),
      onAccent: Color(0xFF451a03),
    ),
    AccentColor.rose: AccentPalette(
      a300: Color(0xFFfda4af),
      a400: Color(0xFFfb7185),
      a500: Color(0xFFf43f5e),
      a600: Color(0xFFe11d48),
      onAccent: Color(0xFFfff1f2),
    ),
    AccentColor.violet: AccentPalette(
      a300: Color(0xFFc4b5fd),
      a400: Color(0xFFa78bfa),
      a500: Color(0xFF8b5cf6),
      a600: Color(0xFF7c3aed),
      onAccent: Color(0xFFf5f3ff),
    ),
  };

  static AccentPalette palette(AccentColor accent) => palettes[accent]!;

  static ThemeData buildTheme({
    required AppMode mode,
    required AccentColor accent,
  }) {
    final p = palette(accent);
    final isDark = mode != AppMode.light;

    final colorScheme = isDark
        ? ColorScheme.dark(
            primary: p.a400,
            secondary: p.a300,
            tertiary: p.a500,
            surface: const Color(0xFF111111),
            onPrimary: p.onAccent,
            onSecondary: p.onAccent,
          )
        : ColorScheme.light(
            primary: p.a500,
            secondary: p.a400,
            tertiary: p.a600,
            surface: Colors.white,
            onPrimary: p.onAccent,
            onSecondary: p.onAccent,
          );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor:
          isDark ? const Color(0xFF0d0d0d) : const Color(0xFFf8f8f6),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: isDark ? Colors.white : Colors.black,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
    );
  }
}

/// Surface and text colours derived from the current mode + accent.
/// Use this instead of hardcoding colours in widgets.
class PCColors {
  final AppMode mode;
  final AccentPalette accent;

  const PCColors(this.mode, this.accent);

  bool get isDark => mode != AppMode.light;

  Color get scaffoldBg =>
      isDark ? const Color(0xFF0d0d0d) : const Color(0xFFf8f8f6);

  // Glass surfaces
  Color get surface =>
      isDark ? const Color(0x12FFFFFF) : const Color(0xB8FFFFFF);
  Color get surfaceB =>
      isDark ? const Color(0x0AFFFFFF) : const Color(0x80FFFFFF);

  Color get border =>
      isDark ? const Color(0x24FFFFFF) : const Color(0x1A000000);
  Color get rim =>
      isDark ? const Color(0x33FFFFFF) : const Color(0xE5FFFFFF);

  Color get text => isDark ? Colors.white : const Color(0xFF111111);
  Color get text2 =>
      isDark ? const Color(0x73FFFFFF) : const Color(0x73000000);
  Color get text3 =>
      isDark ? const Color(0x47FFFFFF) : const Color(0x4D000000);

  Color get glassActiveBg => accent.a500.withValues(alpha: isDark ? 0.15 : 0.1);
  Color get glassActiveBorder =>
      accent.a500.withValues(alpha: isDark ? 0.30 : 0.2);

  Color get error => const Color(0xFFf43f5e);
  Color get success => const Color(0xFF10b981);
}
