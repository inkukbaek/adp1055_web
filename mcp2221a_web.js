// export let mcp;
import { HID_DEVICE } from './hid_device.js';

export class MCP2221 extends HID_DEVICE {
    static PACKET_SIZE = 64;
    // MCP commands
    static CMD_HEADER = 0x00;
    static CMD_BYTE = 0;
    static CMD_SUCCESS_BYTE = 1;

    static SET_GP = 0x50;
    static SET_GP0_ALTER_VALUE_BYTE = 2;
    static SET_GP0_VALUE_BYTE = 3;
    static SET_GP0_ALTER_DIRECTION_BYTE = 4;
    static SET_GP0_DIRECTION_BYTE = 5;
    static SET_GP1_ALTER_VALUE_BYTE = 6;
    static SET_GP1_VALUE_BYTE = 7;
    static SET_GP1_ALTER_DIRECTION_BYTE = 8;
    static SET_GP1_DIRECTION_BYTE = 9;
    static SET_GP2_ALTER_VALUE_BYTE = 10;
    static SET_GP2_VALUE_BYTE = 11;
    static SET_GP2_ALTER_DIRECTION_BYTE = 12;
    static SET_GP2_DIRECTION_BYTE = 13;
    static SET_GP3_ALTER_VALUE_BYTE = 14;
    static SET_GP3_VALUE_BYTE = 15;
    static SET_GP3_ALTER_DIRECTION_BYTE = 16;
    static SET_GP3_DIRECTION_BYTE = 17;


    static GET_GP = 0x51;
    static GET_GP0_VALUE_BYTE = 2;
    static GET_GP0_DIRECTION_BYTE = 3;
    static GET_GP1_VALUE_BYTE = 4;
    static GET_GP1_DIRECTION_BYTE = 5;
    static GET_GP2_VALUE_BYTE = 6;
    static GET_GP2_DIRECTION_BYTE = 7;
    static GET_GP3_VALUE_BYTE = 8;
    static GET_GP3_DIRECTION_BYTE = 9;

    static SET_SRAM = 0x60;
    static SET_SRAM_NO_CHANGE = 0x00;
    static SET_SRAM_CLK_DIV_BYTE = 2;
    static SET_SRAM_DAC_REF_BYTE = 3;
    static SET_SRAM_DAC_OUTPUT_BYTE = 4;
    static SET_SRAM_ADC_REF_BYTE = 5;
    static SET_SRAM_INT_BYTE = 6;
    static SET_SRAM_ALTER_GP_SET_BYTE = 7;
    static SET_SRAM_ALTER_GP_SET = 0x80; // datasheet says this should be 1, but should actually be 0x80
    static SET_SRAM_GP_0_SET_BYTE = 8;
    static SET_SRAM_GP_1_SET_BYTE = 9;
    static SET_SRAM_GP_2_SET_BYTE = 10;
    static SET_SRAM_GP_3_SET_BYTE = 11;
    static SET_SRAM_GP_SET_OUTPUT_LOW = 0x00;
    static SET_SRAM_GP_SET_OUTPUT_HIGH = 0x10;
    static SET_SRAM_GP_SET_INPUT = 0x08;

    static GET_SRAM = 0x61;
    static GET_SRAM_CLK_DIV_BYTE = 5;
    static GET_SRAM_DAC_REF_BYTE = 6;
    static GET_SRAM_ADC_INT_BYTE = 7;
    static GET_SRAM_USB_VID_LSB_BYTE = 8;
    static GET_SRAM_USB_VID_MSB_BYTE = 9;
    static GET_SRAM_USB_PID_LSB_BYTE = 10;
    static GET_SRAM_USB_PID_MSB_BYTE = 11;
    static GET_SRAM_USB_POWER_ATTR_BYTE = 12;
    static GET_SRAM_USB_POWER_BYTE = 13;
    static GET_SRAM_PASSWD_1_BYTE = 14;
    static GET_SRAM_PASSWD_2_BYTE = 15;
    static GET_SRAM_PASSWD_3_BYTE = 16;
    static GET_SRAM_PASSWD_4_BYTE = 17;
    static GET_SRAM_PASSWD_5_BYTE = 18;
    static GET_SRAM_PASSWD_6_BYTE = 19;
    static GET_SRAM_PASSWD_7_BYTE = 20;
    static GET_SRAM_PASSWD_8_BYTE = 21;
    static GET_SRAM_GP0_SET_BYTE = 22;
    static GET_SRAM_GP1_SET_BYTE = 23;
    static GET_SRAM_GP2_SET_BYTE = 24;
    static GET_SRAM_GP3_SET_BYTE = 25;

