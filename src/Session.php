<?php

declare(strict_types=1);

namespace StackNova;

final class Session
{
    public string $hash;
    public array $row;

    public function __construct(private readonly Repository $repo)
    {
        $token = $_COOKIE[$this->cookieName()] ?? '';
        $this->hash = is_string($token) && preg_match('/^[a-f0-9]{64}$/D', $token) ? hash('sha256', $token) : '';
        $row = $this->repo->one('SELECT * FROM sessions WHERE token_hash = ?', [$this->hash]);
        if (!$row || (int) $row['expires_at'] <= time() || (int) $row['last_seen'] < time() - 1800) {
            if ($row) {
                $this->repo->run('DELETE FROM sessions WHERE token_hash = ?', [$this->hash]);
            }
            $this->repo->limit('new-session', $_SERVER['REMOTE_ADDR'] ?? '', 150);
            $this->replace(null);
        } else {
            $this->row = $row;
            $this->repo->run('UPDATE sessions SET last_seen = ? WHERE token_hash = ?', [time(), $this->hash]);
        }
    }

    private function cookieName(): string
    {
        return config()['environment'] === 'production' ? '__Host-stacknova' : 'stacknova_session';
    }

    public function userId(): ?int
    {
        return $this->row['user_id'] === null ? null : (int) $this->row['user_id'];
    }

    public function replace(?int $userId): void
    {
        $old = $this->hash ?? '';
        $token = bin2hex(random_bytes(32));
        $this->hash = hash('sha256', $token);
        $now = time();
        $this->row = ['user_id' => $userId, 'csrf' => bin2hex(random_bytes(32)), 'created_at' => $now, 'expires_at' => $now + 43200];
        $this->repo->db->beginTransaction();
        try {
            $this->repo->run('DELETE FROM sessions WHERE token_hash = ?', [$old]);
            $this->repo->run('INSERT INTO sessions(token_hash, user_id, csrf, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?, ?)', [$this->hash, $userId, $this->row['csrf'], $now, $now, $now + 43200]);
            foreach (['estimates', 'chat_messages'] as $table) {
                if ($userId !== null) {
                    $this->repo->run('UPDATE ' . $table . ' SET user_id = ?, session_hash = NULL WHERE user_id IS NULL AND session_hash = ?', [$userId, $old]);
                }
            }
            $this->repo->db->commit();
        } catch (\Throwable $error) {
            $this->repo->db->rollBack();
            throw $error;
        }
        setcookie($this->cookieName(), $token, [
            'expires' => 0,
            'path' => config()['environment'] === 'production' ? '/' : (config()['base'] . '/'),
            'secure' => config()['environment'] === 'production' || str_starts_with(config()['origin'], 'https:'),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }

    public function verify(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if ($origin !== config()['origin'] || !is_string($token) || !hash_equals($this->row['csrf'], $token)) {
            Http::fail(403, 'Invalid request verification. Refresh the page and try again.');
        }
    }

    public function response(): array
    {
        return ['csrf' => $this->row['csrf'], 'user' => $this->userId() === null ? null : $this->repo->user($this->userId())];
    }
}
