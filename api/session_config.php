<?php
// api/session_config.php
ini_set('session.gc_maxlifetime', 86400);
session_set_cookie_params(86400);

session_start();

// Standard blocking response (for errors or synchronous needs)
function send_json($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// ASYNC-LIKE RESPONSE
// Sends data, closes connection, but keeps script running
function send_json_background($data) {
    $json = json_encode($data);

    // 1. Clear any accidental whitespace/output from buffers
    while (ob_get_level()) {
        ob_end_clean();
    }

    // 2. Set Headers
    header('Content-Type: application/json');
    header('Connection: close');
    header('Content-Length: ' . strlen($json));
    // Prevent caching
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

    // 3. Allow script to continue after client disconnects
    ignore_user_abort(true);

    // 4. Send Content
    echo $json;

    // 5. Close Network Connection
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request(); // Nginx + PHP-FPM optimized
    } else {
        // Fallback (Apache/Mod_PHP/Built-in server)
        flush();
    }
}
?>