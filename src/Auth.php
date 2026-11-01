<?php

declare(strict_types=1);

namespace StackNova;

final class Auth
{
    public function __construct(private readonly Repository $repo, private readonly Session $session)
    {
    }

    private function credentials(array $data, bool $creating): array
    {
        $email = strtolower(Http::text($data, 'email', 254));
        $password = $data['password'] ?? null;
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !is_string($password)
            || strlen($password) > 72 || strlen($password) < ($creating ? 12 : 1) || str_contains($password, "\0")) {
            Http::fail(422, 'Use a valid email and a password of 12–72 bytes.');
        }
        $this->repo->limit('auth-ip', $_SERVER['REMOTE_ADDR'] ?? '', 30);
        $this->repo->limit('auth-account', $email, 10);
        return [$email, $password];
    }

    public function register(array $data): array
    {
        [$email, $password] = $this->credentials($data, true);
        $name = Http::text($data, 'name', 400);
        if (preg_match('/[\r\n]/', $name) || preg_match_all('/./us', $name) > 100) {
            Http::fail(422, 'Name must contain at most 100 characters on one line.');
        }
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        try {
            $this->repo->run('INSERT INTO users(email, display_name, password_hash, created_at, last_login) VALUES (?, ?, ?, ?, ?)', [$email, $name, $hash, time(), time()]);
        } catch (\PDOException $error) {
            if ($error->getCode() === '23000') {
                Http::fail(409, 'Unable to create this account. Try logging in instead.');
            }
            throw $error;
        }
        $this->session->replace((int) $this->repo->db->lastInsertId());
        return $this->session->response();
    }

    public function login(array $data): array
    {
        [$email, $password] = $this->credentials($data, false);
        $user = $this->repo->one('SELECT id, password_hash FROM users WHERE email = ?', [$email]);
        // Public dummy hash has the same work factor as real credentials, not a secret or an account.
        $dummy = '$2y$12$0q2j7jfjW/eYtO1812VqEug6m/R/FD/XSL5ED.dD9OYjyO3L7SpRG';
        if (!password_verify($password, $user['password_hash'] ?? $dummy) || !$user) {
            Http::fail(401, 'Email or password is incorrect.');
        }
        if (password_needs_rehash($user['password_hash'], PASSWORD_BCRYPT, ['cost' => 12])) {
            $this->repo->run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $user['id']]);
        }
        $this->repo->run('UPDATE users SET last_login = ? WHERE id = ?', [time(), $user['id']]);
        $this->session->replace((int) $user['id']);
        return $this->session->response();
    }

    public function remove(array $data): array
    {
        $id = $this->session->userId();
        if ($id === null) {
            Http::fail(401, 'Please log in.');
        }
        $this->repo->limit('delete-account', (string) $id, 5);
        $password = $data['password'] ?? null;
        $user = $this->repo->one('SELECT password_hash FROM users WHERE id = ?', [$id]);
        if (!is_string($password) || strlen($password) > 72 || !password_verify($password, $user['password_hash'])) {
            Http::fail(401, 'Password is incorrect.');
        }
        $this->repo->run('DELETE FROM users WHERE id = ?', [$id]);
        $this->session->replace(null);
        return $this->session->response();
    }
}
