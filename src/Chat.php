<?php

declare(strict_types=1);

namespace StackNova;

final class Chat
{
    public function __construct(private readonly Repository $repo, private readonly Session $session)
    {
    }

    public static function answer(string $message): string
    {
        $text = strtolower($message);
        foreach ([
            ['price', 'cost', 'budget', 'estimate', 'baht', 'ราคา', 'ค่าใช้จ่าย', 'งบ', 'ประเมิน', 'บาท'],
            ['time', 'long', 'week', 'deadline', 'ระยะเวลา', 'นาน', 'สัปดาห์', 'กำหนดส่ง'],
            ['cms', 'update', 'content', 'แก้ไข', 'เนื้อหา', 'อัปเดต', 'จัดการข้อมูล'],
            ['where', 'location', 'bangkok', 'remote', 'ที่ไหน', 'ที่ตั้ง', 'กรุงเทพ', 'ออนไลน์'],
        ] as $group => $words) {
            foreach ($words as $word) {
                if (str_contains($text, $word)) {
                    return [
                        'Website planning starts at ฿35,000, stores at ฿65,000, and branding at ฿25,000, excluding VAT and third-party fees. Use the estimator for a scope-based range. Prices are indicative, not a binding quotation.',
                        'Websites typically take 4–6 weeks; stores 6–10 weeks after scope and content approval. Your agreed proposal confirms the actual timeline.',
                        'CMS setup can be included for websites or stores at an indicative ฿12,000. Editing features and training are confirmed in the proposal.',
                        'The website describes a Bangkok-based studio offering remote collaboration. Use the configured business contact for verified availability.',
                    ][$group];
                }
            }
        }
        return 'I am an automated studio guide, not generative AI or a human operator. I can explain pricing, timelines, and CMS options. Your conversation is saved privately for your session or account. Use the estimator to begin, and the business contact for human assistance.';
    }

    public function send(array $data): array
    {
        $message = Http::text($data, 'message', 4000);
        if (preg_match_all('/./us', $message) > 1000) {
            Http::fail(422, 'Messages may contain at most 1000 characters.');
        }
        $this->repo->limit('chat', $this->session->hash, 40);
        $reply = self::answer($message);
        $this->repo->db->beginTransaction();
        try {
            foreach (['user' => $message, 'assistant' => $reply] as $role => $body) {
                $this->repo->run('INSERT INTO chat_messages(user_id, session_hash, role, body, created_at) VALUES (?, ?, ?, ?, ?)', [$this->session->userId(), $this->session->userId() === null ? $this->session->hash : null, $role, $body, time()]);
            }
            $this->repo->db->commit();
        } catch (\Throwable $error) {
            $this->repo->db->rollBack();
            throw $error;
        }
        return ['reply' => $reply];
    }

    public function history(): array
    {
        return array_map(static fn(array $row): array => array_intersect_key($row, array_flip(['id', 'role', 'body', 'created_at'])), array_reverse($this->repo->owned('chat_messages', $this->session)));
    }
}
