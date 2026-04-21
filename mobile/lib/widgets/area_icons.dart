// PropertyCore Mobile — Area and device icon helpers

import 'package:flutter/material.dart';

/// Returns a Material icon for a given area type string.
IconData areaIcon(String type) {
  switch (type.toLowerCase()) {
    case 'living_room':
    case 'lounge':
    case 'sitting_room':
      return Icons.weekend_rounded;
    case 'bedroom':
    case 'master_bedroom':
    case 'guest_bedroom':
      return Icons.bed_rounded;
    case 'kitchen':
      return Icons.kitchen_rounded;
    case 'dining':
    case 'dining_room':
      return Icons.restaurant_rounded;
    case 'bathroom':
    case 'toilet':
    case 'ensuite':
      return Icons.bathtub_rounded;
    case 'office':
    case 'study':
    case 'home_office':
      return Icons.computer_rounded;
    case 'garage':
      return Icons.garage_rounded;
    case 'gym':
    case 'fitness':
      return Icons.fitness_center_rounded;
    case 'outdoor':
    case 'garden':
    case 'terrace':
    case 'balcony':
    case 'porch':
      return Icons.park_rounded;
    case 'hallway':
    case 'corridor':
    case 'entrance':
      return Icons.door_front_door_rounded;
    case 'laundry':
      return Icons.local_laundry_service_rounded;
    case 'store':
    case 'storage':
      return Icons.inventory_2_rounded;
    default:
      return Icons.grid_view_rounded;
  }
}

/// Returns a Material icon for a given device type string.
IconData deviceIcon(String type) {
  switch (type.toLowerCase()) {
    case 'relay':
    case 'light':
    case 'switch':
      return Icons.lightbulb_rounded;
    case 'ac_gateway':
    case 'ac':
    case 'air_conditioner':
      return Icons.ac_unit_rounded;
    case 'sensor':
    case 'temperature':
      return Icons.sensors_rounded;
    case 'lock':
    case 'door_lock':
      return Icons.lock_rounded;
    case 'camera':
    case 'cctv':
      return Icons.videocam_rounded;
    case 'fan':
    case 'ceiling_fan':
      return Icons.air_rounded;
    case 'curtain':
    case 'blind':
    case 'shutter':
      return Icons.roller_shades_rounded;
    case 'socket':
    case 'outlet':
    case 'plug':
      return Icons.electrical_services_rounded;
    default:
      return Icons.power_rounded;
  }
}
