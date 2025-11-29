<?php
require 'session_config.php';

// Clear all session variables
session_unset();
// Destroy the session storage
session_destroy();

// We must restart a fresh session immediately to send the JSON response correctly
// otherwise some PHP configs complain about headers.
session_start();

send_json(['status' => 'ok']);