    static I2C_WRITE_DATA = 0x90;
    static I2C_WRITE_DATA_LOW_BYTE = 1;
    static I2C_WRITE_DATA_HIGH_BYTE = 2;
    static I2C_WRITE_DATA_SLAVE_ADDR_BYTE = 3;

    static I2C_READ_DATA = 0x91;
    static I2C_WRITE_DATA_REPEATED_START = 0x92;
    static I2C_READ_REPEATED_START = 0x93;
    static I2C_WRITE_DATA_NO_STOP = 0x94;
    static I2C_READ = 0x40;
    static STATUS_SET_PARAM = 0x10;
    static I2C_CANCEL_BYTE = 2;
    static I2C_CANCEL = 0x10;
    static I2C_SPEED_SET_BYTE = 3;
    static I2C_SPEED_BYTE = 4;
    static I2C_SPEED_SET = 0x20;

    static MCP_RESET_0 = 0x70;
    static MCP_RESET_1 = 0xAB;
    static MCP_RESET_2 = 0xCD;
    static MCP_RESET_3 = 0xEF;

    constructor() {
        const vendorId = 0x04D8;
        const productId = 0x00DD;
        const packetSize = MCP2221.PACKET_SIZE;
        const debug = false;
        super(vendorId, productId, packetSize, debug);
        this.I2C_DELAY = 10;
        this.RESET_DELAY = 1000;
        this.processingI2C = false;
        this.queueI2C = [];
        this.defaultI2CAddr = 0xb0;
    }

    async init() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        const response = await this.initHIDDevice();

