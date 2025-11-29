<?php
require 'session_config.php';

// Sanity check
if (!isset($_SESSION['level'])) {
    send_json(['status' => 'error', 'message' => 'No active run']);
}

// 1. Increment Level
$_SESSION['level']++;

// 2. Generate New Seed for the next level
// This prevents players from reloading to get a better map layout.
$_SESSION['seed'] = rand(100000, 999999);

send_json([
    'status' => 'ok',
    'new_level' => $_SESSION['level']
]);
?>