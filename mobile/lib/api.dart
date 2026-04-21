// PropertyCore Mobile — API client
// Wraps all HTTP + WebSocket calls to the engine at http://[hub-ip]

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'models.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;

  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl; // e.g. "http://192.168.1.100"
  String? token;

  ApiClient(this.baseUrl, {this.token});

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null && token!.isNotEmpty)
          'Authorization': 'Bearer $token',
      };

  Future<dynamic> _get(String path) async {
    final resp = await http
        .get(_uri(path), headers: _headers)
        .timeout(const Duration(seconds: 10));
    if (resp.statusCode == 401) throw const ApiException(401, 'Unauthorized');
    if (resp.statusCode != 200) {
      throw ApiException(resp.statusCode, resp.body);
    }
    return jsonDecode(resp.body);
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final resp = await http
        .post(_uri(path), headers: _headers, body: jsonEncode(body))
        .timeout(const Duration(seconds: 10));
    if (resp.statusCode == 401) throw const ApiException(401, 'Unauthorized');
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw ApiException(resp.statusCode, resp.body);
    }
    return jsonDecode(resp.body);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  Future<String> login(String userId, String pin) async {
    final data =
        await _post('/api/v1/auth/login', {'user_id': userId, 'pin': pin})
            as Map<String, dynamic>;
    return data['token'] as String;
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  Future<List<User>> getUsers() async {
    final data = await _get('/api/v1/users') as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(User.fromJson)
        .toList();
  }

  // ── Floors ────────────────────────────────────────────────────────────────

  Future<List<Floor>> getFloors() async {
    final data = await _get('/api/v1/floors') as List<dynamic>;
    final floors = data
        .whereType<Map<String, dynamic>>()
        .map(Floor.fromJson)
        .toList();
    floors.sort((a, b) => a.displayOrder.compareTo(b.displayOrder));
    return floors;
  }

  // ── Areas ─────────────────────────────────────────────────────────────────

  Future<List<Area>> getAreas() async {
    final data = await _get('/api/v1/areas') as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Area.fromJson)
        .toList();
  }

  // ── Devices ───────────────────────────────────────────────────────────────

  Future<List<Device>> getDevices() async {
    final data = await _get('/api/v1/devices') as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Device.fromJson)
        .toList();
  }

  Future<void> sendDeviceCommand(
      String deviceId, Map<String, dynamic> cmd) async {
    await _post('/api/v1/devices/$deviceId/cmd', cmd);
  }

  // ── Scenes ────────────────────────────────────────────────────────────────

  Future<List<Scene>> getScenes() async {
    final data = await _get('/api/v1/scenes') as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Scene.fromJson)
        .toList();
  }

  Future<void> executeScene(String sceneId) async {
    await _post('/api/v1/scenes/$sceneId/execute', {});
  }

  // ── Property ──────────────────────────────────────────────────────────────

  Future<PropertyInfo> getProperty() async {
    final data = await _get('/api/v1/property') as Map<String, dynamic>;
    return PropertyInfo.fromJson(data);
  }

  // ── Status ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getStatus() async {
    return await _get('/status') as Map<String, dynamic>;
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────

  WebSocketChannel connectWS() {
    final wsUrl = '${baseUrl.replaceFirst(RegExp(r'^http'), 'ws')}/ws';
    return WebSocketChannel.connect(Uri.parse(wsUrl));
  }
}
