import 'package:flutter/material.dart';

import '../theme.dart';

enum MediaBrand { spotify, youtube, jellyfin, dstv }

class MediaSourceChip extends StatelessWidget {
  final MediaBrand brand;
  final PCColors pc;
  final LogoMode logoMode;
  final VoidCallback? onTap;

  const MediaSourceChip({
    super.key,
    required this.brand,
    required this.pc,
    required this.logoMode,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isBrand = logoMode == LogoMode.brand;
    final tone = _brandTone(brand, isBrand, pc);
    final label = _labelFor(brand);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: pc.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: pc.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _BrandMark(
              brand: brand,
              color: tone,
              monochrome: !isBrand,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isBrand ? tone : pc.text2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _labelFor(MediaBrand brand) {
    switch (brand) {
      case MediaBrand.spotify:
        return 'Spotify';
      case MediaBrand.youtube:
        return 'YouTube';
      case MediaBrand.jellyfin:
        return 'Jellyfin';
      case MediaBrand.dstv:
        return 'DStv';
    }
  }

  static Color _brandTone(MediaBrand brand, bool isBrand, PCColors pc) {
    if (!isBrand) return pc.text2;
    switch (brand) {
      case MediaBrand.spotify:
        return const Color(0xFF1ED760);
      case MediaBrand.youtube:
        return const Color(0xFFFF0033);
      case MediaBrand.jellyfin:
        return const Color(0xFFAA5CC3);
      case MediaBrand.dstv:
        return const Color(0xFF1F6CF0);
    }
  }
}

class _BrandMark extends StatelessWidget {
  final MediaBrand brand;
  final Color color;
  final bool monochrome;

  const _BrandMark({
    required this.brand,
    required this.color,
    required this.monochrome,
  });

  @override
  Widget build(BuildContext context) {
    switch (brand) {
      case MediaBrand.spotify:
        return SizedBox(
          width: 18,
          height: 18,
          child: CustomPaint(
            painter: _SpotifyPainter(color),
          ),
        );
      case MediaBrand.youtube:
        return Container(
          width: 20,
          height: 14,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(5),
            color: color,
          ),
          child: const Icon(
            Icons.play_arrow_rounded,
            size: 11,
            color: Colors.white,
          ),
        );
      case MediaBrand.jellyfin:
        return SizedBox(
          width: 18,
          height: 18,
          child: CustomPaint(
            painter: _JellyfinPainter(color),
          ),
        );
      case MediaBrand.dstv:
        return Container(
          width: 18,
          height: 18,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(5),
            color: monochrome
                ? color.withValues(alpha: 0.16)
                : color.withValues(alpha: 0.22),
            border: Border.all(color: color.withValues(alpha: 0.35)),
          ),
          child: Text(
            'D',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        );
    }
  }
}

class _SpotifyPainter extends CustomPainter {
  final Color color;

  const _SpotifyPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final fill = Paint()..color = color;
    canvas.drawCircle(size.center(Offset.zero), size.width / 2, fill);

    final line = Paint()
      ..color = Colors.white.withValues(alpha: 0.95)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 1.5;

    final c = size.center(Offset.zero);
    canvas.drawArc(
      Rect.fromCircle(center: Offset(c.dx, c.dy + 1.2), radius: 5.5),
      3.55,
      1.25,
      false,
      line,
    );
    canvas.drawArc(
      Rect.fromCircle(center: Offset(c.dx, c.dy + 2.4), radius: 4.4),
      3.65,
      1.10,
      false,
      line,
    );
    canvas.drawArc(
      Rect.fromCircle(center: Offset(c.dx, c.dy + 3.3), radius: 3.2),
      3.75,
      0.95,
      false,
      line,
    );
  }

  @override
  bool shouldRepaint(covariant _SpotifyPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}

class _JellyfinPainter extends CustomPainter {
  final Color color;

  const _JellyfinPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final outer = Path()
      ..moveTo(center.dx, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    final inner = Path()
      ..moveTo(center.dx, 3)
      ..lineTo(size.width - 3.2, size.height - 2.8)
      ..lineTo(3.2, size.height - 2.8)
      ..close();

    canvas.drawPath(
      outer,
      Paint()..color = color.withValues(alpha: 0.85),
    );
    canvas.drawPath(
      inner,
      Paint()..color = Colors.white.withValues(alpha: 0.9),
    );
  }

  @override
  bool shouldRepaint(covariant _JellyfinPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
