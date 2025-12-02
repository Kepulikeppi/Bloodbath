<?php
require 'session_config.php';

$input = json_decode(file_get_contents('php://input'), true);

// Sanity check
if (!isset($_SESSION['level'])) {
    send_json(['status' => 'error', 'message' => 'No active run']);
}

// 1. Increment Level
$_SESSION['level']++;

// 2. Generate New Seed for the next level
$_SESSION['seed'] = rand(100000, 999999);

// 3. Save Player Data (The Snapshot)
// We trust the client to send the correct state at the end of the level.
if (isset($input['player_data'])) {
    $_SESSION['player_data'] = $input['player_data'];
}

// 4. Release lock immediately
session_write_close();

send_json([
    'status' => 'ok',
    'new_level' => $_SESSION['level']
]);
?>