/**
 * Blocs IA pour le runtime Blockly IA.
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

  statementBlock('ai_camera_open', 'ouvrir la camera', 270);
  statementBlock('ai_camera_close', 'fermer la camera', 270);

  statementBlock('ai_detect', 'detecter', 285, function () {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([
      ['visage', 'face'],
      ['objet', 'object'],
      ['personne', 'gender'],
    ]), 'KIND');
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
})();