        return response
    }

    async init_state(mcp2221a_freq) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        this.dev_addr = this.defaultI2CAddr;
        // read SRAM
        try {
            const get_sram_command = [...Array(MCP2221.PACKET_SIZE).fill(0)];
            get_sram_command[MCP2221.CMD_BYTE] = MCP2221.GET_SRAM;
            const receivedData = await this.sendAndReceiveHIDReport(get_sram_command);
            // console.log("Final received data:", receivedData);
            const clk_div_set = receivedData[MCP2221.GET_SRAM_CLK_DIV_BYTE];
            const dac_ref_set = receivedData[MCP2221.GET_SRAM_DAC_REF_BYTE];
            const adc_int_set = receivedData[MCP2221.GET_SRAM_ADC_INT_BYTE];
        } catch (error) {
            console.error("Error during communication:", error);
        }
        // gpio init by set SRAM
        try {
            const init_set_sram_command = [...Array(MCP2221.PACKET_SIZE).fill(0)];
            init_set_sram_command[MCP2221.CMD_BYTE] = MCP2221.SET_SRAM;
            init_set_sram_command[MCP2221.SET_SRAM_ALTER_GP_SET_BYTE] = MCP2221.SET_SRAM_ALTER_GP_SET;
            init_set_sram_command[MCP2221.SET_SRAM_GP_0_SET_BYTE] = MCP2221.SET_SRAM_GP_SET_OUTPUT_LOW;
            init_set_sram_command[MCP2221.SET_SRAM_GP_1_SET_BYTE] = MCP2221.SET_SRAM_GP_SET_OUTPUT_LOW;
            init_set_sram_command[MCP2221.SET_SRAM_GP_2_SET_BYTE] = MCP2221.SET_SRAM_GP_SET_OUTPUT_LOW;
            init_set_sram_command[MCP2221.SET_SRAM_GP_3_SET_BYTE] = MCP2221.SET_SRAM_GP_SET_OUTPUT_LOW;
            const receivedData = await this.sendAndReceiveHIDReport(init_set_sram_command);
        } catch (error) {
            console.error("Error during communication:", error);
        }
        // i2c init by set STATUS_SET_PARAM
        try {
            const i2c_speed_hz = mcp2221a_freq*1000;
            const i2c_speed_value = ((12000000 / i2c_speed_hz) - 3);
            const i2c_speed_command = [...Array(MCP2221.PACKET_SIZE).fill(0)];
            i2c_speed_command[MCP2221.CMD_BYTE] = MCP2221.STATUS_SET_PARAM;
            i2c_speed_command[MCP2221.I2C_SPEED_SET_BYTE] = MCP2221.I2C_SPEED_SET;
            i2c_speed_command[MCP2221.I2C_SPEED_BYTE] = i2c_speed_value;
            const receivedData = await this.sendAndReceiveHIDReport(i2c_speed_command);
        } catch (error) {
            console.error("Error during communication:", error);
        }
    }

    async toggleGpioPin(pin) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            const pin_states = await this.gpioGetPins();
            let toggled_state;
            if (pin_states[pin]) {
                toggled_state = 0;
            } else {
                toggled_state = 1;
            }
            const newState = await this.gpioSetPin(pin, toggled_state);
            console.log(methodName, 'newState', newState);
            return newState;

        } catch (error) {
            console.error(`Error(${methodName}):`, error);
        }
    }

    async gpioSetPin(pin, state) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            if (state) {
                state = 1;
            } else {
                state = 0;
            }
            const byte_address_shift = 4;
            const param = [...new Array(4*4).fill(0)];
            param[pin*byte_address_shift] = 0x01; // alter output state
            param[pin*byte_address_shift+1] = state; // output state
            // param[pin+2] = 0x00 // alter direction - do not alter direction ( alter == 1)
            // param[pin+3] = 0x00 // output direction - don't care ( 0x00: output, 0x01 or any other value: input)
            const command = this.buildWritePacket(MCP2221.SET_GP, [0x00, ...param]);
            const receivedData = await this.sendAndReceiveHIDReport(command);
            // console.log("Final received data:", receivedData);
            return state;
        } catch (error) {
            console.error(`Error(${methodName}):`, error);
        }
    }

    async gpioGetPins() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            const get_gp_command = this.buildWritePacket(MCP2221.GET_GP);
            const receivedData = await this.sendAndReceiveHIDReport(get_gp_command);
            if (receivedData[1] == 0) {
                // decode gpio direction from response for future use.
                const gp_direction = [
                    receivedData[MCP2221.GET_GP0_DIRECTION_BYTE],
                    receivedData[MCP2221.GET_GP1_DIRECTION_BYTE],
                    receivedData[MCP2221.GET_GP2_DIRECTION_BYTE],
                    receivedData[MCP2221.GET_GP3_DIRECTION_BYTE]
                ];
                // decode gpio status from response.
                const gp_status = [
                    receivedData[MCP2221.GET_GP0_VALUE_BYTE],
                    receivedData[MCP2221.GET_GP1_VALUE_BYTE],
                    receivedData[MCP2221.GET_GP2_VALUE_BYTE],
                    receivedData[MCP2221.GET_GP3_VALUE_BYTE]
                ];
                return gp_status;
            }
            else {
                console.error("MCP Error: byte 1 is not 0");
                return false
            }

        } catch (error) {
            console.error("Error during communication:", error);
            return false;
        }
    }


    async enqueue(task) {
        return new Promise((resolve, reject) => {
            this.queueI2C.push({ task, resolve, reject });  // 큐에 작업 추가
            this.processQueue();  // 작업 처리 시작
        });
    }

    async processQueue() {
        if (this.processingI2C || this.queueI2C.length === 0) return;

        this.processingI2C = true;
        const { task, resolve, reject } = this.queueI2C.shift();  // 큐에서 작업 꺼내기

        try {
            const result = await task();  // 작업 실행
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.processingI2C = false;
            if (this.queueI2C.length > 0) {
                setTimeout(() => this.processQueue(), 0);  // 다음 작업 처리
            }
        }
    }


    /**
     *
     * @param {number} i2c_slave_addr
     * @param {number} i2c_reg_addr
     * @param {number[]} data
     * @param {boolean} read_back
     * @returns {object}    result of i2c read operation
     * @returns {number}    return.addr - register address
     * @returns {number[]}  return.data - array of write data
     * @returns {boolean}   return.success - communication success or not
     */
    async i2cWrite(i2c_slave_addr, i2c_reg_addr, data, read_back=false) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            this.dev_addr = i2c_slave_addr;
            const reg_addr = i2c_reg_addr;
            const transfer_length_low = data.length + 1; // reg_address + num of data
            const transfer_length_high = 0x00;
            const param_w = [transfer_length_low, transfer_length_high, this.dev_addr, reg_addr, ...data];
            const command_w = this.buildWritePacket(MCP2221.I2C_WRITE_DATA, param_w);
            const receivedData = await this.sendAndReceiveHIDReport(command_w);
            await this.sleep(this.I2C_DELAY)
            let write_success;
            write_success = true;
            if (receivedData[1]==0x01) { // error check, error if data[1] is 0x41
                write_success = false;
            };
            return {"addr":reg_addr, "data":data, "success":write_success};;
        } catch (error) {
            await this.i2cCancel();
            console.error("Error during communication:", error);
        }

    }

    /**
     *
     * @param {number} i2c_slave_addr
     * @param {number} i2c_reg_addr
     * @param {number} i2c_length
     * @returns {object}    result of i2c read operation
     * @returns {number}    return.addr - register address
     * @returns {number[]}  return.data - array of read data
     * @returns {boolean}   return.success - communication success or not
     */
    async i2cRead(i2c_slave_addr, i2c_reg_addr, i2c_length=1) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        return this.enqueue(async () => {
            if (this.debug===1) {
                console.log(methodName);
            }
            await this.sleep(10);
            let write_success;
            this.dev_addr = i2c_slave_addr;
            const reg_addr = i2c_reg_addr;

            let param_w_ns = [];
            if (reg_addr > 0xFF) {
                const reg_addr_high = (i2c_reg_addr >> 8) & 0xFF;
                const reg_addr_low = i2c_reg_addr & 0xFF;
                param_w_ns = [2, 0, this.dev_addr, reg_addr_high, reg_addr_low ];
            } else {
                param_w_ns = [1, 0, this.dev_addr, reg_addr];
            }
            const command_w_ns = this.buildWritePacket(MCP2221.I2C_WRITE_DATA_NO_STOP, param_w_ns);

            const transfer_length_low = i2c_length;
            const transfer_length_high = 0x00;
            const param_r_rs = [transfer_length_low, transfer_length_high, this.dev_addr];
            const command_r_rs = this.buildWritePacket(MCP2221.I2C_READ_REPEATED_START, param_r_rs);

            const command_r = this.buildWritePacket(MCP2221.I2C_READ);

            try {

                // const receivedData = await this.sendAndReceiveHIDReport(command_w_ns);
                const receivedData = await this.sendAndReceiveHIDReport(command_w_ns);
                // await this.sleep(10);
                if (receivedData[1]==0x01) { // error check, error if data[1] is 0x41
                    write_success = false;
                    console.log('receivedData', receivedData)
                    throw new Error("MCP2221A - I2C Engine Busy(0x94)!");
                };
            } catch (error) {
                await this.i2cCancel();
                console.error("Error during communication:", error);
            }
            // error check here
            try {
                const receivedData = await this.sendAndReceiveHIDReport(command_r_rs);
                // await this.sleep(10);
                if (receivedData[1]==0x01) { // error check, error if data[1] is 0x41
                    write_success = false;
                    console.log('receivedData', receivedData)
                    throw new Error("MCP2221A - I2C Engine Busy(0x93)!");
                };
            } catch (error) {
                await this.i2cCancel();
                console.error("Error during communication:", error);
            }
            // error check here
            try {
                await this.sleep(10);
                const receivedData = await this.sendAndReceiveHIDReport(command_r);
                await this.sleep(10);
                // await this.sleep(this.I2C_DELAY)
                let read_success;
                read_success = true;
                if (receivedData[1]==0x41) { // error check, error if data[1] is 0x41
                    read_success = false;
                    if (receivedData[1]==0x01) { // error check, error if data[1] is 0x41
                        read_success = false;
                        console.log('receivedData', receivedData)
                        throw new Error("MCP2221A - Read Error I2C Slave Data from the I2C Engine!");
                    };
                };
                const i2c_state = receivedData[2]; // error check, internal i2c engine state
                const num_bytes = receivedData[3]; // num of bytes
                const r_data = Array.from(receivedData.slice(4, 4+i2c_length));
                console.log(methodName, {"addr":reg_addr, "data":r_data, "success":read_success})
                return {"addr":reg_addr, "data":r_data, "success":read_success};
            } catch (error) {
                await this.i2cCancel();
                console.error("Error during communication:", error);
            }
                // error check here

        });

    }

    /**
     *
     * @param {number} i2c_slave_addr
     * @param {number} i2c_reg_addr
     * @param {number[]} bitPositions
     * @param {number[]} bitValues
     * @param {boolean} read_back
     * @returns {object}    result of i2c read operation
     * @returns {number}    return.addr - register address
     * @returns {number[]}  return.data - array of read data
     * @returns {boolean}   return.success - communication success or not
     */
    async i2cUpdateByte(i2c_slave_addr, i2c_reg_addr, bitPositions, bitValues, read_back=false) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            const response_read = await this.i2cRead(i2c_slave_addr, i2c_reg_addr);
            console.log('i2cUpdateByte', response_read);
            if (!response_read.success) {
                logMessage('i2cUpdateByte: Read Error');
                return response_read;
            }
            const written_value = response_read.data;
            const update_value = await this.updateBits(written_value, bitPositions, bitValues);
            const response_write = await this.i2cWrite(i2c_slave_addr, i2c_reg_addr, [update_value]);
            console.log('i2cUpdateByte', response_write);
            if (!response_write.success) {
                logMessage('i2cUpdateByte: Read Error');
            }
            return response_write;
        } catch (error) {
            await this.i2cCancel();
            console.error("Error during communication:", error);
        }
    }

    async i2cCancel() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            const param = [MCP2221.I2C_CANCEL];
            const command = this.buildWritePacket(MCP2221.STATUS_SET_PARAM, [0x00, ...param])
            const receivedData = await this.sendAndReceiveHIDReport(command);
            return receivedData;
        } catch (error) {
            console.error("Error during communication:", error);
        }
    }

    async reset() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            const param = [MCP2221.MCP_RESET_1, MCP2221.MCP_RESET_2, MCP2221.MCP_RESET_3];
            const command = this.buildWritePacket(MCP2221.MCP_RESET_0, [...param]);
            const reportId = 0;
            await this.device.sendAndReceiveHIDReport(reportId, command);
            await sleep(this.RESET_DELAY);
            logMessage('MCP2221A is now reset');
        } catch (error) {
            console.error("Error during communication:", error);
        }
    }

    async i2cSearchSlaveAddress(candidates=[]) {
        // read register address 0x00 with all given slave address
        // if read success without error, then save slave address with 8bit W format
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        try {
            let i2c_slave_addr_found = [];
            candidates = Array.from( {length:0x77-0x08+1}, (_, i) => i+0x08);
            console.log(candidates);
            if (candidates.length === 0) {
                // no input search full range with general I2C address (7-bit address)
                candidates = Array.from( {length:0x77-0x08}, (_, i) => i+0x08);
            }
            for (let i = 0; i < candidates.length; i++) {
                const address_7bit = candidates[i];
                const address_8bit = address_7bit*2;
                const read = await this.i2cRead(address_8bit, 0x00, 1);
                if (read.success) {
                    i2c_slave_addr_found.push(address_8bit);
                }
            }
            logMessage(`Found I2C ADDR: [${Array.from(i2c_slave_addr_found).map(x => x.toString(16).toUpperCase().padStart(4, '0x')).join(', ')}]`);
            return i2c_slave_addr_found;
        } catch (error) {
            await this.i2cCancel();
            console.error("Error during communication:", error);
        }

    }

    updateBits(number, bitPositions, bitValues) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        for (let i = 0; i < bitPositions.length; i++) {
            const bitPosition = bitPositions[i];
            const bitValue = bitValues[i];
            if (bitValue === 1) {
                number |= (1 << bitPosition);
            } else if (bitValue === 0) {
                number &= ~(1 << bitPosition);
            }
        };
        if (this.debug) {
            console.log(methodName, 'updateBits number:', number);
        };
        return number;
    }
  }

  function logMessage(...messages) {
    const log = document.getElementById('log');
    const combinedMessage = messages.join(' ');
    const timestamp = new Date().toLocaleTimeString();
    log.textContent += `[${timestamp}] ${combinedMessage}\n`;
    log.scrollTop = log.scrollHeight; // Scroll to the bottom
  }

  function hexString(num) {
      return num.toString(16).toUpperCase().padStart(4, '0x');
  }

  function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }