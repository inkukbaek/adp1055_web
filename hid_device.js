export class HID_DEVICE {

    constructor(vendorId, productId, packetSize, debug=false) {
        let device;
        this.device = device;
        this.vendorId = vendorId;
        this.productId = productId;
        this.packetSize = packetSize;

        this.queueHID = [];
        this.processingHID = false;
        this.debug = debug;
    }

    async initHIDDevice() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            let device
            const filters = [{ vendorId: 0x04D8, productId: 0x00DD }];
            [device] = await navigator.hid.requestDevice({ filters });
            if (!device) {
              throw new Error('No device selected...');
            } else {
                this.device = device
            }

            if (!device.opened) {
                await device.open();
            }
            if (device.opened) {
                const response = {message:`${this.device.productName} is connected`};
                if (this.debug===1) {
                    console.log(methodName, `${this.device.productName} is connected`)
                }
                return response
            }
            else {
                throw new Error('HID Device connection failed');
            }

        } catch (error) {
            throw new Error(`Error: ${error.message}`);
        }

    }

    buildWritePacket(command, parameter=[]) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        const packet = [command, ...parameter, ...Array(this.packetSize - 2 - parameter.length).fill(0)];
        if (this.debug===2) {
            console.log(methodName, 'Packet:', packet);
        };

        return packet
    }

    async sendAndReceiveHIDReport(sendPacket, reportId = 0) {
        const stack = new Error().stack.split("\n")[1];
        const methodNameMatch = stack.match(/at (\S+)/);
        const methodName = methodNameMatch ? methodNameMatch[1] : "UnknownMethod";

        try {
            this.processingHID = true;
            // 🔹 패킷 수신 대기
            const reportPromise = new Promise((resolve, reject) => {
                const handleInputReport = (event) => {
                    try {
                        const { data, reportId: receivedReportId } = event;
                        const receivedData = new Uint8Array(data.buffer);

                        if (receivedReportId !== reportId) return;  // 다른 리포트 ID는 무시
                        this.device.removeEventListener("inputreport", handleInputReport);

                        if (this.debug === 2) {
                            console.log(`${methodName} Received Data:`, receivedData);
                        }

                        resolve(receivedData.slice(0, this.packetSize));
                    } catch (error) {
                        console.error(`Error(${methodName}):`, error);
                        reject(error);
                    }
                };

                this.device.addEventListener("inputreport", handleInputReport, { once: true });
            });
             // 🔹 패킷 전송
             await this.device.sendReport(reportId, new Uint8Array(sendPacket));
            // 🔹 패킷 수신 대기 및 수신 후 결과 받기
            const receivedData = await reportPromise;

            // 🔹 패킷 수신 후 딜레이 추가
            await this.sleep(10);
            this.processingHID = false;

            return receivedData;

        } catch (error) {
            console.error(`Error(${methodName}):`, error);
            throw error;
        }
    }


    async enqueueHIDComm(task) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name

        const taskPromise = new Promise((resolve, reject) => {
            const queueItem = { task, resolve, reject };
            this.queueHID.push(queueItem);
        });
        // console.log(methodName, taskPromise)
        if (!this.processingHID) {
            setTimeout(() => this.processNextHIDComm(), 0);
        }

        return taskPromise;
    }

    async processNextHIDComm() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        // console.log(methodName, this.processingHID, this.queueHID.length)
        if (this.processingHID) {
            // console.warn(`Warning(${methodName}):`, 'processing');
            return;
        }
        if (this.queueHID.length ===0 ) {
            // console.warn(`Warning(${methodName}):`, 'no pending HID task');
            return;
        }
        this.processingHID = true;
        const queueItem = this.queueHID.length > 0 ? this.queueHID.shift() : null;
        if (!queueItem) {  // ❌ queue가 변경되어 shift() 결과가 undefined이면 즉시 종료
            console.warn(`Warning(${methodName}):`, 'queue became empty');
            this.processingHID = false;
            return;
        }
        const { task, resolve, reject } = queueItem;

        try {
            // console.log(`Log(${methodName}):`, 'task running');
            // console.log(task)
            const result = await task();
            // console.log(`Log(${methodName}):`, result);
            resolve(result);
        } catch (error) {
            // console.error(`Error(${methodName}):`, error);
            reject(error);
        } finally {
            this.processingHID = false;
            if (this.queueHID.length > 0) {
                setTimeout(() => this.processNextHIDComm(), 0);
            }
        }

    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}