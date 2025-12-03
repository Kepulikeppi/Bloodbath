<?php
require 'session_config.php';

$input = json_decode(file_get_contents('php://input'), true);

if (isset($input['player_data'])) {
    $_SESSION['player_data'] = $input['player_data'];
    $status = 'ok';
} else {
    $status = 'error';
}

session_write_close();

send_json(['status' => $status]);
?>