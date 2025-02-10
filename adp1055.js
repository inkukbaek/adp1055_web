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
        this.slave_addr_hex = `0x${this.slave_addr.toString(16).padStart(2, '0')}`
        this.reg_info_all = reg_map;
        this.regs = reg_map.regs_standard_pmbus;
        this.regs_mfr = reg_map.regs_mfr_pmbus;
        this.retry_cnt = 0;
        this.regs_user_all = {};
        this.regs_standard_pmbus = {};
        this.regs_mfr_pmbus = {};
        this.json_regs_user_all = {};
        this.json_regs_standard_pmbus = {};
        this.json_regs_mfr_pmbus = {};
        this.debug = 0;
        this.retry_result = [];
    }

    async send_command(command) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        const reg_addr = this.regs[command].reg_info.addr;
        const reg_addr_int = parseInt(reg_addr, 16);
        await this.i2c_host_adapter.i2cWrite(this.slave_addr, reg_addr, []);
        if (this.debug) {
            console.log(`${methodName} - command: ${command},command HEX: ${reg_addr}, commmand INT: ${reg_addr_int}`);
        };
        return {message: "ok", command: command, addr: reg_addr_int, addr_hex: reg_addr};
    }
    async setSlaveAddress(slave_addr) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===2) {
            console.log(methodName);
        };
        if (this.slave_addr !== slave_addr) {
            this.slave_addr = slave_addr;
            this.slave_addr_hex = `0x${this.slave_addr.toString(16).padStart(2, '0')}`;
            console.log(`Slave Address updated: ${slave_addr_hex}}`);
        }
    }

    async getRegisterInfo(reg_addr) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===2) {
            console.log(methodName, reg_addr);
        }
        try {
            // regInfo
            //      - [0]: register name, string
            //      - [1]: register address, hex string
            //      - [2]: register size(byte length), int
            // regType
            //      - true: STANDARD
            //      - false: MFR
            //      - undefined: not found
            let regInfo;
            let regType;
            let regTypeString;
            regInfo = Object.entries(this.regs).find(([reg_name, data]) => parseInt(data.reg_info.addr, 16) == reg_addr);
            regType = true;
            regTypeString = 'STANDARD PMBUS'

            if (regInfo === undefined) {
                regInfo = Object.entries(this.regs_mfr).find(([reg_name, data]) => parseInt(data.reg_info.addr, 16) == reg_addr);
                regType = false;
                regTypeString = 'MFR PMBUS'
            };
            if (regInfo === undefined) {
                regType = undefined;
                regTypeString = 'Register Not Found';
            };
            const return_value = Object.assign({}, {message: "ok", reg_type: regType, reg_type_string: regTypeString, name: regInfo[0], addr: regInfo[1].reg_info.addr, length: regInfo[1].reg_info.size});
            if (this.debug===2) {
                console.log(methodName, `return_value:`, return_value);
            };
            return return_value;

        } catch(error) {
            console.error(`Error(${methodName}):`, error);
            reject(error);
        }
    }

    async readRegister(reg_addr) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===2) {
            console.log(methodName);
        }
        try {
            const regInfo = await this.getRegisterInfo(reg_addr);
            const result = (await this.readRegisterData(reg_addr, regInfo.length)).result;
            const result_hex = this.to0xString(result, regInfo.length);
            const return_value = Object.assign({}, {message:"ok", result:result, result_hex:result_hex}, regInfo);
            if (this.debug===1) {
                console.log(methodName, `return_value:`, return_value);
            }
            return return_value;

        } catch (error) {
            console.error(`Error(${methodName}):`, error);
            reject(error);
        }
    }

    async writeRegister(reg_addr, data) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===2) {
            console.log(methodName);
        }
        try {
            const regInfo = await this.getRegisterInfo(reg_addr);
            const result = await this.writeRegisterData(reg_addr, data, regInfo.length);
            const result_hex = this.to0xString(result, regInfo.length);
            const return_value = Object.assign({}, {message:"ok", result:result, result_hex:result_hex}, regInfo);
            if (this.debug===1) {
                console.log(methodName, `return_value:`, return_value);
            }

            return return_value;

        } catch (error) {
            console.error(`Error(${methodName}):`, error);
            reject(error);
        }
    }

    async readRegisterData(reg_addr, size) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===1) {
            console.log(methodName);
        }
        try {
            let result;
            if (size > 1) {
                result = await this.readWord(reg_addr);
            } else {
                result = await this.readByte(reg_addr);
            };
            if (this.debug===2) {
                console.log(methodName, `result:`, result.result)
            };
            return {message:"ok", result:result.result}

        } catch (error) {
            console.error(`Error(${methodName}):`, error);
            reject(error);
        }
    }

    async writeRegisterData(reg_addr, data, size) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===2) {
            console.log(methodName);
        }
        try {
            let result;
            if (size > 1) {
                result = await this.writeWord(reg_addr, data);
            } else {
                result = await this.writeByte(reg_addr, data);
            }
            if (this.debug===2) {
                console.log(methodName, `result:`, result.result);
            };
            return {message:"ok", result:result.result};

        } catch (error) {
            console.error(`Error(${methodName}):`, error);
            reject(error);
        }

    }

    async readByte(reg_addr) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===1) {
            console.log(methodName);
        }

        try {
            let reg_addr_hex;
            if (reg_addr>255) {
                reg_addr_hex = this.to0xString(reg_addr, 4);
            } else {
                reg_addr_hex = this.to0xString(reg_addr, 2);
            };
            if (this.debug===1) {
                console.log(methodName, 'Slave ADDR:', this.slave_addr_hex, 'Reg ADDR HEX:', reg_addr_hex, 'Reg ADDR INT:', reg_addr);
            };
            const data_length = 1;
            let retry = 10;
            let pad_length;
            if (reg_addr>511) {
                pad_length = 4;
            } else {
                pad_length = 2;
            };
            let readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length);
            while (readData.data[0] === undefined) {
                console.warn(methodName, "Data not received, try again")
                await this.sleep(100)
                readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length);
                retry = retry - 1;
                if (retry<1) {
                    break;
                }
            }
            while (readData.data[0] == 255){
                console.warn(methodName, "Data received: 0xFF, try again")
                await this.sleep(100)
                this.retry_result.push({RegADDRHEX:reg_addr_hex, readData:readData});
                readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length)
                retry = retry - 1;
                this.retry_cnt = this.retry_cnt+1
                this.retry_result.push({RegADDRHEX:reg_addr_hex, readData:readData});
                if (retry<1) {
                    break;
                }
            }
            const result = readData.data[0];
            const result_hex = this.to0xString(result, 2);
            if (this.debug===1) {
                console.log(methodName, 'Slave ADDR:', this.slave_addr_hex, 'Reg ADDR HEX:', reg_addr_hex, 'Reg ADDR INT:', reg_addr, 'result_hex', result_hex, 'result', result);
            };
            return {message:"ok", result:result};

        } catch (error) {
            console.error(`Error(${methodName}):`, error);
            reject(error);
        }



    }
    async writeByte(reg_addr, data) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===2) {
            console.log(methodName);
        }
        try {
            let reg_addr_hex;
            if (reg_addr>255) {
                reg_addr_hex = this.to0xString(reg_addr, 4);
            } else {
                reg_addr_hex = this.to0xString(reg_addr, 2);
            };
            const data_length = 1;
            let retry = 10;
            let pad_length;
            if (reg_addr>511) {
                pad_length = 4;
            } else {
                pad_length = 2;
            }
            const result = await this.i2c_host_adapter.i2cWrite(this.slave_addr, reg_addr, [data]);
            if (this.debug) {
                console.log(methodName, 'Slave ADDR:', this.slave_addr_hex, 'Reg ADDR HEX:', reg_addr_hex, 'Reg ADDR INT:', reg_addr, 'result_hex', result_hex, 'result', result, 'data', data);
            }
            return {message:"ok", result:data};
        } catch (error) {
            console.error(`Error(${methodName}):`, error);
            reject(error);
        }
    }

    async readWord(reg_addr) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===1) {
            console.log(methodName);
        }

        try {
            let reg_addr_hex;
            if (reg_addr>255) {
                reg_addr_hex = this.to0xString(reg_addr, 4);
            } else {
                reg_addr_hex = this.to0xString(reg_addr, 2);
            }
            if (this.debug) {
                console.log(methodName, 'Slave ADDR:', this.slave_addr_hex, 'Reg ADDR HEX:', reg_addr_hex, 'Reg ADDR INT:', reg_addr);
            };
            const data_length = 2;
            let retry = 10;
            let pad_length;
            if (reg_addr>511) {
                pad_length = 4;
            } else {
                pad_length = 2;
            }
            let readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length);
            if (this.debug) {
                console.log(methodName, 'Slave ADDR:', this.slave_addr_hex, 'Reg ADDR HEX:', reg_addr_hex, 'Reg ADDR INT:', reg_addr, "readData", readData);
            };
            while (readData.data[0] === undefined || readData.data[1] === undefined) {
                await this.sleep(100)
                console.warn(methodName, "Data not received, try again")
                readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length);
                retry = retry - 1;
                if (retry<1) {
                    break;
                }
            }
            let wordData = this.wordToNumber(readData.data);
            while (wordData == 65535){
                await this.sleep(100)
                this.retry_result.push({RegADDRHEX:reg_addr_hex, wordData:wordData})
                readData = await this.i2c_host_adapter.i2cRead(this.slave_addr, reg_addr, data_length);
                wordData = this.wordToNumber(readData.data);
                retry = retry - 1;
                this.retry_cnt = this.retry_cnt+1
                this.retry_result.push({RegADDRHEX:reg_addr_hex, wordData:wordData})
                console.warn(methodName, "Data received: 0xFFFF, try again")
                if (retry<1) {
                    break;
                }
            }
            const wordDataHex = this.to0xString(wordData, 4);
            if (this.debug) {
                console.log(methodName, 'Slave ADDR:', this.slave_addr_hex, 'Reg ADDR HEX:', reg_addr_hex, 'Reg ADDR INT:', reg_addr, 'result_hex', wordDataHex, 'result', wordData);
            }
            return {message:"ok", result:wordData};
        } catch (error) {
            console.error(methodName, error);
        }

    }

    async writeWord(reg_addr, data) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        let reg_addr_hex;
        if (reg_addr>255) {
            reg_addr_hex = this.to0xString(reg_addr, 4)
        } else {
            reg_addr_hex = this.to0xString(reg_addr, 2)
        }
        if (this.debug) {
            console.log(methodName);
        };
        const data_length = 2;
        let retry = 10;
        let pad_length;
        if (reg_addr>511) {
            pad_length = 4;
        } else {
            pad_length = 2;
        };
        let wordData = this.numberToWord(data);
        const result = await this.i2c_host_adapter.i2cWrite(this.slave_addr, reg_addr, wordData);
        const resultHex = this.to0xString(result, 4);
        if (this.debug) {
            console.log(methodName, 'Slave ADDR:', this.slave_addr_hex, 'Reg ADDR HEX:', reg_addr_hex, 'Reg ADDR INT:', reg_addr, 'resultHex', resultHex, 'result INT', result);
        };
        return {message:"ok", result:wordData};
    }

    async checkRegistersDefault() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug===2) {
            console.log(methodName);
        };
        let comparisonData = [];

        try {
            for (let reg_name in this.regs) {
                await this.sleep(10)
                let registerData;
                if (this.regs[reg_name].setting.default_value.trim() != "N/A") {
                    if (this.debug===1) {
                        console.log(methodName, reg_name);
                    };
                    const defaultValueHex = this.regs[reg_name].setting.default_value.trim()
                    const defaultValue = parseInt(defaultValueHex)
                    registerData = await this.readRegister(parseInt(this.regs[reg_name].reg_info.addr, 16));
                    // console.log(methodName, registerData)
                    if (registerData.result != defaultValue) {
                        registerData.default = defaultValueHex;
                        comparisonData.push(registerData);
                    }
                }
            }
            for (let reg_name in this.regs_mfr) {
                await this.sleep(10)
                let registerData;
                if (this.regs_mfr[reg_name].setting.default_value.trim() != "N/A") {
                    if (this.debug===1) {
                        console.log(methodName, reg_name);
                    };
                    const defaultValueHex = this.regs_mfr[reg_name].setting.default_value.trim()
                    const defaultValue = parseInt(defaultValueHex)
                    registerData = await this.readRegister(parseInt(this.regs_mfr[reg_name].reg_info.addr, 16));
                    // console.log(methodName, registerData)
                    if (registerData.result != defaultValue) {
                        registerData.default = defaultValueHex;
                        comparisonData.push(registerData);
                    }
                }
            }
            console.log(this.retry_cnt)
            console.log(this.retry_result)
            if (comparisonData.length>0) {
                console.warn("Not matched with default - ", comparisonData);
            } else {
                console.warn("All Default Register Value");
            }
            console.log('finish')
            return comparisonData;

        } catch (error) {
            console.log(error)
        }
    }

    loadJSONtoUserRegisters(adp1055_regs_all) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug) {
            console.log(methodName);
        };

        this.json_regs_user_all = adp1055_regs_all;
        console.log(this.json_regs_user_all)
        this.json_regs_user_standard_pmbus = adp1055_regs_all.regs_standard_pmbus;
        this.json_regs_user_mfr_pmbus = adp1055_regs_all.regs_mfr_pmbus;
    }

    async writeJSONRegstoRegisters() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug) {
            console.log(methodName);
        };
        let result = [];
        let success;
        let message;
        this.retry_cnt = 0;
        message = "ok";
        success = true;
        const regs = this.json_regs_user_standard_pmbus;
        const regs_mfr = this.json_regs_user_mfr_pmbus;
        // let regs = this.regs_user_mfr_pmbus;
        console.log(regs)
        for (let reg_name in regs) {
            if (regs[reg_name].setting.default_value.trim() != "N/A") {
                // await this.sleep(1);
                // registerDataBefore = await this.readRegister(parseInt(regs[reg_name].reg_info.addr, 16));
                const reg_addr = parseInt(regs[reg_name].reg_info.addr, 16);
                // registerDataBefore = await this.readRegister(reg_addr);
                // console.log(`registerDataBefore`)
                // console.log(registerDataBefore)
                const registerDataWrite = parseInt(regs[reg_name].setting.user_value, 16);
                await this.writeRegister(reg_addr, registerDataWrite)
                await this.sleep(50);
                console.log('registerDataWrite', registerDataWrite)
                const registerDataAfter = await this.readRegister(reg_addr);
                console.log('registerDataAfter', registerDataAfter)
                if (registerDataWrite != registerDataAfter.result) {
                    message = false;
                    result.push( {reg_info: {name: reg_name, addr: regs[reg_name].reg_info.addr, default_value: regs[reg_name].setting.default_value.trim(), read_value: this.to0xString(registerDataAfter.result, regs[reg_name].reg_info.size*2), write_value: registerDataWrite}})
                }
            }
        }
        console.log(result)
        return {success:success, message:message, result: result}
    }

    async loadJSONtoRegisters() {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        if (this.debug) {
            console.log(methodName);
        };
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
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        const result = `0x${numInput.toString(16).toUpperCase().padStart(padding, 0)}`
        if (this.debug===2) {
            console.log(methodName, 'numInput:', numInput, 'padding:', padding, 'result:', result);
        };
        return result;
    }
    wordToNumber(data) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        const readDataLow = data[0];
        const readDataHigh = data[1];
        const wordNum = parseInt(readDataHigh.toString(16).padStart(2, "0") + readDataLow.toString(16).padStart(2, "0"), 16);
        const wordNumString = this.to0xString(wordNum, 4);
        if (this.debug===2) {
            console.log(methodName, 'data', data, 'wordNum:', wordNum, 'wordNumString:', wordNumString);
        };
        return wordNum;
    }

    numberToWord(data) {
        const stack = new Error().stack.split("\n")[1]; // find method from stack
        const methodName = stack.match(/at (\S+)/)[1];  // extract method name
        const writeData = data;
        const writeDataHigh = (data >> 8) & 0xff;
        const writeDataLow = data & 0xff
        const wordData = [writeDataLow, writeDataHigh]
        const writeDataHex = this.to0xString(writeData, 4);
        const writeDataHighHex = writeDataHigh.toString(16);
        const writeDataLowHex = writeDataLow.toString(16);
        const writeDataHexArr = [writeDataLowHex, writeDataHighHex]
        if (this.debug===2) {
            console.log(methodName, 'writeData', writeData, 'writeDataHex:', writeDataHex, 'writeDataHexArr:', writeDataHexArr, 'writeDataHighHex:', writeDataHighHex, 'writeDataLowHex:', writeDataLowHex);
        };
        return wordData;
    }

    async setDebug(debug) {
        this.debug = debug;
    }
}
