const { HttpException, HttpStatus } = require('@nestjs/common');

function mockProcessMultiPayerPayment() {
    throw new HttpException("Saldo tidak cukup untuk menyelesaikan transaksi.", HttpStatus.PAYMENT_REQUIRED);
}

async function run() {
    try {
        console.log("Calling mockProcessMultiPayerPayment...");
        mockProcessMultiPayerPayment();
    } catch (err) {
        console.log("Caught err:", err);
        console.log("err.status:", err.status);
        console.log("err.message:", err.message);

        let includesSaldo = false;
        if (err.message && err.message.includes) {
            includesSaldo = err.message.includes('Saldo tidak cukup');
        } else if (typeof err.message === 'object' && err.message.message && err.message.message.includes) {
            includesSaldo = err.message.message.includes('Saldo tidak cukup');
        }

        console.log("Includes 'Saldo tidak cukup'?", includesSaldo);

        const condition = err.status === 402 || includesSaldo;
        console.log("Condition evaluates to:", condition);
    }
}

run();
