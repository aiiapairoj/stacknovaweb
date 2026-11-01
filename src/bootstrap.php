<?php

declare(strict_types=1);

namespace StackNova;

use PDO;
use RuntimeException;

spl_autoload_register(function (string $class): void {
    $prefix = __NAMESPACE__ . '\\';
    if (str_starts_with($class, $prefix)) {
        $name = substr($class, strlen($prefix));
        if (preg_match('/^[A-Za-z]+$/D', $name)) {
            $path = __DIR__ . '/' . $name . '.php';
            if (is_file($path)) {
                require $path;
            }
        }
    }
});

function config(): array
{
    static $config;
    if ($config !== null) {
        return $config;
    }
    $local = is_file(dirname(__DIR__) . '/config.local.php')
        ? require dirname(__DIR__) . '/config.local.php' : [];
    $read = static fn(string $key, string $default = ''): string =>
        getenv($key) !== false ? (string) getenv($key) : (string) ($local[$key] ?? $default);
    $origin = rtrim($read('APP_ORIGIN', 'https://localhost'), '/');
    $parts = parse_url($origin);
    $environment = $read('APP_ENV', 'production');
    if (!in_array($environment, ['local', 'production', 'test'], true)
        || !$parts || !isset($parts['scheme'], $parts['host'])
        || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
        || (isset($parts['path']) && $parts['path'] !== '')
        || !in_array($parts['scheme'], ['http', 'https'], true)
        || ($environment === 'production' && $parts['scheme'] !== 'https')) {
        throw new RuntimeException('Invalid application configuration.');
    }
    $base = rtrim($read('APP_BASE_PATH', ''), '/');
    if ($base !== '' && !preg_match('~^(/[a-zA-Z0-9_-]+)+$~D', $base)) {
        throw new RuntimeException('Invalid base path.');
    }
    if ($environment === 'production') {
        if (PHP_VERSION_ID < 80235) {
            throw new RuntimeException('A patched PHP runtime is required.');
        }
        if ($read('BUSINESS_LEGAL_NAME') === '' || !filter_var($read('CONTACT_EMAIL'), FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Verified business and privacy contact configuration is required.');
        }
    }
    $config = [
        'environment' => $environment,
        'origin' => $origin,
        'authority' => $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : ''),
        'base' => $base,
        'database' => $read('APP_DATABASE', dirname(__DIR__) . '/storage/stacknova.sqlite'),
        'line' => $read('CONTACT_LINE'),
        'phone' => $read('CONTACT_PHONE'),
        'email' => $read('CONTACT_EMAIL'),
        'controller' => $read('BUSINESS_LEGAL_NAME', 'Not configured'),
    ];
    return $config;
}

function database(bool $create = false): PDO
{
    static $db;
    if ($db instanceof PDO) {
        return $db;
    }
    $path = config()['database'];
    // Only file-backed SQLite is supported. No network database targets or URI options.
    if (!preg_match('~^(?:[A-Za-z]:[\\\\/]|/)~', $path) || str_contains($path, '?')
        || str_contains($path, "\0") || str_starts_with($path, '//') || str_starts_with($path, '\\\\')) {
        throw new RuntimeException('Database must be an absolute local file path.');
    }
    if (config()['environment'] === 'production') {
        $root = str_replace('\\', '/', (string) realpath(dirname(__DIR__)));
        $parent = realpath(dirname($path));
        if ($parent === false || str_starts_with(strtolower(str_replace('\\', '/', $parent) . '/'), strtolower($root . '/'))) {
            throw new RuntimeException('Production data must live outside the web root.');
        }
    }
    if (!$create && !is_file($path)) {
        throw new RuntimeException('Database not initialized.');
    }
    $db = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('PRAGMA foreign_keys = ON');
    $db->exec('PRAGMA secure_delete = ON');
    $db->exec('PRAGMA busy_timeout = 5000');
    $db->exec('PRAGMA journal_mode = WAL');
    return $db;
}
