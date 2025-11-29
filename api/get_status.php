<?php
require 'session_config.php';

$response = [
    'active' => false,
    'name' => 'none',
    'level' => 1
];

if (isset($_SESSION['player_name'])) {
    $response['active'] = true;
    $response['name'] = $_SESSION['player_name'];
    $response['level'] = $_SESSION['level'] ?? 1;
}

send_json($response);
