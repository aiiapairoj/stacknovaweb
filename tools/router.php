<?php

// Local integration-test router. Never use PHP's development server for deployment.
declare(strict_types=1);

$root = dirname(__DIR__);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (is_string($path) && preg_match('~^/assets/[A-Za-z0-9_.-]+\.(css|js|woff2?)$~D', $path) && is_file($root . $path)) {
    return false;
}
if ($path === '/' || $path === '/index.php') {
    require $root . '/index.php';
} elseif (is_string($path) && str_starts_with($path, '/api/')) {
    require $root . '/api.php';
} else {
    http_response_code(403);
    header('Content-Type: application/json');
    echo '{"error":"Forbidden."}';
}
