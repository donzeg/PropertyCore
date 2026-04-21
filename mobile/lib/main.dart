// PropertyCore Mobile — App entry point

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_state.dart';
import 'theme.dart';
import 'screens/connect_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_nav.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  // Transparent status bar for the liquid-glass look
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  final prefs = await SharedPreferences.getInstance();
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(prefs),
      child: const PropertyCoreApp(),
    ),
  );
}

class PropertyCoreApp extends StatelessWidget {
  const PropertyCoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final theme = AppTheme.buildTheme(
          mode: state.appMode,
          accent: state.accent,
        );
        return MaterialApp(
          title: 'PropertyCore',
          debugShowCheckedModeBanner: false,
          theme: theme,
          home: _initialScreen(state),
        );
      },
    );
  }

  Widget _initialScreen(AppState state) {
    if (state.hubIp.isEmpty) return const ConnectScreen();
    if (!state.isLoggedIn) return const LoginScreen();
    return const MainNav();
  }
}
