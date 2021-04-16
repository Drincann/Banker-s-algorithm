class OS {
    constructor({ available, max, alloc, need }) {
        this.available = available;
        this.max = max;
        this.alloc = alloc;
        this.need = need;
    }

    /**
     * pid 指代的进程请求资源
     * @param {number} pid 进程 id
     * @param {number} req 申请资源向量 
     * @returns {boolean} 是否允许执行
     */
    request({ pid, req }) {
        for (const resourceId in req) {
            if (// 有没有超过进程的资源数量声明
                req[resourceId] > this.need[pid][resourceId]
            ) {
                return { isSafe: false, stack: [] };
            }

            if (// 现存资源是否不足分配
                req[resourceId] > this.available[resourceId]) {
                return { isSafe: true, stack: [] };

            }
        }

        // 尝试分配资源
        for (const resourceId in req) {
            // 已分配资源增加计数
            this.alloc[pid][resourceId] += req[resourceId];
            // 剩余资源减少计数
            this.available[resourceId] -= req[resourceId];
            // 该进程需要的资源减少计数
            this.need[pid][resourceId] -= req[resourceId];
        }

        // 寻找一条可行的通路
        const { isSafe, stack } = this.find();
        if (!isSafe) {
            for (const resourceId in req) {
                // 分配资源将进入不安全状态，恢复试探分配的资源
                // 已分配资源减少计数
                this.alloc[pid][resourceId] -= req[resourceId];
                // 剩余资源增加计数
                this.available[resourceId] += req[resourceId];
                // 该进程需要的资源增加计数
                this.need[pid][resourceId] += req[resourceId];
            }
        }
        return { isSafe, stack };
    }

    /**
     * 寻找一条到运行结束状态的通路
     */
    find() {
        // 可提供资源的拷贝，寻找通路的状态记录
        let tempAvailable = JSON.parse(JSON.stringify(this.available));
        // finish 置 false
        const finish = [...new Array(this.max.length).keys()].map(() => false);

        // 执行栈
        const stack = [];

        // 循环中是否有调度行为发生
        let dispatchDetected = true;

        while (
            // 如果一次遍历进程没有调度行为发生，则跳出循环结算状态
            dispatchDetected &&
            // 如果未执行完毕的进程不存在，则跳出循环结算状态
            finish.filter(isFinish => isFinish == false).length
        ) {
            // 假定本次循环调度未发生
            dispatchDetected = false;
            for (const pid in finish) {
                if (
                    // 当前进程未结束
                    finish[pid] == false &&
                    // 需求资源足够分配
                    !(tempAvailable
                        // 需求资源数量超出剩余资源数量的-
                        .filter((resourceCount, resourceId) => this.need[pid][resourceId] > resourceCount)
                        // 资源存在
                        .length > 0)
                ) {
                    // 调度发生
                    dispatchDetected = true;
                    // 剩余资源增加计数
                    tempAvailable = tempAvailable.map((resourceCount, resourceId) => resourceCount + this.alloc[pid][resourceId]);
                    // 被调度的进程结束
                    finish[pid] = true;
                    //执行栈顺序记录
                    stack.push(pid);
                }
            }
        }

        // 检查所有进程是否结束
        if (finish.filter(isFinish => isFinish).length == finish.length) {
            return { isSafe: true, stack };
        }
        return { isSafe: false, stack };
    }

    /**
     * 进程主动释放资源
     */
    release(pid) {
        for (const resourceId in this.available) {
            // 剩余资源增加计数
            this.available[resourceId] += this.alloc[pid][resourceId];
            // 该进程需要的资源置 0
            this.need[pid][resourceId] = 0;
            // 已分配资源置 0
            this.alloc[pid][resourceId] = 0;
        }
    }
}

/**
 * 生成书上例子所示状态的 OS 实例
 * @returns {OS}
 */
function factory() {
    return new OS({
        available: [3, 3, 2],
        max: [
            [7, 5, 3],
            [3, 2, 2],
            [9, 0, 2],
            [2, 2, 2],
            [4, 3, 3],
        ],
        alloc: [
            [0, 1, 0],
            [2, 0, 0],
            [3, 0, 2],
            [2, 1, 1],
            [0, 0, 2],
        ],
        need: [
            [7, 4, 3],
            [1, 2, 2],
            [6, 0, 0],
            [0, 1, 1],
            [4, 3, 1],
        ],
    });
}

(function main() {
    // 过程 1
    console.log('\n过程 1');
    let os = factory();

    let status = os.find();
    console.log(`初始状态        : ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 1, req: [1, 0, 2] });
    console.log(`p1 申请 [1 0 2]: ${status.isSafe ? '安全状态   ' : '不安全状态'} ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 4, req: [3, 3, 0] });
    console.log(`p4 申请 [3 3 0]: ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 0, req: [0, 2, 0] });
    console.log(`p0 申请 [0 2 0]: ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    // 过程 2
    console.log('\n过程 2');
    os = factory();

    status = os.find();
    console.log(`初始状态        : ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 1, req: [1, 0, 2] });
    console.log(`p1 申请 [1 0 2]: ${status.isSafe ? '安全状态   ' : '不安全状态'} ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 4, req: [3, 3, 0] });
    console.log(`p4 申请 [3 3 0]: ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 0, req: [0, 1, 0] });
    console.log(`p0 申请 [0 1 0]: ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    // 过程 3
    console.log('\n过程 3');
    os = factory();

    status = os.find();
    console.log(`初始状态        : ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 1, req: [1, 0, 2] });
    console.log(`p1 申请 [1 0 2]: ${status.isSafe ? '安全状态   ' : '不安全状态'} ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 4, req: [3, 3, 0] });
    console.log(`p4 申请 [3 3 0]: ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    os.release(4);
    status = os.find();
    console.log(`p4 释放资源    : ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);

    status = os.request({ pid: 0, req: [0, 2, 0] });
    console.log(`p0 申请 [0 2 0]: ${status.isSafe ? '安全状态  ' : '不安全状态'}  ${status.isSafe && status.stack.length == 0 ? '资源不足分配，等待           ' : !status.isSafe ? '不分配资源                  ' : `可行的进程执行通路: ${status.stack}`}`, `  Available: ${os.available}`);
})();