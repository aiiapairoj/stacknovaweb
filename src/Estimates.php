<?php

declare(strict_types=1);

namespace StackNova;

final class Estimates
{
    public function __construct(private readonly Repository $repo, private readonly Session $session)
    {
    }

    public function create(array $data): array
    {
        $service = $data['service'] ?? null;
        $scope = $data['scope'] ?? null;
        $cms = $data['cms'] ?? null;
        if (!is_string($service) || !in_array($service, ['website', 'store', 'brand'], true)
            || !is_string($scope) || !in_array($scope, ['1', '1.5', '2.2'], true) || !is_bool($cms)
            || ($service === 'brand' && $cms)) {
            Http::fail(422, 'Invalid estimate options.');
        }
        $this->repo->limit('estimate', $this->session->hash, 30);
        // Integer satang only; the browser never supplies authoritative amounts.
        $base = ['website' => 3500000, 'store' => 6500000, 'brand' => 2500000][$service];
        $factor = ['1' => 10, '1.5' => 15, '2.2' => 22][$scope];
        $raw = intdiv($base * $factor, 10) + ($cms ? 1200000 : 0);
        $low = intdiv($raw + 50000, 100000) * 100000;
        $high = intdiv($low * 13 + 500000, 1000000) * 100000;
        $id = bin2hex(random_bytes(16));
        $this->repo->run('INSERT INTO estimates(id, user_id, session_hash, service, scope, cms, low_satang, high_satang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [$id, $this->session->userId(), $this->session->userId() === null ? $this->session->hash : null, $service, $scope, (int) $cms, $low, $high, time()]);
        return $this->publicRow($this->repo->owned('estimates', $this->session, $id)[0]);
    }

    private function publicRow(array $row): array
    {
        return array_intersect_key($row, array_flip(['id', 'service', 'scope', 'cms', 'low_satang', 'high_satang', 'created_at']));
    }

    public function list(?string $id = null): array
    {
        $rows = $this->repo->owned('estimates', $this->session, $id);
        if ($id !== null && !$rows) {
            Http::fail(404, 'Estimate not found.');
        }
        return array_map($this->publicRow(...), $rows);
    }
}
