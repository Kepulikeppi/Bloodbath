<?php
session_start();

// FIX: Prevent Browser Caching of the API response
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header('Content-Type: application/json');

$response = [];

if (isset($_SESSION['level'])) {
    $response['active'] = true;
    $response['level'] = $_SESSION['level'];
    $response['name'] = $_SESSION['session_name'] ?? 'DEFAULT'; 
    
    // Seed must ALWAYS be random. If missing, generate one.
    $response['seed'] = $_SESSION['seed'] ?? rand(100000, 999999);
    
    if (isset($_SESSION['player_data'])) {
        $response['player_data'] = $_SESSION['player_data'];
    }
} else {
    $response['active'] = false;
    $response['level'] = 1;
    $response['name'] = 'DEFAULT';
    // Even if no run is active, send a random seed
    $response['seed'] = rand(100000, 999999);
}

session_write_close();

echo json_encode($response);
?>