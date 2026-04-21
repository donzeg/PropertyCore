// PropertyCore Mobile — Login screen
// Lists users fetched from the engine, then shows a PIN pad for the selected user.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../app_state.dart';
import '../models.dart';
import '../theme.dart';
import 'main_nav.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  User? _selectedUser;
  String _pin = '';
  bool _loginLoading = false;
  bool _usersLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    final state = context.read<AppState>();
    await state.loadUsers();
    if (mounted) setState(() => _usersLoading = false);
  }

  void _onDigit(String d) {
    if (_pin.length >= 6) return;
    setState(() {
      _pin += d;
      _error = null;
    });
  }

  void _onDelete() {
    if (_pin.isEmpty) return;
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  Future<void> _login() async {
    if (_selectedUser == null || _pin.isEmpty) return;
    setState(() {
      _loginLoading = true;
      _error = null;
    });
    final state = context.read<AppState>();
    final ok = await state.login(_selectedUser!.id, _pin);
    if (!mounted) return;
    if (ok) {
      await state.loadAll();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNav()),
      );
    } else {
      setState(() {
        _loginLoading = false;
        _error = 'Incorrect PIN. Try again.';
        _pin = '';
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
            children: [
              const Spacer(),
              if (_selectedUser == null)
                _UserList(
                  users: state.users,
                  loading: _usersLoading,
                  pc: pc,
                  accent: accent,
                  onSelect: (u) => setState(() {
                    _selectedUser = u;
                    _pin = '';
                    _error = null;
                  }),
                )
              else
                _PinEntry(
                  user: _selectedUser!,
                  pin: _pin,
                  error: _error,
                  loading: _loginLoading,
                  pc: pc,
                  accent: accent,
                  onBack: () => setState(() {
                    _selectedUser = null;
                    _pin = '';
                    _error = null;
                  }),
                  onDigit: _onDigit,
                  onDelete: _onDelete,
                  onSubmit: _pin.length >= 4 ? _login : null,
                ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

// ── User list ──────────────────────────────────────────────────────────────

class _UserList extends StatelessWidget {
  final List<User> users;
  final bool loading;
  final PCColors pc;
  final AccentPalette accent;
  final ValueChanged<User> onSelect;

  const _UserList({
    required this.users,
    required this.loading,
    required this.pc,
    required this.accent,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Who\'s using PropertyCore?',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: pc.text,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Select your account to continue.',
          style: TextStyle(fontSize: 14, color: pc.text2),
        ),
        const SizedBox(height: 32),
        if (loading)
          const Center(child: CircularProgressIndicator())
        else if (users.isEmpty)
          Text(
            'No users found.\nCreate users in the dashboard first.',
            style: TextStyle(color: pc.text2, fontSize: 14),
            textAlign: TextAlign.center,
          )
        else
          ...users.map(
            (u) => _UserTile(
              user: u,
              pc: pc,
              accent: accent,
              onTap: () => onSelect(u),
            ),
          ),
      ],
    );
  }
}

class _UserTile extends StatelessWidget {
  final User user;
  final PCColors pc;
  final AccentPalette accent;
  final VoidCallback onTap;

  const _UserTile({
    required this.user,
    required this.pc,
    required this.accent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: pc.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: pc.border),
        ),
        child: Row(
          children: [
            _UserAvatar(name: user.name, accent: accent),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: pc.text,
                    ),
                  ),
                  Text(
                    user.role,
                    style: TextStyle(fontSize: 12, color: pc.text2),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios_rounded, size: 14, color: pc.text3),
          ],
        ),
      ),
    );
  }
}

// ── PIN entry ──────────────────────────────────────────────────────────────

class _PinEntry extends StatelessWidget {
  final User user;
  final String pin;
  final String? error;
  final bool loading;
  final PCColors pc;
  final AccentPalette accent;
  final VoidCallback onBack;
  final ValueChanged<String> onDigit;
  final VoidCallback onDelete;
  final VoidCallback? onSubmit;

