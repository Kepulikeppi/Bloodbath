<?php
require 'session_config.php';

$input = json_decode(file_get_contents('php://input'), true);

// Sanity check
if (!isset($_SESSION['level'])) {
    send_json(['status' => 'error', 'message' => 'No active run']);
}

// 1. Update State in Memory
$_SESSION['level']++;
$_SESSION['seed'] = rand(100000, 999999);

if (isset($input['player_data'])) {
    $_SESSION['player_data'] = $input['player_data'];
}

// 2. Send Response & Close Connection
send_json_background([
    'status' => 'ok',
    'new_level' => $_SESSION['level']
]);

// 3. Write to Disk (Background)
session_write_close();
?>