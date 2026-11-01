<?php

declare(strict_types=1);

namespace StackNova;

use PDO;

final class Repository
{
    public function __construct(public readonly PDO $db)
    {
    }

    public function one(string $sql, array $values = []): ?array
    {
        $query = $this->db->prepare($sql);
        $query->execute($values);
        $row = $query->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function all(string $sql, array $values = []): array
    {
        $query = $this->db->prepare($sql);
        $query->execute($values);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function run(string $sql, array $values = []): void
    {
        $this->db->prepare($sql)->execute($values);
    }

    public function user(int $id): ?array
    {
        return $this->one('SELECT id, display_name FROM users WHERE id = ?', [$id]);
    }

    public function owned(string $table, Session $session, ?string $id = null): array
    {
        if (!in_array($table, ['estimates', 'chat_messages'], true)) {
            throw new \LogicException('Invalid resource.');
        }
        $where = $session->userId() === null ? 'user_id IS NULL AND session_hash = ?' : 'user_id = ?';
        $values = [$session->userId() ?? $session->hash];
        if ($id !== null) {
            $where .= ' AND id = ?';
            $values[] = $id;
        }
        return $this->all('SELECT * FROM ' . $table . ' WHERE ' . $where . ' ORDER BY created_at DESC, id DESC LIMIT 50', $values);
    }

    public function limit(string $scope, string $identity, int $max, int $seconds = 600): void
    {
        $bucket = hash('sha256', $scope . ':' . $identity);
        $now = time();
        $this->db->exec('BEGIN IMMEDIATE');
        try {
            $this->run('DELETE FROM rate_limits WHERE reset_at < ?', [$now]);
            $row = $this->one('SELECT hits FROM rate_limits WHERE bucket = ?', [$bucket]);
            if ($row !== null && (int) $row['hits'] >= $max) {
                $this->db->exec('COMMIT');
                header('Retry-After: ' . $seconds);
                Http::fail(429, 'Too many attempts. Please try again later.');
            }
            $this->run('INSERT INTO rate_limits(bucket, hits, reset_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1', [$bucket, $now + $seconds]);
            $this->db->exec('COMMIT');
        } catch (\Throwable $error) {
            $this->db->exec('ROLLBACK');
            throw $error;
        }
    }
}
