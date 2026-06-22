import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme.dart';

enum BackgroundMood { home, rooms, climate, scenes, more }

class ContextualBackground extends StatefulWidget {
  final AppMode mode;
  final AccentColor accent;
  final BackgroundPack pack;
  final GlassIntensity glassIntensity;
  final ColorIntensity colorIntensity;
  final BackgroundMood mood;
  final Widget child;

  const ContextualBackground({
    super.key,
    required this.mode,
    required this.accent,
    required this.pack,
    required this.glassIntensity,
    required this.colorIntensity,
    required this.mood,
    required this.child,
  });

  @override
  State<ContextualBackground> createState() => _ContextualBackgroundState();
}

class _ContextualBackgroundState extends State<ContextualBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 18),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accent = AppTheme.palette(widget.accent);
    final pc = PCColors(
      widget.mode,
      accent,
      glassIntensity: widget.glassIntensity,
      colorIntensity: widget.colorIntensity,
    );
    final moodPreset = _presetForMood(widget.mood);
    final media = MediaQuery.maybeOf(context);
    final useStaticFallback = _shouldUseStaticFallback(
      viewport: media?.size,
      devicePixelRatio: media?.devicePixelRatio,
      disableAnimations: media?.disableAnimations,
      glassIntensity: widget.glassIntensity,
      colorIntensity: widget.colorIntensity,
    );

    if (useStaticFallback) {
      if (_ctrl.isAnimating) _ctrl.stop();
      return _StaticTextureBackdrop(
        pack: widget.pack,
        mode: widget.mode,
        accent: accent,
        moodPreset: moodPreset,
        colorIntensity: widget.colorIntensity,
        child: widget.child,
      );
    }

    if (!_ctrl.isAnimating) {
      _ctrl.repeat(reverse: true);
    }

    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        final t = _ctrl.value;
        return Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: _baseGradient(widget.pack, widget.mode),
                ),
              ),
            ),
            Positioned.fill(
              child: CustomPaint(
                painter: _AtmospherePainter(
                  pack: widget.pack,
                  accent: accent,
                  amount: _colorAmount(widget.colorIntensity),
                  moodPreset: moodPreset,
                  tick: t,
                ),
              ),
            ),
            Positioned(
              left: -30 + ((24 * moodPreset.driftX) * t),
              top: (42 + moodPreset.shiftY) - ((14 * moodPreset.driftY) * t),
              child: _BlurCard(
                width: 260,
                height: 168,
                blur: pc.bgBlur + 6,
                color: _sceneCardColor(
                  widget.pack,
                  widget.mode,
                  0.34 * moodPreset.cardAlpha,
                ),
              ),
            ),
            Positioned(
              right: -40 - ((20 * moodPreset.driftY) * t),
              top: (188 - (moodPreset.shiftY * 0.4)) +
                  ((12 * moodPreset.driftX) * t),
              child: _BlurCard(
                width: 300,
                height: 212,
                blur: pc.bgBlur + 10,
                color: _sceneCardColor(
                  widget.pack,
                  widget.mode,
                  0.28 * moodPreset.cardAlpha,
                ),
              ),
            ),
            Positioned(
              left: 24 + (8 * moodPreset.driftX * (1 - t)),
              bottom: (-18 - (moodPreset.shiftY * 0.25)) +
                  ((20 * moodPreset.driftY) * t),
              child: _BlurCard(
                width: 220,
                height: 172,
                blur: pc.bgBlur + 8,
                color: _sceneCardColor(
                  widget.pack,
                  widget.mode,
                  0.24 * moodPreset.cardAlpha,
                ),
              ),
            ),
            ImageFiltered(
              imageFilter: ImageFilter.blur(
                sigmaX: pc.bgBlur,
                sigmaY: pc.bgBlur,
              ),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: _overlayGradient(
                      widget.mode,
                      widget.colorIntensity,
                      accent,
                      moodPreset,
                    ),
                  ),
                ),
              ),
            ),
            widget.child,
          ],
        );
      },
    );
  }

  bool _shouldUseStaticFallback({
    required Size? viewport,
    required double? devicePixelRatio,
    required bool? disableAnimations,
    required GlassIntensity glassIntensity,
    required ColorIntensity colorIntensity,
  }) {
    if (disableAnimations ?? false) return true;

    final size = viewport ?? const Size(390, 844);
    final dpr = (devicePixelRatio ?? 1.0).clamp(1.0, 4.0);

    final blurMultiplier = switch (glassIntensity) {
      GlassIntensity.low => 1.0,
      GlassIntensity.medium => 1.3,
      GlassIntensity.high => 1.65,
    };

    final colorMultiplier = switch (colorIntensity) {
      ColorIntensity.subtle => 0.9,
      ColorIntensity.balanced => 1.0,
      ColorIntensity.vivid => 1.1,
    };

    final workload =
        size.width * size.height * dpr * blurMultiplier * colorMultiplier;
    return workload > 1200000;
  }

  static List<Color> _baseGradient(BackgroundPack pack, AppMode mode) {
    final isLight = mode == AppMode.light;
    switch (pack) {
      case BackgroundPack.interior:
        return isLight
            ? const [Color(0xFFF3ECE2), Color(0xFFE1D4C4), Color(0xFFCAC7C2)]
            : const [Color(0xFF1A1410), Color(0xFF272018), Color(0xFF111111)];
      case BackgroundPack.nightLuxe:
        return isLight
            ? const [Color(0xFFE6E9EF), Color(0xFFD2D8E3), Color(0xFFC2C9D7)]
            : const [Color(0xFF0A0C11), Color(0xFF111A26), Color(0xFF12101A)];
      case BackgroundPack.minimal:
        return isLight
            ? const [Color(0xFFF4F4F3), Color(0xFFE7E7E6), Color(0xFFDBDBDA)]
            : const [Color(0xFF121212), Color(0xFF161616), Color(0xFF090909)];
    }
  }

  static List<Color> _overlayGradient(
    AppMode mode,
    ColorIntensity color,
    AccentPalette accent,
    _MoodPreset moodPreset,
  ) {
    final isLight = mode == AppMode.light;
    final amount = _colorAmount(color) * moodPreset.tintBoost;
    if (isLight) {
      return [
        Colors.white.withValues(alpha: 0.14 - (amount * 0.04)),
        Color.lerp(accent.a400, moodPreset.moodTint, 0.42)!
            .withValues(alpha: amount * 0.08),
        Colors.white.withValues(alpha: 0.18 - (amount * 0.05)),
      ];
    }

    return [
      Colors.black.withValues(alpha: 0.08 - (amount * 0.02)),
      Color.lerp(accent.a500, moodPreset.moodTint, 0.5)!
          .withValues(alpha: amount * 0.12),
      Colors.black.withValues(alpha: 0.26 - (amount * 0.08)),
    ];
  }

  static double _colorAmount(ColorIntensity intensity) {
    switch (intensity) {
      case ColorIntensity.subtle:
        return 0.45;
      case ColorIntensity.balanced:
        return 0.72;
      case ColorIntensity.vivid:
        return 1.0;
    }
  }

  static Color _sceneCardColor(
      BackgroundPack pack, AppMode mode, double alpha) {
    final isLight = mode == AppMode.light;
    switch (pack) {
      case BackgroundPack.interior:
        return (isLight ? const Color(0xFFF5E7D5) : const Color(0xFF503724))
            .withValues(alpha: alpha);
      case BackgroundPack.nightLuxe:
        return (isLight ? const Color(0xFFDCE4F6) : const Color(0xFF2A3652))
            .withValues(alpha: alpha);
      case BackgroundPack.minimal:
        return (isLight ? const Color(0xFFEAEAEA) : const Color(0xFF2A2A2A))
            .withValues(alpha: alpha);
    }
  }
}

