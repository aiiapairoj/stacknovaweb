<?php

declare(strict_types=1);

require __DIR__ . '/src/bootstrap.php';

ini_set('display_errors', '0');
try {
    StackNova\Http::headers();
    StackNova\Http::enforceHost();
    if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) {
        header('Allow: GET, HEAD');
        StackNova\Http::fail(405, 'Method not allowed.');
    }
    header('Content-Type: text/html; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') {
        readfile(__DIR__ . '/views/home.html');
    }
} catch (Throwable $error) {
    error_log('StackNova page failure: ' . get_class($error));
    StackNova\Http::fail(503, 'Service temporarily unavailable.');
}
