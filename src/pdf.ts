const pdffiller = require('pdffiller');
import path from "path";
import { getUserInfo } from "./ad";
import { Item } from "./interface";
import fs from "fs";
import os from "os";
import { exec, execSync } from "child_process";
import { openStdin } from "process";

export const FillPDF  = (data: Item): Promise<string> => {
    return new Promise((resolve, reject) => {
        if(data.kind != "PC") return reject("Wrong kind");
    if(!data.besitzer) return reject("No Besitzer");
    getUserInfo(data.besitzer, (user: {department: string, name: string, departmentNumber: string}, err: any) => 
    {
        
        const source = path.join(__dirname, "..", "pdf", "temp.pdf");
        const output = path.join(__dirname,"..", "pdf", data.it_nr, "output.pdf");
        if(!fs.existsSync(path.dirname(output))) fs.mkdirSync(path.dirname(output));


        const values = [
            user.name,
            user.departmentNumber,
            user.department,
            data.type,
            data.seriennummer,
            new Date().toLocaleDateString("de-DE"),
            source,
            output
        ];

        values.forEach((value, i) => {
            values[i] = `"${value}"`;
        })

        try
        {
            const command = `python3 ${path.join(__dirname, "..", "fill.py")} ${values.join(" ")}`;
            const commandWin = `python ${path.join(__dirname, "..", "fill.py")} ${values.join(" ")}`;
            let y;
            console.log(os.platform())
            if(os.platform() == "win32") y = exec(commandWin)
            else y = exec(command);
            console.log(os.platform() == "win32" ? commandWin : command);
            y.on("error", (err) => {
                reject(err.message);
            });
            y.on("message", console.log)
            y.on("exit", (code) => {
                console.log(code);
                if(code == 0) resolve(output);
                else reject(`Error code ${code}`);
                resolve(output);
            });
        }
        catch(e)
        {
            console.error(e);
            reject(e);
        }
    });
    });
    
}


export const DeletePDF = (data: Item): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const source = path.join(__dirname, "..", "pdf", data.it_nr, "output.pdf");
        if(!fs.existsSync(source)) return resolve(false);
        fs.unlink(source, (err) => {
            if(err) return reject(err);
            resolve(true);
        });
    });
};