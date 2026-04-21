// PropertyCore Mobile — Hub connection setup screen
// Shown on first launch (or after hub disconnect) to enter the hub IP.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../theme.dart';
import 'main_nav.dart';

class ConnectScreen extends StatefulWidget {
  const ConnectScreen({super.key});

  @override
  State<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends State<ConnectScreen> {
  final _ctrl = TextEditingController(text: '192.168.1.');
  bool _connecting = false;
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    final ip = _ctrl.text.trim();
    if (ip.isEmpty) return;
    final state = context.read<AppState>();
    setState(() {
      _connecting = true;
      _error = null;
    });
    final ok = await state.connectToHub(ip);
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNav()),
      );
    } else {
      setState(() {
        _connecting = false;
        _error = 'Could not reach hub at "$ip".\nCheck the IP and try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final pc = state.colors;
    final accent = AppTheme.palette(state.accent);

    return Scaffold(
      backgroundColor: pc.scaffoldBg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              // Brand icon
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: accent.a500.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: accent.a500.withValues(alpha: 0.3),
                  ),
                ),
                child: Icon(Icons.home_filled, color: accent.a400, size: 28),
              ),
              const SizedBox(height: 20),
              Text(
                'PropertyCore',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  color: pc.text,
                  letterSpacing: -0.8,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Enter your hub\'s IP address to connect.',
                style: TextStyle(fontSize: 15, color: pc.text2),
              ),
              const SizedBox(height: 40),
              TextField(
                controller: _ctrl,
                keyboardType: TextInputType.url,
                textInputAction: TextInputAction.go,
                style: TextStyle(color: pc.text, fontSize: 16),
                decoration: InputDecoration(
                  labelText: 'Hub IP address',
                  hintText: '192.168.1.100',
                  labelStyle: TextStyle(color: pc.text2),
                  hintStyle: TextStyle(color: pc.text3),
                  filled: true,
                  fillColor: pc.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: pc.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: pc.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        BorderSide(color: accent.a400, width: 1.5),
                  ),
                ),
                onSubmitted: (_) => _connect(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style:
                      const TextStyle(color: Color(0xFFf43f5e), fontSize: 13),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _connecting ? null : _connect,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent.a500,
                    foregroundColor: accent.onAccent,
                    disabledBackgroundColor:
                        accent.a500.withValues(alpha: 0.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: _connecting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Connect',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
              const Spacer(flex: 2),
            ],
          ),
        ),
      ),
    );
  }
}
