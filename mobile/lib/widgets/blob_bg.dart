// PropertyCore Mobile — Animated blob background (Theme mode)
// Renders accent-coloured radial gradient blobs with a slow drift animation.

import 'package:flutter/material.dart';
import '../theme.dart';

/// Animated gradient blob background for "theme" mode.
/// Wrap the entire scaffold in this widget when appMode == AppMode.theme.
class BlobBackground extends StatefulWidget {
  final AccentColor accent;
  final Widget child;

  const BlobBackground({
    super.key,
    required this.accent,
    required this.child,
  });

  @override
  State<BlobBackground> createState() => _BlobBackgroundState();
}

class _BlobBackgroundState extends State<BlobBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 14),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = AppTheme.palette(widget.accent);
    return Stack(
      children: [
        // Deep-dark base
        const ColoredBox(color: Color(0xFF060a08), child: SizedBox.expand()),
        // Animated blobs
        AnimatedBuilder(
          animation: _ctrl,
          builder: (context, _) => CustomPaint(
            painter: _BlobPainter(p, _ctrl.value),
            size: Size.infinite,
          ),
        ),
        // App content on top
        widget.child,
      ],
    );
  }
}

class _BlobPainter extends CustomPainter {
  final AccentPalette p;
  final double t; // 0.0 → 1.0 animation progress

  _BlobPainter(this.p, this.t);

  @override
  void paint(Canvas canvas, Size size) {
    // Blob 1 — top-left, drifts right+down
    _drawBlob(
      canvas,
      center: Offset(size.width * (0.20 + t * 0.07),
          size.height * (0.18 - t * 0.05)),
      color: p.a500.withValues(alpha: 0.35),
      radius: size.width * 0.55,
      blur: 52,
    );
    // Blob 2 — top-right, subtle drift
    _drawBlob(
      canvas,
      center: Offset(size.width * (0.85 - t * 0.05),
          size.height * (0.14 + t * 0.03)),
      color: p.a600.withValues(alpha: 0.28),
      radius: size.width * 0.45,
      blur: 48,
    );
    // Blob 3 — bottom-right
    _drawBlob(
      canvas,
      center: Offset(size.width * (0.72 + t * 0.03),
          size.height * (0.80 - t * 0.04)),
      color: p.a400.withValues(alpha: 0.20),
      radius: size.width * 0.50,
      blur: 44,
    );
    // Blob 4 — bottom-left accent
    _drawBlob(
      canvas,
      center: Offset(size.width * (0.10 - t * 0.02),
          size.height * (0.85 + t * 0.03)),
      color: p.a500.withValues(alpha: 0.15),
      radius: size.width * 0.35,
      blur: 40,
    );
  }

  void _drawBlob(
    Canvas canvas, {
    required Offset center,
    required Color color,
    required double radius,
    required double blur,
  }) {
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [color, color.withValues(alpha: 0)],
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur);
    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(_BlobPainter old) =>
      old.t != t || old.p.a500 != p.a500;
}