class _BlurCard extends StatelessWidget {
  final double width;
  final double height;
  final double blur;
  final Color color;

  const _BlurCard({
    required this.width,
    required this.height,
    required this.blur,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(34),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(34),
            border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
          ),
        ),
      ),
    );
  }
}

class _AtmospherePainter extends CustomPainter {
  final BackgroundPack pack;
  final AccentPalette accent;
  final double amount;
  final _MoodPreset moodPreset;
  final double tick;

  const _AtmospherePainter({
    required this.pack,
    required this.accent,
    required this.amount,
    required this.moodPreset,
    required this.tick,
  });

  @override
  void paint(Canvas canvas, Size size) {
    _paintOrb(
      canvas,
      size,
      center: Offset(
        size.width * (0.18 + (0.05 * moodPreset.driftX * tick)),
        size.height * (0.2 + (moodPreset.shiftY * 0.0008)),
      ),
      radius: size.width * 0.42,
      color: Color.lerp(accent.a400, moodPreset.moodTint, 0.28)!
          .withValues(alpha: 0.18 * amount),
    );

    _paintOrb(
      canvas,
      size,
      center: Offset(
        size.width * (0.82 - (0.03 * moodPreset.driftY * tick)),
        size.height * (0.72 - (0.06 * moodPreset.driftX * tick)),
      ),
      radius: size.width * 0.48,
      color: Color.lerp(accent.a500, moodPreset.moodTint, 0.34)!
          .withValues(alpha: 0.14 * amount),
    );

    final streakColor =
        Color.lerp(_streakColor(pack), moodPreset.moodTint, 0.24)!
            .withValues(alpha: 0.09 + (0.08 * amount));
    final path = Path()
      ..moveTo(size.width * 0.07, size.height * (0.52 + (0.03 * tick)))
      ..quadraticBezierTo(
        size.width * 0.45,
        size.height * (0.38 - (0.04 * tick)),
        size.width * 0.94,
        size.height * (0.55 + (0.02 * tick)),
      );

    canvas.drawPath(
      path,
      Paint()
        ..color = streakColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = 18
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 18),
    );
  }

  static Color _streakColor(BackgroundPack pack) {
    switch (pack) {
      case BackgroundPack.interior:
        return const Color(0xFFFFCC8A);
      case BackgroundPack.nightLuxe:
        return const Color(0xFF8AB4FF);
      case BackgroundPack.minimal:
        return const Color(0xFFCFCFCF);
    }
  }

  void _paintOrb(
    Canvas canvas,
    Size size, {
    required Offset center,
    required double radius,
    required Color color,
  }) {
    final shader = RadialGradient(
      colors: [color, color.withValues(alpha: 0)],
    ).createShader(Rect.fromCircle(center: center, radius: radius));

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..shader = shader
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 24),
    );
  }

  @override
  bool shouldRepaint(covariant _AtmospherePainter oldDelegate) {
    return oldDelegate.tick != tick ||
        oldDelegate.pack != pack ||
        oldDelegate.amount != amount ||
        oldDelegate.moodPreset != moodPreset ||
        oldDelegate.accent.a500 != accent.a500;
  }
}

