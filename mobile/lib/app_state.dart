// PropertyCore Mobile — App state (ChangeNotifier)
// Single source of truth for all app data, connection state, and preferences.

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'api.dart';
import 'models.dart';
import 'theme.dart';

class AppState extends ChangeNotifier {
  final SharedPreferences _prefs;

  static const _keyBgMode = 'pc-bg-mode';
  static const _keyBgPack = 'pc-bg-pack';
  static const _keyGlassIntensity = 'pc-glass-intensity';
  static const _keyColorIntensity = 'pc-color-intensity';
  static const _keyLogoMode = 'pc-logo-mode';

  AppState(this._prefs) {
    _hubIp = _prefs.getString('hub_ip') ?? '';
    _token = _prefs.getString('token') ?? '';
    _userId = _prefs.getString('user_id') ?? '';
    _userName = _prefs.getString('user_name') ?? '';
    final legacyMode = _prefs.getInt('app_mode');
    _appMode = _enumByName(
      AppMode.values,
      _prefs.getString(_keyBgMode),
      fallback: legacyMode != null &&
              legacyMode >= 0 &&
              legacyMode < AppMode.values.length
          ? AppMode.values[legacyMode]
          : AppMode.theme,
    );
    _accent =
        AccentColor.values[_prefs.getInt('accent') ?? AccentColor.violet.index];
    _backgroundPack = _enumByName(
      BackgroundPack.values,
      _prefs.getString(_keyBgPack),
      fallback: BackgroundPack.interior,
    );
    _glassIntensity = _enumByName(
      GlassIntensity.values,
      _prefs.getString(_keyGlassIntensity),
      fallback: GlassIntensity.medium,
    );
    _colorIntensity = _enumByName(
      ColorIntensity.values,
      _prefs.getString(_keyColorIntensity),
      fallback: ColorIntensity.balanced,
    );
    _logoMode = _enumByName(
      LogoMode.values,
      _prefs.getString(_keyLogoMode),
      fallback: LogoMode.monochrome,
    );

    if (_hubIp.isNotEmpty) {
      _api = ApiClient(_hubIp, token: _token.isNotEmpty ? _token : null);
    }
  }

  // ── Connection ────────────────────────────────────────────────────────────

  String _hubIp = '';
  String get hubIp => _hubIp;

  String _token = '';
  String get token => _token;

  String _userId = '';
  String get userId => _userId;

  String _userName = '';
  String get userName => _userName;

  bool get isLoggedIn => _token.isNotEmpty;

  ApiClient? _api;
  ApiClient? get api => _api;

  // ── Theme ─────────────────────────────────────────────────────────────────

  late AppMode _appMode;
  AppMode get appMode => _appMode;

  late AccentColor _accent;
  AccentColor get accent => _accent;

  late BackgroundPack _backgroundPack;
  BackgroundPack get backgroundPack => _backgroundPack;

  late GlassIntensity _glassIntensity;
  GlassIntensity get glassIntensity => _glassIntensity;

  late ColorIntensity _colorIntensity;
  ColorIntensity get colorIntensity => _colorIntensity;

  late LogoMode _logoMode;
  LogoMode get logoMode => _logoMode;

  PCColors get colors => PCColors(
        _appMode,
        AppTheme.palette(_accent),
        glassIntensity: _glassIntensity,
        colorIntensity: _colorIntensity,
      );

  void setMode(AppMode m) {
    _appMode = m;
    _prefs.setString(_keyBgMode, m.name);
    _prefs.setInt('app_mode', m.index);
    notifyListeners();
  }

  void setAccent(AccentColor a) {
    _accent = a;
    _prefs.setInt('accent', a.index);
    notifyListeners();
  }

  void setBackgroundPack(BackgroundPack pack) {
    _backgroundPack = pack;
    _prefs.setString(_keyBgPack, pack.name);
    notifyListeners();
  }

  void setGlassIntensity(GlassIntensity intensity) {
    _glassIntensity = intensity;
    _prefs.setString(_keyGlassIntensity, intensity.name);
    notifyListeners();
  }

  void setColorIntensity(ColorIntensity intensity) {
    _colorIntensity = intensity;
    _prefs.setString(_keyColorIntensity, intensity.name);
    notifyListeners();
  }

