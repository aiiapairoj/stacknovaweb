<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/src/bootstrap.php';

try {
    $path = StackNova\config()['database'];
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Cannot create database directory.');
    }
    $db = StackNova\database(true);
    $db->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)');
    foreach (glob(dirname(__DIR__) . '/migrations/[0-9]*.sql') as $file) {
        $version = (int) basename($file);
        $check = $db->prepare('SELECT version FROM schema_migrations WHERE version = ?');
        $check->execute([$version]);
        if ($check->fetchColumn() !== false) {
            continue;
        }
        $db->beginTransaction();
        try {
            $db->exec(file_get_contents($file));
            $db->prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)')->execute([$version, time()]);
            $db->commit();
        } catch (Throwable $error) {
            $db->rollBack();
            throw $error;
        }
        echo 'Applied migration ' . $version . PHP_EOL;
    }
    if ($db->query('PRAGMA integrity_check')->fetchColumn() !== 'ok' || $db->query('PRAGMA foreign_key_check')->fetchAll() !== []) {
        throw new RuntimeException('Database integrity check failed.');
    }
    if (PHP_OS_FAMILY !== 'Windows') {
        chmod($path, 0600);
    }
    echo 'Schema current; integrity and foreign keys OK.' . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Migration failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