class _StaticTextureBackdrop extends StatelessWidget {
  final BackgroundPack pack;
  final AppMode mode;
  final AccentPalette accent;
  final _MoodPreset moodPreset;
  final ColorIntensity colorIntensity;
  final Widget child;

  const _StaticTextureBackdrop({
    required this.pack,
    required this.mode,
    required this.accent,
    required this.moodPreset,
    required this.colorIntensity,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: _ContextualBackgroundStateAccess.baseGradient(pack, mode),
            ),
          ),
        ),
        Positioned.fill(
          child: CustomPaint(
            painter: _StaticTexturePainter(
              pack: pack,
              accent: accent,
              moodPreset: moodPreset,
              amount:
                  _ContextualBackgroundStateAccess.colorAmount(colorIntensity),
            ),
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: _ContextualBackgroundStateAccess.overlayGradient(
                mode,
                colorIntensity,
                accent,
                moodPreset,
              ),
            ),
          ),
        ),
        child,
      ],
    );
  }
}

class _StaticTexturePainter extends CustomPainter {
  final BackgroundPack pack;
  final AccentPalette accent;
  final _MoodPreset moodPreset;
  final double amount;

  const _StaticTexturePainter({
    required this.pack,
    required this.accent,
    required this.moodPreset,
    required this.amount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final stripe = Paint()
      ..color = Color.lerp(_textureBase(pack), moodPreset.moodTint, 0.2)!
          .withValues(alpha: 0.06 + (0.03 * amount))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    for (double y = -size.height; y < size.height * 2; y += 18) {
      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y + (size.width * 0.12)),
        stripe,
      );
    }

