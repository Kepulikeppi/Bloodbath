<?php
// api/session_config.php
ini_set('session.gc_maxlifetime', 86400);
session_set_cookie_params(86400);

session_start();

function send_json($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
