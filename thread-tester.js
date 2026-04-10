const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
    // 200개의 워커를 동시에 띄워봅니다.
    const max = 200; 
    let active = 0;
    let completed = 0;
    console.log(`🚀 [스트레스 테스트] 워커 스레드 ${max}개 동시 투입 시작!`);
    console.log(`   (CPU는 8코어지만, 네트워크 대기라고 가정하고 2초 슬립)`);
    const start = Date.now();

    for (let i = 0; i < max; i++) {
        const worker = new Worker(__filename);
        active++;
        worker.on('message', (msg) => {
            completed++;
            if (completed === max) {
                console.log(`\n✅ [테스트 완료] ${max}개 스레드 무사통과! 컴퓨터 뻗지 않음.`);
                console.log(`⏱️ 총 소요시간: ${(Date.now() - start)/1000}초`);
                process.exit(0);
            }
        });
        worker.on('error', (err) => console.error(`에러!: ${err}`));
    }
    console.log(`💥 순간 동시 가동 요청 완료: ${active}개`);
} else {
    // 워커 스레드: 외부 API 호출을 기다린다고 가정한 IO 딜레이(2초)
    setTimeout(() => {
        parentPort.postMessage('Done');
    }, 2000);
}
