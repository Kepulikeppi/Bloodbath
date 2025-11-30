<?php
require 'session_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$requestedName = isset($input['name']) ? trim($input['name']) : null;

// Determine Name
if ($requestedName !== null) {
    // Case A: User typed a name
    $name = preg_replace("/[^a-zA-Z0-9]/", "", $requestedName);
    $name = strtoupper($name);
    
    if (strlen($name) > 12) $name = substr($name, 0, 12);
    if (empty($name)) $name = "DEFAULT";
} else {
    // Case B: No name sent -> Keep existing, or fallback to DEFAULT
    $name = isset($_SESSION['session_name']) ? $_SESSION['session_name'] : "DEFAULT";
}

// Reset State
$_SESSION['session_name'] = $name;
$_SESSION['level'] = 1;
$_SESSION['seed'] = rand(100000, 999999);
$_SESSION['start_time'] = time();

// Performance Fix
session_write_close();

send_json(['status' => 'ok', 'name' => $name]);