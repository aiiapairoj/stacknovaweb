<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/src/bootstrap.php';

try {
    $db = StackNova\database();
    $now = time();
    $db->beginTransaction();
    try {
        $operations = [
            ['DELETE FROM sessions WHERE expires_at <= ? OR last_seen < ?', [$now, $now - 1800]],
            ['DELETE FROM rate_limits WHERE reset_at < ?', [$now]],
            ['DELETE FROM estimates WHERE user_id IS NULL AND created_at < ?', [$now - 30 * 86400]],
            ['DELETE FROM chat_messages WHERE user_id IS NULL AND created_at < ?', [$now - 30 * 86400]],
            ['DELETE FROM users WHERE last_login < ?', [$now - 365 * 86400]],
        ];
        foreach ($operations as [$sql, $values]) {
            $db->prepare($sql)->execute($values);
        }
        $db->commit();
    } catch (Throwable $error) {
        $db->rollBack();
        throw $error;
    }
    $db->exec('PRAGMA wal_checkpoint(TRUNCATE)');
    echo 'Expired records removed; WAL checkpoint complete.' . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Maintenance failed: ' . get_class($error) . PHP_EOL);
    exit(1);
}
