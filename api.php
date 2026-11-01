<?php

declare(strict_types=1);

use StackNova\Auth;
use StackNova\Chat;
use StackNova\Estimates;
use StackNova\Http;
use StackNova\Repository;
use StackNova\Session;

require __DIR__ . '/src/bootstrap.php';

ini_set('display_errors', '0');
try {
    Http::headers();
    Http::enforceHost();
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if (!in_array($method, ['GET', 'POST'], true)) {
        header('Allow: GET, POST');
        Http::fail(405, 'Method not allowed.');
    }
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $prefix = StackNova\config()['base'] . '/api/';
    if (!is_string($path) || !str_starts_with($path, $prefix)) {
        Http::fail(404, 'Not found.');
    }
    $route = substr($path, strlen($prefix));
    $repo = new Repository(StackNova\database());
    $repo->limit('requests', $_SERVER['REMOTE_ADDR'] ?? '', 250);
    $session = new Session($repo);
    $data = [];
    if ($method === 'POST') {
        $session->verify();
        $data = Http::input();
        $repo->limit('mutations', $_SERVER['REMOTE_ADDR'] ?? '', 150);
    }
    $auth = new Auth($repo, $session);
    $estimates = new Estimates($repo, $session);
    $chat = new Chat($repo, $session);
    if ($method === 'GET') {
        match ($route) {
            'session' => Http::json($session->response() + ['contact' => [
                'line' => StackNova\config()['line'],
                'phone' => StackNova\config()['phone'],
                'email' => StackNova\config()['email'],
                'controller' => StackNova\config()['controller'],
            ]]),
            'estimates' => Http::json(['estimates' => $estimates->list()]),
            'chat' => Http::json(['messages' => $chat->history()]),
            default => preg_match('~^estimates/([a-f0-9]{32})$~D', $route, $match)
                ? Http::json(['estimate' => $estimates->list($match[1])[0]])
                : Http::fail(404, 'Not found.'),
        };
    }
    match ($route) {
        'register' => Http::json($auth->register($data), 201),
        'login' => Http::json($auth->login($data)),
        'logout' => (function () use ($session): never {
            $session->replace(null);
            Http::json($session->response());
        })(),
        'account/delete' => Http::json($auth->remove($data)),
        'estimates' => Http::json(['estimate' => $estimates->create($data)], 201),
        'chat' => Http::json($chat->send($data)),
        default => Http::fail(404, 'Not found.'),
    };
} catch (Throwable $error) {
    // Logs never include request bodies, credentials, SQL, or user-supplied text.
    error_log('StackNova API failure: ' . get_class($error));
    Http::fail(503, 'Service temporarily unavailable. Please try again later.');
}
