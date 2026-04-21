// PropertyCore Mobile — Glass morphism container widget

import 'dart:ui';
import 'package:flutter/material.dart';

/// A frosted-glass container using BackdropFilter + blur.
/// Wrap any widget in GlassBox to apply the liquid glass effect.
class GlassBox extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final Color? bgColor;
  final Color? borderColor;
  final double blur;
  final EdgeInsetsGeometry? padding;
  final BoxShadow? shadow;

  const GlassBox({
    super.key,
    required this.child,
    this.borderRadius = 20,
    this.bgColor,
    this.borderColor,
    this.blur = 28,
    this.padding,
    this.shadow,
  });

  @override
  Widget build(BuildContext context) {
    Widget inner = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: borderColor ?? const Color(0x24FFFFFF),
          width: 1,
        ),
        boxShadow: shadow != null ? [shadow!] : null,
      ),
      child: child,
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: inner,
      ),
    );
  }
}
