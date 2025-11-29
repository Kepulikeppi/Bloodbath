<?php
require 'session_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = isset($input['name']) ? trim($input['name']) : '';

// Sanitize
$name = preg_replace("/[^a-zA-Z0-9 ]/", "", $name);
if (strlen($name) > 15) $name = substr($name, 0, 15);

// LOGIC CHANGE: If name is empty or just whitespace, it becomes DEFAULT
if (empty($name)) $name = "DEFAULT";

// Reset Session
$_SESSION['player_name'] = $name;
$_SESSION['level'] = 1;
$_SESSION['seed'] = rand(100000, 999999);
$_SESSION['start_time'] = time();

send_json(['status' => 'ok']);
