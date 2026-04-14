const db = db.getSiblingDB('market_db');

// admin 제외 모든 계정 삭제
const deleteResult = db.users.deleteMany({ userId: { $ne: 'admin' } });
print('Deleted non-admin users:', deleteResult.deletedCount);

// admin 계정 존재 여부 확인 후 평문 업데이트 또는 생성
const adminUser = db.users.findOne({ userId: 'admin' });

if (adminUser) {
    db.users.updateOne(
        { userId: 'admin' },
        { $set: { password: 'admin', role: 'Admin', securityAnswer: 'admin' } }
    );
    print('Updated admin password to plaintext "admin"');
} else {
    db.users.insertOne({
        userId: 'admin',
        password: 'admin',
        role: 'Admin',
        securityAnswer: 'admin',
        createdAt: new Date()
    });
    print('Created new admin account with password "admin"');
}

// 최종 결과 확인
const finalUsers = db.users.find().toArray();
print('Final users in DB:', JSON.stringify(finalUsers, null, 2));
