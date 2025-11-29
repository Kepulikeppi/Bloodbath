<?php
require 'session_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$requestedName = isset($input['name']) ? trim($input['name']) : null;

// Determine Name
if ($requestedName !== null) {
    // Case A: User typed a name (or explicitly sent "DEFAULT")
    $name = preg_replace("/[^a-zA-Z0-9]/", "", $requestedName);
    if (strlen($name) > 12) $name = substr($name, 0, 12);
    if (empty($name)) $name = "DEFAULT";
} else {
    // Case B: No name sent -> Keep existing identity, or fallback to DEFAULT
    $name = isset($_SESSION['player_name']) ? $_SESSION['player_name'] : "DEFAULT";
}

// Reset State (This is the "New Game" part)
$_SESSION['player_name'] = $name;
$_SESSION['level'] = 1;
$_SESSION['seed'] = rand(100000, 999999);
$_SESSION['start_time'] = time();

send_json(['status' => 'ok', 'name' => $name]);
