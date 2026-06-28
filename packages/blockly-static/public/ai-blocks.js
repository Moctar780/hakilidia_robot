/**
 * Blocs IA pour le runtime Blockly IA.
 *
 * ⚠️ SOURCE UNIQUE — Ne pas modifier les copies (blocklyduino-mobile et
 *    BlocklyDuino-v2-react) directement. Elles sont synchronisées depuis ce
 *    fichier via `npm run sync-blockly` (sync-blockly.mjs).
 */

'use strict';

(function () {
  function statementBlock(type, label, color, configure) {
    Blockly.Blocks[type] = {
      init: function () {
        this.appendDummyInput().appendField(label);
        configure && configure.call(this);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(color);
        this.setTooltip('Commande executée par le runtime Blockly IA.');
        this.setHelpUrl('');
      },
    };
  }

  function containerBlock(type, label, color, statementLabel) {
    Blockly.Blocks[type] = {
      init: function () {
        this.appendDummyInput().appendField(label);
        this.appendStatementInput('DO').appendField(statementLabel || 'faire');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(color);
        this.setTooltip('Prépare un contexte puis exécute les blocs placés à l’intérieur.');
        this.setHelpUrl('');
      },
    };
  }

  statementBlock('ai_camera_open', 'ouvrir la camera', 270);
  statementBlock('ai_camera_close', 'fermer la camera', 270);

  statementBlock('ai_detect', 'detecter', 285, function () {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([
      ['visage', 'face'],
      ['objet', 'object'],
      ['personne', 'gender'],
      ['ligne', 'line'],
    ]), 'KIND');
  });

  statementBlock('ai_follow_line', 'suivre ligne camera avancer', 285, function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldNumber(10, 1, 100, 1), 'FORWARD')
      .appendField('pas tourner')
      .appendField(new Blockly.FieldNumber(15, 5, 90, 1), 'TURN')
      .appendField('deg');
  });

  statementBlock('ai_sprite_move', 'avancer le sprite de', 215, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(10, -300, 300, 1), 'STEPS').appendField('pas');
  });

  statementBlock('ai_sprite_turn', 'tourner le sprite de', 215, function () {
    this.appendDummyInput().appendField(new Blockly.FieldAngle(15), 'DEGREES').appendField('degres');
  });

  statementBlock('ai_sprite_say', 'dire', 45, function () {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput('Bonjour'), 'MESSAGE');
  });

  statementBlock('ai_wait', 'attendre', 120, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(1, 0, 60, 0.1), 'SECONDS').appendField('secondes');
  });

  statementBlock('robot_forward', 'robot avancer de', 160, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(10, 0, 500, 1), 'STEPS').appendField('pas');
  });

  statementBlock('robot_backward', 'robot reculer de', 160, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(10, 0, 500, 1), 'STEPS').appendField('pas');
  });

  statementBlock('robot_turn_left', 'robot tourner a gauche de', 160, function () {
    this.appendDummyInput().appendField(new Blockly.FieldAngle(90), 'DEGREES').appendField('degres');
  });

  statementBlock('robot_turn_right', 'robot tourner a droite de', 160, function () {
    this.appendDummyInput().appendField(new Blockly.FieldAngle(90), 'DEGREES').appendField('degres');
  });

  statementBlock('robot_stop', 'robot arreter', 0);

  statementBlock('robot_set_speed', 'robot vitesse', 160, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(50, 0, 100, 1), 'SPEED').appendField('%');
  });

  statementBlock('robot_gripper_open', 'ouvrir la pince de', 160, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(3, 1, 10, 1), 'CM').appendField('cm');
  });

  statementBlock('robot_gripper_close', 'fermer la pince de', 160, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(3, 1, 10, 1), 'CM').appendField('cm');
  });

  statementBlock('robot_gripper_stop', 'arreter la pince', 0);

  statementBlock('phone_connect', 'connecter telephone', 205, function () {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput('192.168.43.1'), 'HOST');
  });

  statementBlock('phone_activate', 'activer capteurs telephone', 205);

  statementBlock('phone_read_accelerometer', 'lire accelerometre telephone', 205);

  statementBlock('phone_read_gyroscope', 'lire gyroscope telephone', 205);

  statementBlock('phone_read_gps', 'lire GPS telephone', 205);

  statementBlock('phone_read_microphone', 'lire micro telephone', 205);

  statementBlock('phone_use_camera', 'utiliser camera telephone pour IA', 205);

  statementBlock('phone_camera_window_open', 'ouvrir fenetre camera telephone', 205);

  containerBlock('phone_vision_start', 'preparer vision telephone', 205, 'taches de vision');

  statementBlock('phone_use_local_camera', 'utiliser camera locale pour IA', 205);

  statementBlock('phone_drive_tilt', 'piloter robot avec inclinaison seuil', 205, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(2, 0, 20, 0.1), 'THRESHOLD');
  });

  statementBlock('phone_stop_on_noise', 'arreter robot si bruit seuil', 205, function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(0.35, 0, 1, 0.01), 'THRESHOLD');
  });

  statementBlock('phone_udp_start', 'demarrer temps reel telephone', 205);

  statementBlock('phone_udp_stop', 'arreter temps reel telephone', 205);

  if (Blockly.Arduino) {
    Blockly.Arduino.ai_camera_open = function () {
      return 'AI_CAMERA_OPEN();\n';
    };
    Blockly.Arduino.ai_camera_close = function () {
      return 'AI_CAMERA_CLOSE();\n';
    };
    Blockly.Arduino.ai_detect = function (block) {
      return 'AI_DETECT("' + block.getFieldValue('KIND') + '");\n';
    };
    Blockly.Arduino.ai_follow_line = function (block) {
      return 'AI_FOLLOW_LINE(' + Number(block.getFieldValue('FORWARD') || 10) + ',' + Number(block.getFieldValue('TURN') || 15) + ');\n';
    };
    Blockly.Arduino.ai_sprite_move = function (block) {
      return 'AI_SPRITE_MOVE(' + Number(block.getFieldValue('STEPS') || 10) + ');\n';
    };
    Blockly.Arduino.ai_sprite_turn = function (block) {
      return 'AI_SPRITE_TURN(' + Number(block.getFieldValue('DEGREES') || 15) + ');\n';
    };
    Blockly.Arduino.ai_sprite_say = function (block) {
      return 'AI_SPRITE_SAY("' + String(block.getFieldValue('MESSAGE') || '').replace(/"/g, '\\"') + '");\n';
    };
    Blockly.Arduino.ai_wait = function (block) {
      return 'AI_WAIT(' + Number(block.getFieldValue('SECONDS') || 1) + ');\n';
    };
    Blockly.Arduino.robot_forward = function (block) {
      return 'ROBOT_FORWARD(' + Number(block.getFieldValue('STEPS') || 10) + ');\n';
    };
    Blockly.Arduino.robot_backward = function (block) {
      return 'ROBOT_BACKWARD(' + Number(block.getFieldValue('STEPS') || 10) + ');\n';
    };
    Blockly.Arduino.robot_turn_left = function (block) {
      return 'ROBOT_TURN_LEFT(' + Number(block.getFieldValue('DEGREES') || 90) + ');\n';
    };
    Blockly.Arduino.robot_turn_right = function (block) {
      return 'ROBOT_TURN_RIGHT(' + Number(block.getFieldValue('DEGREES') || 90) + ');\n';
    };
    Blockly.Arduino.robot_stop = function () {
      return 'ROBOT_STOP();\n';
    };
    Blockly.Arduino.robot_set_speed = function (block) {
      return 'ROBOT_SET_SPEED(' + Number(block.getFieldValue('SPEED') || 50) + ');\n';
    };
    Blockly.Arduino.robot_gripper_open = function (block) {
      return 'ROBOT_GRIPPER_OPEN(' + Number(block.getFieldValue('CM') || 3) + ');\n';
    };
    Blockly.Arduino.robot_gripper_close = function (block) {
      return 'ROBOT_GRIPPER_CLOSE(' + Number(block.getFieldValue('CM') || 3) + ');\n';
    };
    Blockly.Arduino.robot_gripper_stop = function () {
      return 'ROBOT_GRIPPER_STOP();\n';
    };
    Blockly.Arduino.phone_connect = function (block) {
      return 'PHONE_CONNECT("' + String(block.getFieldValue('HOST') || '').replace(/"/g, '\\"') + '");\n';
    };
    Blockly.Arduino.phone_activate = function () {
      return 'PHONE_ACTIVATE("android.sensor.accelerometer|android.sensor.gyroscope");\n';
    };
    Blockly.Arduino.phone_read_accelerometer = function () {
      return 'PHONE_READ_ACCELEROMETER();\n';
    };
    Blockly.Arduino.phone_read_gyroscope = function () {
      return 'PHONE_READ_GYROSCOPE();\n';
    };
    Blockly.Arduino.phone_read_gps = function () {
      return 'PHONE_READ_GPS();\n';
    };
    Blockly.Arduino.phone_read_microphone = function () {
      return 'PHONE_READ_MICROPHONE();\n';
    };
    Blockly.Arduino.phone_use_camera = function () {
      return 'PHONE_USE_CAMERA();\n';
    };
    Blockly.Arduino.phone_camera_window_open = function () {
      return 'PHONE_CAMERA_WINDOW_OPEN();\n';
    };
    Blockly.Arduino.phone_vision_start = function (block) {
      var branch = Blockly.Arduino.statementToCode(block, 'DO') || '';
      return 'PHONE_VISION_START();\n' + branch;
    };
    Blockly.Arduino.phone_use_local_camera = function () {
      return 'PHONE_USE_LOCAL_CAMERA();\n';
    };
    Blockly.Arduino.phone_drive_tilt = function (block) {
      return 'PHONE_DRIVE_TILT(' + Number(block.getFieldValue('THRESHOLD') || 2) + ');\n';
    };
    Blockly.Arduino.phone_stop_on_noise = function (block) {
      return 'PHONE_STOP_ON_NOISE(' + Number(block.getFieldValue('THRESHOLD') || 0.35) + ');\n';
    };
    Blockly.Arduino.phone_udp_start = function () {
      return 'PHONE_UDP_START();\n';
    };
    Blockly.Arduino.phone_udp_stop = function () {
      return 'PHONE_UDP_STOP();\n';
    };
  }

  window.BLOCKLY_AI_TOOLBOX = {
    kind: 'category',
    name: 'IA Camera',
    toolboxitemid: 'AI',
    level: '1',
    colour: '#7c3aed',
    contents: [
      { kind: 'block', type: 'ai_camera_open' },
      { kind: 'block', type: 'ai_detect' },
      { kind: 'block', type: 'ai_follow_line' },
      { kind: 'block', type: 'ai_sprite_say' },
      { kind: 'block', type: 'ai_sprite_move' },
      { kind: 'block', type: 'ai_sprite_turn' },
      { kind: 'block', type: 'ai_wait' },
      { kind: 'block', type: 'ai_camera_close' },
    ],
  };

  window.BLOCKLY_ROBOT_TOOLBOX = {
    kind: 'category',
    name: 'Robot',
    toolboxitemid: 'ROBOT',
    level: '1',
    colour: '#16a34a',
    contents: [
      { kind: 'block', type: 'robot_forward' },
      { kind: 'block', type: 'robot_backward' },
      { kind: 'block', type: 'robot_turn_left' },
      { kind: 'block', type: 'robot_turn_right' },
      { kind: 'block', type: 'robot_set_speed' },
      { kind: 'block', type: 'robot_stop' },
      { kind: 'block', type: 'robot_gripper_open' },
      { kind: 'block', type: 'robot_gripper_close' },
      { kind: 'block', type: 'robot_gripper_stop' },
    ],
  };

  window.BLOCKLY_PHONE_TOOLBOX = {
    kind: 'category',
    name: 'Capteurs telephone',
    toolboxitemid: 'PHONE',
    level: '1',
    colour: '#0ea5e9',
    contents: [
      { kind: 'block', type: 'phone_connect' },
      { kind: 'block', type: 'phone_activate' },
      { kind: 'block', type: 'phone_read_accelerometer' },
      { kind: 'block', type: 'phone_read_gyroscope' },
      { kind: 'block', type: 'phone_read_gps' },
      { kind: 'block', type: 'phone_read_microphone' },
      { kind: 'block', type: 'phone_use_camera' },
      { kind: 'block', type: 'phone_camera_window_open' },
      { kind: 'block', type: 'phone_vision_start' },
      { kind: 'block', type: 'phone_use_local_camera' },
      { kind: 'block', type: 'phone_drive_tilt' },
      { kind: 'block', type: 'phone_stop_on_noise' },
      { kind: 'block', type: 'phone_udp_start' },
      { kind: 'block', type: 'phone_udp_stop' },
    ],
  };
})();
