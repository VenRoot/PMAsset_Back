const pdffiller = require('pdffiller');
import path from "path";
import { getUserInfo } from "./ad";
import { Item } from "./interface";
import fs from "fs";
import { exec, execSync } from "child_process";

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
            console.log(command);
            let y = exec(command);
            y.on("exit", (code) => {
                if(code != 0) reject("Error");
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
        if(!fs.existsSync(source)) return reject("No file");
        fs.unlink(source, (err) => {
            if(err) return reject(err);
            resolve(true);
        });
    });
};