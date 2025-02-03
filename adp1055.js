export class ADP1055 {

    static PASSWORD = 0xFF;
    static EEPROM_PASSWORD = 0xD5;
    static EEPROM_PAGE = 0xB0;
    static WORD_LENGTH = 16;
    static BYTE_LENGTH = 8;
    static MANT_Y_WIDTH = 11;
    static EXP_N_WIDTH = 5;

    constructor(i2c_host_adapter, reg_map) {
        this.i2c_host_adapter = i2c_host_adapter;
        this.slave_addr = 0x80;
        this.reg_info_all = reg_map;
        this.regs = reg_map.regs_standard_pmbus;
        this.regs_mfr = reg_map.regs_mfr_pmbus;
        this.retry_cnt = 0;
        this.regs_user_all = {};
        this.regs_standard_pmbus = {};
        this.regs_mfr_pmbus = {};
    }

    async send_command(command) {
        const reg_addr = this.regs[command].reg_info.addr;
        const reg_addr_int = parseInt(reg_addr, 16)
        console.log(command, reg_addr)
        await this.i2c_host_adapter.i2cWrite(this.slave_addr, reg_addr, [])
        return {message: "ok", command: command, addr: reg_addr_int, addr_hex: reg_addr}
    }
    async setSlaveAddress(slave_addr) {
        if (this.slave_addr !== slave_addr) {
            this.slave_addr = slave_addr;
            console.log(`Slave Address updated: 0x${this.slave_addr.toString(16).padStart(2, "0")}`)
        }


    }

    async getRegisterInfo(reg_addr) {
        let regInfo;
        let regType;
        regInfo = Object.entries(this.regs).find(([reg_name, data]) => parseInt(data.reg_info.addr, 16) == reg_addr);
        regType = true
        if (regInfo == undefined) {
            regInfo = Object.entries(this.regs_mfr).find(([reg_name, data]) => parseInt(data.reg_info.addr, 16) == reg_addr);
            regType = false
        }
        return {message:"ok", name:regInfo[0], addr:regInfo[1].reg_info.addr, length:regInfo[1].reg_info.size}
    }

    async readRegister(reg_addr) {
        let regInfo;
        let regType;
        let result;
        regInfo = Object.entries(this.regs).find(([reg_name, data]) => parseInt(data.reg_info.addr, 16) == reg_addr);
        regType = true
        if (regInfo == undefined) {
            regInfo = Object.entries(this.regs_mfr).find(([reg_name, data]) => parseInt(data.reg_info.addr, 16) == reg_addr);
            regType = false
        }
        if (regInfo == undefined) {
            regType = undefined
        }

        if (regType === true) {
            console.log(`PMBUS Register`)
            result = await this.readRegisterData(reg_addr, parseInt(regInfo[1].reg_info.size))
            console.log(`Name: ${regInfo[0]}, Address: [${regInfo[1].reg_info.addr}, ${parseInt(regInfo[1].reg_info.addr, 16)}], Length: ${parseInt(regInfo[1].reg_info.size)}`)
        } else if (regType === false) {
            console.log(`MFR Register`)
            result = await this.readRegisterData(reg_addr, parseInt(regInfo[1].reg_info.size))
            console.log(`Name: ${regInfo[0]}, Address: [${regInfo[1].reg_info.addr}, ${parseInt(regInfo[1].reg_info.addr, 16)}], Length: ${parseInt(regInfo[1].reg_info.size)}`)
        } else {
            console.log(`No Register found`)
            result = undefined
        }
        return {message:"ok", result:result.result, name:regInfo[0], addr:regInfo[1].reg_info.addr, length:regInfo[1].reg_info.size}
    }

    async writeRegister(reg_addr, data) {
        let regInfo;
        let regType;
        let result;
        regInfo = Object.entries(this.regs).find(([reg_name, data]) => parseInt(data.reg_info.addr, 16) == reg_addr);
        regType = true
        if (regInfo == undefined) {
            regInfo = Object.entries(this.regs_mfr).find(([reg_name, data]) => parseInt(data.reg_info.addr, 16) == reg_addr);
            regType = false
        }
        if (regInfo == undefined) {
            regType = undefined
        }

        if (regType === true) {
            console.log(`PMBUS Register`)
            // result = await this.readRegisterData(reg_addr, parseInt(regInfo[1].reg_info.size))

            result = await this.writeRegisterData(reg_addr, data, parseInt(regInfo[1].reg_info.size))
            console.log(`Name: ${regInfo[0]}, Address: [${regInfo[1].reg_info.addr}, ${parseInt(regInfo[1].reg_info.addr, 16)}], Length: ${parseInt(regInfo[1].reg_info.size)}`)
        } else if (regType === false) {
            console.log(`MFR Register`)
            result = await this.readRegisterData(reg_addr, parseInt(regInfo[1].reg_info.size))
            console.log(`Name: ${regInfo[0]}, Address: [${regInfo[1].reg_info.addr}, ${parseInt(regInfo[1].reg_info.addr, 16)}], Length: ${parseInt(regInfo[1].reg_info.size)}`)
        } else {
            console.log(`No Register found`)
            result = undefined
        }
        return {message:"ok", result:result.result, name:regInfo[0], addr:regInfo[1].reg_info.addr, length:regInfo[1].reg_info.size}
    }

    async readRegisterData(reg_addr, size) {
        let result;
        if (size > 1) {
            result = await this.readWord(reg_addr);
        } else {
            result = await this.readByte(reg_addr);
        }
        console.log(`readRegisterData`)
        console.log(`result: ${result.result}`)
        return {message:"ok", result:result.result}
    }

    async writeRegisterData(reg_addr, data, size) {
        let result;
        if (size > 1) {
            result = await this.writeWord(reg_addr, data);
        } else {
            result = await this.writeByte(reg_addr, data);
        }
        console.log(`writeRegisterData`)
        console.log(`result: ${result.result}`)
        return {message:"ok", result:result.result}
    }

    async readByte(reg_addr) {
        const data_length = 1;
        let retry = 10;
        let pad_length;
        if (reg_addr>511) {
            pad_length = 4;
        } else {
            pad_length = 2;
        }
        console.log(this.slave_addr, reg_addr, this.to0xString(reg_addr, pad_length));
        let readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length)
        while (readData.data[0] == 255){
            await this.sleep(500);
            readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length)
            await this.sleep(500);
            retry = retry - 1;
            this.retry_cnt = this.retry_cnt+1
            console.log(`retry ${retry}`)
            if (retry<1) {
                break
            }
        }
        console.log(`ADP1055-readByte: ${this.to0xString(this.slave_addr, 2)}, ${this.to0xString(reg_addr, pad_length)}, ${this.to0xString(readData.data[0], 2)}, ${readData.data[0]}`)
        return {message:"ok", result:readData.data[0]}

    }
    async writeByte(reg_addr, data) {
        const data_length = 1;
        let retry = 10;
        let pad_length;
        if (reg_addr>511) {
            pad_length = 4;
        } else {
            pad_length = 2;
        }
        console.log(this.slave_addr, reg_addr, this.to0xString(reg_addr, pad_length), data, `0x${data.toString(16)}`);
        const result = await this.i2c_host_adapter.i2cWrite(this.slave_addr, reg_addr, [data])

        // let readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length)
        // while (readData.data[0] == 255){
        //     await this.sleep(500);
        //     readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length)
        //     await this.sleep(500);
        //     retry = retry - 1;
        //     this.retry_cnt = this.retry_cnt+1
        //     console.log(`retry ${retry}`)
        //     if (retry<1) {
        //         break
        //     }
        // }
        console.log(`ADP1055-writeByte: ${this.to0xString(this.slave_addr, 2)}, ${this.to0xString(reg_addr, pad_length)}, ${this.to0xString(data, 2)}, ${data}`)
        return {message:"ok", result:data}

    }

    async readWord(reg_addr) {
        const data_length = 2;
        let retry = 10;
        let pad_length;
        if (reg_addr>511) {
            pad_length = 4;
        } else {
            pad_length = 2;
        }
        let readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length)
        let wordData = this.wordToNumber(readData.data)

        while (wordData == 65535){
            await this.sleep(500);
            readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length);
            wordData = this.wordToNumber(readData.data);
            await this.sleep(500);
            retry = retry - 1;
            this.retry_cnt = this.retry_cnt+1
            console.log(`retry ${retry}`)
            if (retry<1) {
                break
            }
        }

        console.log(`ADP1055-readWord: ${this.to0xString(this.slave_addr, 2)}, ${this.to0xString(reg_addr, pad_length)}, ${this.to0xString(wordData, 4)}, ${wordData}`)
        return {message:"ok", result:wordData}
    }

    async writeWord(reg_addr, data) {
        const data_length = 2;
        let retry = 10;
        let pad_length;
        if (reg_addr>511) {
            pad_length = 4;
        } else {
            pad_length = 2;
        }

        let wordData = this.numberToWord(data)
        const result = await this.i2c_host_adapter.i2cWrite(this.slave_addr, reg_addr, wordData)

        console.log(`ADP1055-writeWord: ${this.to0xString(this.slave_addr, 2)}, ${this.to0xString(reg_addr, pad_length)}, ${this.to0xString(data, 4)}, ${wordData}`)
        return {message:"ok", result:wordData}
    }

    async checkRegistersDefault() {
        let result = [];
        let success;
        let message;
        this.retry_cnt = 0;
        message = "ok";
        success = true;
        for (let reg_name in this.regs) {
            let registerData;
            if (this.regs[reg_name].setting.default_value.trim() != "N/A") {
                await this.sleep(1);
                 registerData = await this.readRegister(parseInt(this.regs[reg_name].reg_info.addr, 16))

                await this.sleep(1);
                console.log(`${reg_name}: ${this.regs[reg_name].reg_info.addr}, ${this.regs[reg_name].setting.default_value.trim()}, ${this.to0xString(registerData.result, this.regs[reg_name].reg_info.size) }`);

                if (parseInt(this.regs[reg_name].setting.default_value.trim(), 16) != registerData.result) {
                    message = false;
                    result.push( {reg_name: {addr: this.regs[reg_name].reg_info.addr, default_value: this.regs[reg_name].setting.default_value.trim(), read_value: this.to0xString(registerData.result, this.regs[reg_name].reg_info.size)}})
                }
            }
        }

        for (let reg_name in this.regs_mfr) {
            let registerData;
            if (this.regs_mfr[reg_name].setting.default_value.trim() != "N/A") {
                await this.sleep(1);
                registerData = await this.readRegister(parseInt(this.regs_mfr[reg_name].reg_info.addr, 16))
                await this.sleep(1);
                console.log(`${reg_name}: ${this.regs_mfr[reg_name].reg_info.addr}, ${this.regs_mfr[reg_name].setting.default_value.trim()}, ${this.to0xString(registerData.result, this.regs_mfr[reg_name].reg_info.size) }`);

                if (parseInt(this.regs_mfr[reg_name].setting.default_value.trim(), 16) != registerData.result) {
                    message = false;
                    result.push( {reg_name: {addr: this.regs_mfr[reg_name].reg_info.addr, default_value: this.regs_mfr[reg_name].setting.default_value.trim(), read_value: this.to0xString(registerData.result, this.regs_mfr[reg_name].reg_info.size)}})
                }
            }
        }
        console.log(`this.retry_cnt ${this.retry_cnt}`)

        return {success:success, message:message, result: result}
    }

    loadJSONtoUserRegisters(adp1055_regs_all) {

        this.regs_user_all = adp1055_regs_all;
        console.log(this.regs_user_all)
        this.regs_user_standard_pmbus = adp1055_regs_all.regs_standard_pmbus;
        this.regs_user_mfr_pmbus = adp1055_regs_all.regs_mfr_pmbus;

    }

    async writeJSONRegstoRegisters() {
        let result = [];
        let success;
        let message;
        this.retry_cnt = 0;
        message = "ok";
        success = true;
        const regs = this.regs_user_standard_pmbus;
        // let regs = this.regs_user_mfr_pmbus;
        console.log(regs)
        for (let reg_name in regs) {
            let registerDataBefore;
            let registerDataWrite;
            let registerDataAfter;

            if (regs[reg_name].setting.default_value.trim() != "N/A") {
                // await this.sleep(1);
                // registerDataBefore = await this.readRegister(parseInt(regs[reg_name].reg_info.addr, 16));
                const reg_addr = parseInt(regs[reg_name].reg_info.addr, 16);
                await this.sleep(1);
                registerDataBefore = await this.readRegister(reg_addr);
                console.log(`registerDataBefore`)
                console.log(registerDataBefore)
                await this.sleep(1);
                registerDataWrite = parseInt(regs[reg_name].setting.user_value, 16);
                await this.writeRegister(reg_addr, registerDataWrite)
                console.log('registerDataWrite')
                console.log(registerDataWrite)
                await this.sleep(1)

                registerDataAfter = await this.readRegister(reg_addr);
                console.log('registerDataAfter')
                console.log(registerDataAfter)
                await this.sleep(1)
                if (registerDataWrite != registerDataAfter.result) {
                    message = false;
                    result.push( {reg_info: {name: reg_name, addr: regs[reg_name].reg_info.addr, default_value: regs[reg_name].setting.default_value.trim(), read_value: this.to0xString(registerDataAfter.result, regs[reg_name].reg_info.size*2), write_value: registerDataWrite}})
                }
            }
        }
        console.log(`this.retry_cnt ${this.retry_cnt}`)
        console.log(result)
        return {success:success, message:message, result: result}
    }

    async loadJSONtoRegisters() {
        let result = [];
        let success;
        let message;
        message = "ok";
        success = true;
        for (let reg_name in this.regs) {

            let registerData;
            if (this.regs[reg_name].setting.default_value.trim() != "N/A") {
                registerData = await this.readRegister(parseInt(this.regs[reg_name].reg_info.addr, 16))
                console.log(`${reg_name}: ${this.regs[reg_name].reg_info.addr}, ${this.regs[reg_name].setting.default_value.trim()}, ${this.to0xString(registerData.result, this.regs[reg_name].reg_info.size) }`);

                if (parseInt(this.regs[reg_name].setting.default_value.trim(), 16) != registerData.result) {
                    message = false;
                    result.push( {reg_name: {addr: this.regs[reg_name].reg_info.addr, default_value: this.regs[reg_name].setting.default_value.trim(), read_value: this.to0xString(registerData.result, this.regs[reg_name].reg_info.size*2)}})
                }
            }
        }
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    to0xString(numInput, padding) {
        const result = `0x${numInput.toString(16).toUpperCase().padStart(padding, 0)}`
        return result
    }
    wordToNumber(data) {
        const readDataLow = data[0];
        const readDataHigh = data[1];
        console.log(readDataHigh, readDataLow)
        const wordData = parseInt(readDataHigh.toString(16).padStart(2, "0") + readDataLow.toString(16).padStart(2, "0"), 16);
        console.log(readDataHigh, readDataLow, wordData)
        return wordData
    }

    numberToWord(data) {
        const writeData = data;
        const writeDataHigh = (data >> 8) & 0xff;
        const writeDataLow = data & 0xff
        const wordData = [writeDataLow, writeDataHigh]
        console.log(writeDataHigh, writeDataLow, writeData)
        return wordData
    }
}
