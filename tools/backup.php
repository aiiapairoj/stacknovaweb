<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/src/bootstrap.php';

try {
    $db = StackNova\database();
    $directory = dirname(StackNova\config()['database']) . '/backups';
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Backup directory unavailable.');
    }
    $path = $directory . '/stacknova-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.sqlite';
    // SQLite creates a consistent snapshot including committed WAL content.
    $query = $db->prepare('VACUUM INTO ?');
    $query->execute([$path]);
    if (PHP_OS_FAMILY !== 'Windows') {
        chmod($path, 0600);
    }
    echo 'Backup created: ' . $path . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Backup failed: ' . get_class($error) . PHP_EOL);
    exit(1);
}
