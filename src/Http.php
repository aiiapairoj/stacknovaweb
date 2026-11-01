<?php

declare(strict_types=1);

namespace StackNova;

final class Http
{
    public static function headers(): void
    {
        header_remove('X-Powered-By');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
        header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
        header('Cache-Control: no-store');
        if (config()['environment'] === 'production') {
            header('Strict-Transport-Security: max-age=31536000');
        }
    }

    public static function enforceHost(): void
    {
        if (strtolower($_SERVER['HTTP_HOST'] ?? '') !== strtolower(config()['authority'])) {
            self::fail(400, 'Invalid request host.');
        }
        if (config()['environment'] === 'production' && ($_SERVER['HTTPS'] ?? '') !== 'on') {
            self::fail(400, 'HTTPS is required.');
        }
    }

    public static function json(array $body, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    public static function fail(int $status, string $message): never
    {
        self::json(['error' => $message], $status);
    }

    public static function input(): array
    {
        if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
            self::fail(415, 'Send application/json.');
        }
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) {
            self::fail(413, 'Request is too large.');
        }
        $raw = file_get_contents('php://input', false, null, 0, 16385);
        if ($raw === false || strlen($raw) > 16384) {
            self::fail(413, 'Request is too large.');
        }
        try {
            $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            self::fail(400, 'Invalid JSON.');
        }
        if (!is_array($data) || !str_starts_with(ltrim($raw), '{')) {
            self::fail(422, 'Expected a JSON object.');
        }
        return $data;
    }

    public static function text(array $data, string $key, int $max): string
    {
        $value = $data[$key] ?? null;
        if (!is_string($value) || trim($value) === '' || strlen($value) > $max
            || !preg_match('//u', $value) || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $value)) {
            self::fail(422, 'Invalid ' . $key . '.');
        }
        return trim($value);
    }
}
