/**
 * Définition de tous les blocs Blockly organisés par catégorie.
 * Basé sur les fichiers toolbox_*.json et ai-blocks.js.
 */
export const BLOCKS_BY_CATEGORY: Record<string, { name: string; blocks: string[] }> = {
  LOGIC: {
    name: 'Logique',
    blocks: [
      'controls_if',
      'logic_compare',
      'logic_operation',
      'logic_negate',
      'logic_boolean',
      'logic_null',
      'logic_ternary',
      'controls_switch',
    ],
  },
  LOOPS: {
    name: 'Boucles',
    blocks: [
      'controls_repeat_ext',
      'controls_repeat',
      'controls_whileUntil',
      'controls_for',
      'controls_forEach',
      'controls_flow_statements',
    ],
  },
  MATH: {
    name: 'Math',
    blocks: [
      'math_number',
      'math_arithmetic',
      'math_single',
      'math_trig',
      'math_constant',
      'math_number_property',
      'math_round',
      'math_on_list',
      'math_modulo',
      'math_constrain',
      'math_random_int',
    ],
  },
  TEXT: {
    name: 'Texte',
    blocks: [
      'text',
      'text_join',
      'text_append',
      'text_length',
      'text_isEmpty',
      'text_indexOf',
      'text_charAt',
      'text_getSubstring',
      'text_changeCase',
      'text_trim',
      'text_count',
      'text_replace',
      'text_print',
      'text_prompt_ext',
    ],
  },
  LIST: {
    name: 'Listes',
    blocks: [
      'lists_create_with',
      'lists_repeat',
      'lists_length',
      'lists_isEmpty',
      'lists_indexOf',
      'lists_getIndex',
      'lists_setIndex',
      'lists_getSublist',
      'lists_split',
      'lists_sort',
      'lists_reverse',
    ],
  },
  COLOUR: {
    name: 'Couleur',
    blocks: [
      'colour_picker',
      'colour_random',
      'colour_rgb',
      'colour_blend',
    ],
  },
  VARIABLES: {
    name: 'Variables',
    blocks: [],
  },
  FUNCTIONS: {
    name: 'Fonctions',
    blocks: [],
  },
  BOARD: {
    name: 'Carte',
    blocks: [
      'board_base_inout_buildin_led',
      'board_base_inout_digital_write',
      'board_base_inout_digital_read',
      'board_base_inout_highlow',
      'board_base_inout_analog_write',
      'board_base_inout_analog_read',
      'board_base_delay',
      'board_base_angle',
      'board_base_map',
      'board_base_inout_tone',
      'board_base_inout_notone',
      'board_serial_init',
      'board_serial_printfor',
      'board_serial_print',
      'board_serial_available',
      'board_serial_read',
      'board_serial_readStringUntil',
      'board_serial_flush',
    ],
  },
  SEEED: {
    name: 'Grove',
    blocks: [
      'grove_led',
      'grove_button',
      'grove_relay',
      'grove_tilt_switch',
      'grove_piezo_buzzer',
      'grove_pir_motion_sensor',
      'grove_line_finder',
      'grove_rgb_led',
      'grove_ultrasonic_ranger',
      'grove_rotary_angle',
      'grove_temperature_sensor',
      'grove_sound_sensor',
      'grove_thumb_joystick',
      'grove_serial_lcd_print',
      'grove_serial_lcd_power',
      'grove_serial_lcd_effect',
      'grove_motor_shield',
    ],
  },
  DS18B20: {
    name: 'DS18B20',
    blocks: [
      'ds18b20_search',
      'ds18b20_temp',
    ],
  },
  RELAY: {
    name: 'Relais',
    blocks: [
      'RELAY_LOGICAL',
      'RELAY_MOSFET',
    ],
  },
  SERVO: {
    name: 'Servo',
    blocks: [
      'servo_move',
      'servo_read_degrees',
    ],
  },
  AI: {
    name: 'IA Camera',
    blocks: [
      'ai_camera_open',
      'ai_detect',
      'ai_follow_line',
      'ai_sprite_say',
      'ai_sprite_move',
      'ai_sprite_turn',
      'ai_wait',
      'ai_camera_close',
    ],
  },
  ROBOT: {
    name: 'Robot',
    blocks: [
      'robot_forward',
      'robot_backward',
      'robot_turn_left',
      'robot_turn_right',
      'robot_set_speed',
      'robot_stop',
      'robot_gripper_open',
      'robot_gripper_close',
      'robot_gripper_stop',
    ],
  },
  PHONE: {
    name: 'Capteurs téléphone',
    blocks: [
      'phone_connect',
      'phone_activate',
      'phone_read_accelerometer',
      'phone_read_gyroscope',
      'phone_read_gps',
      'phone_read_microphone',
      'phone_use_camera',
      'phone_camera_window_open',
      'phone_vision_start',
      'phone_use_local_camera',
      'phone_drive_tilt',
      'phone_stop_on_noise',
      'phone_udp_start',
      'phone_udp_stop',
    ],
  },
};

/** Transforme un type de bloc en nom lisible */
export function blockTypeToLabel(blockType: string): string {
  return blockType
    .replace(/^(ai|robot|phone|board|grove|ds18b20|servo|relay)_/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
