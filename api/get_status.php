<?php
session_start();
header('Content-Type: application/json');

$response = [];

if (isset($_SESSION['level'])) {
    $response['active'] = true;
    $response['level'] = $_SESSION['level'];
    $response['name'] = $_SESSION['session_name'] ?? 'DEFAULT';
} else {
    $response['active'] = false;
    $response['level'] = 1;
    $response['name'] = 'DEFAULT';
}

// Performance Fix
session_write_close();

echo json_encode($response);