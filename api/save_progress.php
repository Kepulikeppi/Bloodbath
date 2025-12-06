<?php
require 'session_config.php';

$input = json_decode(file_get_contents('php://input'), true);

if (isset($input['player_data'])) {
    $_SESSION['player_data'] = $input['player_data'];
    $status = 'ok';
} else {
    $status = 'error';
}

// 1. Tell Client: "We got it, carry on."
send_json_background(['status' => $status]);

// 2. Heavy Lifting: Write file to disk (Happens in background)
session_write_close();
?>