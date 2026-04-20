#pragma once

#include <stdbool.h>

// Initialise relay GPIO outputs. All channels start OFF.
void relay_init(void);

// Set a relay channel ON or OFF. channel is 1-based (1..RELAY_CHANNEL_COUNT).
void relay_set(int channel, bool on);

// Get the current state of a relay channel. channel is 1-based.
bool relay_get(int channel);

// Copy all channel states into caller-supplied array (0-indexed, size RELAY_CHANNEL_COUNT).
void relay_get_all(bool states[]);

// Toggle a relay channel. channel is 1-based.
void relay_toggle(int channel);