  const _PinEntry({
    required this.user,
    required this.pin,
    required this.error,
    required this.loading,
    required this.pc,
    required this.accent,
    required this.onBack,
    required this.onDigit,
    required this.onDelete,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Back button
        Align(
          alignment: Alignment.centerLeft,
          child: GestureDetector(
            onTap: onBack,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.arrow_back_ios_rounded,
                    size: 14, color: accent.a400),
                const SizedBox(width: 4),
                Text('Back',
                    style: TextStyle(color: accent.a400, fontSize: 14)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        // User avatar
        _UserAvatar(name: user.name, accent: accent, size: 64, fontSize: 26),
        const SizedBox(height: 12),
        Text(
          user.name,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: pc.text,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          user.role,
          style: TextStyle(fontSize: 13, color: pc.text2),
        ),
        const SizedBox(height: 32),
        // PIN dots
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(6, (i) {
            final filled = i < pin.length;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.symmetric(horizontal: 6),
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: filled ? accent.a400 : Colors.transparent,
                border: Border.all(
                  color: filled ? accent.a400 : pc.text3,
                ),
              ),
            );
          }),
        ),
        if (error != null) ...[
          const SizedBox(height: 12),
          Text(
            error!,
            style: const TextStyle(color: Color(0xFFf43f5e), fontSize: 13),
          ),
        ],
        const SizedBox(height: 32),
        // PIN pad
        _PinPad(
          onDigit: onDigit,
          onDelete: onDelete,
          onSubmit: onSubmit,
          loading: loading,
          accent: accent,
          pc: pc,
        ),
      ],
    );
  }
}

class _PinPad extends StatelessWidget {
  final ValueChanged<String> onDigit;
  final VoidCallback onDelete;
  final VoidCallback? onSubmit;
  final bool loading;
  final AccentPalette accent;
  final PCColors pc;

  const _PinPad({
    required this.onDigit,
    required this.onDelete,
    required this.onSubmit,
    required this.loading,
    required this.accent,
    required this.pc,
  });

  @override
  Widget build(BuildContext context) {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['submit', '0', 'del'],
    ];

    return Column(
      children: rows.map((row) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: row.map((k) => _PadKey(
                label: k,
                accent: accent,
                pc: pc,
                loading: loading,
                onDigit: onDigit,
                onDelete: onDelete,
                onSubmit: onSubmit,
              )).toList(),
        );
      }).toList(),
    );
  }
}

class _PadKey extends StatelessWidget {
  final String label;
  final AccentPalette accent;
  final PCColors pc;
  final bool loading;
  final ValueChanged<String> onDigit;
  final VoidCallback onDelete;
  final VoidCallback? onSubmit;

  const _PadKey({
    required this.label,
    required this.accent,
    required this.pc,
    required this.loading,
    required this.onDigit,
    required this.onDelete,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final isSubmit = label == 'submit';
    final isDel = label == 'del';
    final isEmpty = isSubmit && onSubmit == null;

    return GestureDetector(
      onTap: isSubmit
          ? (isEmpty ? null : onSubmit)
          : isDel
              ? onDelete
              : () => onDigit(label),
      child: Container(
        width: 72,
        height: 72,
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isSubmit
              ? (isEmpty
                  ? Colors.transparent
                  : accent.a500.withValues(alpha: 0.2))
              : isDel
                  ? Colors.transparent
                  : pc.surface,
          border: (!isSubmit && !isDel)
              ? Border.all(color: pc.border)
              : null,
        ),
        child: Center(
          child: isSubmit
              ? (isEmpty
                  ? const SizedBox()
                  : loading
                      ? SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: accent.a400,
                          ),
                        )
                      : Icon(Icons.arrow_forward_rounded,
                          color: accent.a400, size: 24))
              : isDel
                  ? Icon(Icons.backspace_outlined,
                      color: pc.text2, size: 22)
                  : Text(
                      label,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w500,
                        color: pc.text,
                      ),
                    ),
        ),
      ),
    );
  }
}

// ── Shared user avatar ─────────────────────────────────────────────────────

class _UserAvatar extends StatelessWidget {
  final String name;
  final AccentPalette accent;
  final double size;
  final double fontSize;

  const _UserAvatar({
    required this.name,
    required this.accent,
    this.size = 44,
    this.fontSize = 18,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: accent.a500.withValues(alpha: 0.15),
        border: Border.all(color: accent.a500.withValues(alpha: 0.3)),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.w700,
            color: accent.a300,
          ),
        ),
      ),
    );
  }
}