  void setLogoMode(LogoMode mode) {
    _logoMode = mode;
    _prefs.setString(_keyLogoMode, mode.name);
    notifyListeners();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  List<Floor> floors = [];
  List<Area> areas = [];
  List<Device> devices = [];
  List<Scene> scenes = [];
  PropertyInfo? property;
  List<User> users = [];

  final Map<String, DeviceState> deviceStates = {};

  bool loading = false;
  String? error;
  bool mqttConnected = false;

  // ── Hub connection setup ──────────────────────────────────────────────────

  Future<bool> connectToHub(String ip) async {
    final url = ip.startsWith('http') ? ip : 'http://$ip';
    final testApi = ApiClient(url);
    try {
      final status = await testApi.getStatus();
      if (status['version'] == null) return false;
      _hubIp = url;
      _api = ApiClient(url);
      await _prefs.setString('hub_ip', url);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  Future<List<User>> loadUsers() async {
    if (_api == null) return [];
    try {
      users = await _api!.getUsers();
      notifyListeners();
      return users;
    } catch (_) {
      return [];
    }
  }

  Future<bool> login(String userId, String pin) async {
    if (_api == null) return false;
    try {
      final tok = await _api!.login(userId, pin);
      _token = tok;
      _userId = userId;
      final user = users.firstWhere(
        (u) => u.id == userId,
        orElse: () => User(id: userId, name: userId, role: 'guest'),
      );
      _userName = user.name;
      _api!.token = tok;
      await _prefs.setString('token', tok);
      await _prefs.setString('user_id', userId);
      await _prefs.setString('user_name', _userName);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  void logout() {
    _token = '';
    _userId = '';
    _userName = '';
    _api?.token = null;
    _prefs.remove('token');
    _prefs.remove('user_id');
    _prefs.remove('user_name');
    _disconnectWS();
    notifyListeners();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  Future<void> loadAll() async {
    if (_api == null) return;
    loading = true;
    error = null;
    notifyListeners();

    try {
      // Fire all requests in parallel then collect
      final fFloors = _api!.getFloors();
      final fAreas = _api!.getAreas();
      final fDevices = _api!.getDevices();
      final fScenes = _api!.getScenes();
      final fProperty = _api!.getProperty();
      final fUsers = _api!.getUsers();

      floors = await fFloors;
      areas = await fAreas;
      devices = await fDevices;
      scenes = await fScenes;
      property = await fProperty;
      users = await fUsers;
      error = null;
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }

    _connectWS();
    unawaited(refreshStatus());
  }

  Future<void> refreshData() => loadAll();

  // ── WebSocket ─────────────────────────────────────────────────────────────

  WebSocketChannel? _ws;
  StreamSubscription<dynamic>? _wsSub;

  void _connectWS() {
    _disconnectWS();
    if (_api == null) return;
    try {
      _ws = _api!.connectWS();
      _wsSub = _ws!.stream.listen(
        _onWSMessage,
        onDone: () => _scheduleWSReconnect(),
        onError: (_) => _scheduleWSReconnect(),
      );
    } catch (_) {
      _scheduleWSReconnect();
    }
  }

  void _disconnectWS() {
    _wsSub?.cancel();
    _ws?.sink.close();
    _wsSub = null;
    _ws = null;
  }

  void _onWSMessage(dynamic raw) {
    try {
      final msg = jsonDecode(raw as String) as Map<String, dynamic>;
      final event = msg['event'] as String?;
      final data = msg['data'];

      if (event == 'snapshot' && data is List) {
        for (final item in data) {
          if (item is Map<String, dynamic>) {
            final ds = DeviceState.fromJson(item);
            deviceStates[ds.id] = ds;
          }
        }
        notifyListeners();
      } else if (event == 'device_state' && data is Map) {
        final ds = DeviceState.fromJson(data as Map<String, dynamic>);
        deviceStates[ds.id] = ds;

        // Mark device as online in the device list
        final idx = devices.indexWhere((d) => d.id == ds.id);
        if (idx >= 0) {
          devices[idx] = devices[idx].copyWith(online: true);
        }
        notifyListeners();
      }
    } catch (_) {
      // Malformed message — ignore
    }
  }

  void _scheduleWSReconnect() {
    Future.delayed(const Duration(seconds: 5), _connectWS);
  }

  Future<void> refreshStatus() async {
    if (_api == null) return;
    try {
      final s = await _api!.getStatus();
      mqttConnected = s['mqtt_connected'] as bool? ?? false;
      notifyListeners();
    } catch (_) {}
  }

  @override
  void dispose() {
    _disconnectWS();
    super.dispose();
  }

  static T _enumByName<T extends Enum>(
    List<T> values,
    String? raw, {
    required T fallback,
  }) {
    if (raw == null || raw.isEmpty) return fallback;
    for (final v in values) {
      if (v.name == raw) return v;
    }
    return fallback;
  }
}
