// PropertyCore Mobile — Model classes
// All JSON-deserialisable from the engine REST API.

class Area {
  final String id;
  final String name;
  final String type;
  final String floorId;

  const Area({
    required this.id,
    required this.name,
    required this.type,
    required this.floorId,
  });

  factory Area.fromJson(Map<String, dynamic> j) => Area(
        id: j['id'] as String? ?? '',
        name: j['name'] as String? ?? '',
        type: j['type'] as String? ?? '',
        floorId: j['floor_id'] as String? ?? '',
      );
}

class Floor {
  final String id;
  final String name;
  final int displayOrder;

  const Floor({
    required this.id,
    required this.name,
    required this.displayOrder,
  });

  factory Floor.fromJson(Map<String, dynamic> j) => Floor(
        id: j['id'] as String? ?? '',
        name: j['name'] as String? ?? '',
        displayOrder: j['display_order'] as int? ?? 0,
      );
}

class Device {
  final String id;
  final String name;
  final String type;
  final String areaId;
  final bool online;

  const Device({
    required this.id,
    required this.name,
    required this.type,
    required this.areaId,
    required this.online,
  });

  factory Device.fromJson(Map<String, dynamic> j) => Device(
        id: j['id'] as String? ?? '',
        name: j['name'] as String? ?? '',
        type: j['type'] as String? ?? '',
        areaId: j['area_id'] as String? ?? '',
        online: j['online'] as bool? ?? false,
      );

  Device copyWith({bool? online}) => Device(
        id: id,
        name: name,
        type: type,
        areaId: areaId,
        online: online ?? this.online,
      );
}

class DeviceState {
  final String id;
  final String type;
  final Map<String, dynamic> state;

  const DeviceState({
    required this.id,
    required this.type,
    required this.state,
  });

  factory DeviceState.fromJson(Map<String, dynamic> j) => DeviceState(
        id: j['id'] as String? ?? '',
        type: j['type'] as String? ?? '',
        state: (j['state'] as Map<String, dynamic>?) ?? {},
      );

  /// For relay devices, returns the state of the primary channel (ch1).
  bool get primaryState {
    if (state['ch1'] is bool) return state['ch1'] as bool;
    for (final v in state.values) {
      if (v is bool) return v;
    }
    return false;
  }

  /// Returns all boolean channel states as a map, e.g. {ch1: true, ch2: false}
  Map<String, bool> get channels {
    final result = <String, bool>{};
    for (final entry in state.entries) {
      if (entry.value is bool) result[entry.key] = entry.value as bool;
    }
    return result;
  }
}

class Scene {
  final String id;
  final String name;
  final List<Map<String, dynamic>> actions;

  const Scene({
    required this.id,
    required this.name,
    required this.actions,
  });

  factory Scene.fromJson(Map<String, dynamic> j) => Scene(
        id: j['id'] as String? ?? '',
        name: j['name'] as String? ?? '',
        actions: (j['actions'] as List<dynamic>?)
                ?.whereType<Map<String, dynamic>>()
                .toList() ??
            [],
      );
}

class PropertyInfo {
  final String name;
  final String type;
  final String timezone;

  const PropertyInfo({
    required this.name,
    required this.type,
    required this.timezone,
  });

  factory PropertyInfo.fromJson(Map<String, dynamic> j) => PropertyInfo(
        name: j['name'] as String? ?? 'My Property',
        type: j['type'] as String? ?? 'home',
        timezone: j['timezone'] as String? ?? 'UTC',
      );
}

class User {
  final String id;
  final String name;
  final String role;

  const User({
    required this.id,
    required this.name,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'] as String? ?? '',
        name: j['name'] as String? ?? '',
        role: j['role'] as String? ?? 'guest',
      );
}