    final haze = Paint()
      ..shader = RadialGradient(
        colors: [
          accent.a400.withValues(alpha: 0.08 * amount),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(
        center: Offset(size.width * 0.18, size.height * 0.24),
        radius: size.width * 0.42,
      ));
    canvas.drawRect(Offset.zero & size, haze);
  }

  static Color _textureBase(BackgroundPack pack) {
    switch (pack) {
      case BackgroundPack.interior:
        return const Color(0xFFE0C4A3);
      case BackgroundPack.nightLuxe:
        return const Color(0xFF6A84B5);
      case BackgroundPack.minimal:
        return const Color(0xFFBDBDBD);
    }
  }

  @override
  bool shouldRepaint(covariant _StaticTexturePainter oldDelegate) {
    return oldDelegate.pack != pack ||
        oldDelegate.amount != amount ||
        oldDelegate.accent.a500 != accent.a500 ||
        oldDelegate.moodPreset != moodPreset;
  }
}

class _ContextualBackgroundStateAccess {
  static List<Color> baseGradient(BackgroundPack pack, AppMode mode) =>
      _ContextualBackgroundState._baseGradient(pack, mode);

  static List<Color> overlayGradient(
    AppMode mode,
    ColorIntensity color,
    AccentPalette accent,
    _MoodPreset moodPreset,
  ) =>
      _ContextualBackgroundState._overlayGradient(
          mode, color, accent, moodPreset);

  static double colorAmount(ColorIntensity intensity) =>
      _ContextualBackgroundState._colorAmount(intensity);
}

_MoodPreset _presetForMood(BackgroundMood mood) {
  switch (mood) {
    case BackgroundMood.home:
      return const _MoodPreset(
        moodTint: Color(0xFFBF8B4F),
        tintBoost: 0.88,
        driftX: 1.0,
        driftY: 0.85,
        shiftY: -2,
        cardAlpha: 1.05,
      );
    case BackgroundMood.rooms:
      return const _MoodPreset(
        moodTint: Color(0xFF5C89FF),
        tintBoost: 0.94,
        driftX: 0.82,
        driftY: 0.92,
        shiftY: 4,
        cardAlpha: 0.96,
      );
    case BackgroundMood.climate:
      return const _MoodPreset(
        moodTint: Color(0xFF5EC9FF),
        tintBoost: 0.98,
        driftX: 0.94,
        driftY: 1.0,
        shiftY: 1,
        cardAlpha: 0.94,
      );
    case BackgroundMood.scenes:
      return const _MoodPreset(
        moodTint: Color(0xFFC58CFF),
        tintBoost: 1.08,
        driftX: 1.08,
        driftY: 1.05,
        shiftY: -8,
        cardAlpha: 1.12,
      );
    case BackgroundMood.more:
      return const _MoodPreset(
        moodTint: Color(0xFFAFAFAF),
        tintBoost: 0.84,
        driftX: 0.72,
        driftY: 0.76,
        shiftY: 8,
        cardAlpha: 0.88,
      );
  }
}

class _MoodPreset {
  final Color moodTint;
  final double tintBoost;
  final double driftX;
  final double driftY;
  final double shiftY;
  final double cardAlpha;

  const _MoodPreset({
    required this.moodTint,
    required this.tintBoost,
    required this.driftX,
    required this.driftY,
    required this.shiftY,
    required this.cardAlpha,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is _MoodPreset &&
        other.moodTint == moodTint &&
        other.tintBoost == tintBoost &&
        other.driftX == driftX &&
        other.driftY == driftY &&
        other.shiftY == shiftY &&
        other.cardAlpha == cardAlpha;
  }

  @override
  int get hashCode => Object.hash(
        moodTint,
        tintBoost,
        driftX,
        driftY,
        shiftY,
        cardAlpha,
      );
}
