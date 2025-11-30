<?php
session_start();
header('Content-Type: application/json');

$response = [];

if (isset($_SESSION['level'])) {
    $response['active'] = true;
    $response['level'] = $_SESSION['level'];
    $response['name'] = $_SESSION['session_name'] ?? 'DEFAULT'; // Name can be default
    
    // Seed must ALWAYS be random. If missing, generate one.
    $response['seed'] = $_SESSION['seed'] ?? rand(100000, 999999);
} else {
    $response['active'] = false;
    $response['level'] = 1;
    $response['name'] = 'DEFAULT';
    
    // Even if no run is active, send a random seed 
    // so if the client tries to render something, it's unique.
    $response['seed'] = rand(100000, 999999);
}

session_write_close();

echo json_encode($response);