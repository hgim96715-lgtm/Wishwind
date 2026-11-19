-- '연속 11회 등'이 뜻을 알기 어려워 풀어 씀
UPDATE sentences SET penalty='가석방 없는 종신형 (범행마다 선고된 종신형을 이어서 복역)', updated_at=now()
WHERE penalty='가석방 없는 종신형 (연속 11회 등)';
